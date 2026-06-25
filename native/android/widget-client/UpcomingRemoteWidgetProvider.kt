package com.mobiletvtracker.widgetclient

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class UpcomingRemoteWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // Re-render from cache first: this re-binds the list adapter and calls
        // notifyAppWidgetViewDataChanged, which self-heals the "stuck on Syncar
        // data…" state after the launcher/host process is recycled.
        appWidgetIds.forEach { appWidgetId ->
            updateSingleWidget(context, appWidgetManager, appWidgetId)
        }
        // Then kick a fresh sync so periodic system updates also refresh data.
        triggerRefresh(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            triggerRefresh(context)
        }
    }

    companion object {
        private const val ACTION_REFRESH = "com.mobiletvtracker.widgetclient.ACTION_REFRESH"

        // Mirrors MainActivity's widget config store (file-private there).
        private const val CONFIG_PREFS = "widget_config"
        private const val CFG_API_BASE_URL = "api_base_url"
        private const val CFG_WIDGET_SERVER_TOKEN = "widget_server_token"
        private const val CFG_FAVORITES_JSON = "favorites_json"
        private const val CFG_WATCHED_JSON = "watched_json"

        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, UpcomingRemoteWidgetProvider::class.java)
            val ids = manager.getAppWidgetIds(component)
            ids.forEach { appWidgetId ->
                updateSingleWidget(context, manager, appWidgetId)
            }
        }

        // Re-runs the sync worker using the saved widget config. The worker
        // refreshes the snapshot and calls updateAll() when it finishes.
        private fun triggerRefresh(context: Context) {
            val prefs = context.getSharedPreferences(CONFIG_PREFS, Context.MODE_PRIVATE)
            val apiBase = prefs.getString(CFG_API_BASE_URL, "")?.trim().orEmpty()
            if (apiBase.isBlank()) return

            WidgetRefreshScheduler.enqueueImmediate(
                context = context,
                apiBaseUrl = apiBase,
                favoritesJson = prefs.getString(CFG_FAVORITES_JSON, "[]") ?: "[]",
                watchedJson = prefs.getString(CFG_WATCHED_JSON, "[]") ?: "[]",
                widgetServerToken = prefs.getString(CFG_WIDGET_SERVER_TOKEN, null)?.ifBlank { null },
            )
        }

        private fun updateSingleWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val prefs = context.getSharedPreferences(WidgetSyncWorker.SNAPSHOT_PREFS, Context.MODE_PRIVATE)
            val summary = prefs.getString(WidgetSyncWorker.KEY_SNAPSHOT_LINE1, "Syncar data...") ?: "Syncar data..."

            val views = RemoteViews(context.packageName, R.layout.widget_upcoming)
            views.setTextViewText(R.id.tvSummary, summary)

            // Feed the scrollable list from WidgetListRemoteViewsService. The data
            // Uri makes the intent unique per widget id so adapters aren't shared.
            val serviceIntent = Intent(context, WidgetListRemoteViewsService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }
            views.setRemoteAdapter(R.id.widgetList, serviceIntent)
            views.setEmptyView(R.id.widgetList, R.id.tvSummary)

            // Click template: each row supplies its web URL as the fill-in data.
            // Android 14+ requires a mutable template to be explicit, so it points
            // at LinkTrampolineActivity, which forwards the URL to the browser.
            val templateIntent = Intent(context, LinkTrampolineActivity::class.java)
            val templatePending = PendingIntent.getActivity(
                context,
                appWidgetId,
                templateIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
            )
            views.setPendingIntentTemplate(R.id.widgetList, templatePending)

            // Refresh button: broadcast back to this provider to re-run the sync.
            val refreshIntent = Intent(context, UpcomingRemoteWidgetProvider::class.java).apply {
                action = ACTION_REFRESH
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            val refreshPending = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.btnRefresh, refreshPending)

            manager.updateAppWidget(appWidgetId, views)
            manager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widgetList)
        }
    }
}
