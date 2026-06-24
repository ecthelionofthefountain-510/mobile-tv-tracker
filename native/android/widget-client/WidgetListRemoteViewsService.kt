package com.mobiletvtracker.widgetclient

import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONArray

/**
 * Backs the scrollable ListView in the upcoming widget. Reads the rows that
 * [WidgetSyncWorker] persisted as JSON and renders one [R.layout.widget_upcoming_row]
 * per item, so the widget is no longer capped at three fixed rows.
 */
class WidgetListRemoteViewsService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return WidgetListFactory(applicationContext)
    }
}

private data class WidgetRow(
    val title: String,
    val meta: String,
    val day: String,
    val posterPath: String,
    val link: String,
)

private class WidgetListFactory(
    private val context: Context,
) : RemoteViewsService.RemoteViewsFactory {

    private var rows: List<WidgetRow> = emptyList()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        rows = loadRows()
    }

    override fun onDestroy() {
        rows = emptyList()
    }

    override fun getCount(): Int = rows.size

    override fun getViewAt(position: Int): RemoteViews {
        val row = rows.getOrNull(position)
            ?: return RemoteViews(context.packageName, R.layout.widget_upcoming_row)

        val views = RemoteViews(context.packageName, R.layout.widget_upcoming_row)
        views.setTextViewText(R.id.tvRowTitle, row.title)

        views.setTextViewText(R.id.tvRowMeta, row.meta)
        views.setViewVisibility(
            R.id.tvRowMeta,
            if (row.meta.isBlank()) View.GONE else View.VISIBLE,
        )

        views.setTextViewText(R.id.tvRowDay, row.day)
        views.setViewVisibility(
            R.id.tvRowDay,
            if (row.day.isBlank()) View.GONE else View.VISIBLE,
        )

        val bmp = if (row.posterPath.isBlank()) null else BitmapFactory.decodeFile(row.posterPath)
        if (bmp != null) {
            views.setImageViewBitmap(R.id.ivRowPoster, bmp)
        } else {
            views.setImageViewResource(R.id.ivRowPoster, R.drawable.widget_poster_placeholder)
        }

        // Fill-in intent: tapping a row opens the app (deep link when available).
        val fillIn = Intent()
        if (row.link.isNotBlank()) {
            fillIn.data = Uri.parse(row.link)
        }
        views.setOnClickFillInIntent(R.id.rowRoot, fillIn)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = true

    private fun loadRows(): List<WidgetRow> {
        val prefs = context.getSharedPreferences(
            WidgetSyncWorker.SNAPSHOT_PREFS,
            Context.MODE_PRIVATE,
        )
        val raw = prefs.getString(WidgetSyncWorker.KEY_ITEMS_JSON, null) ?: return emptyList()

        return runCatching {
            val array = JSONArray(raw)
            (0 until array.length()).mapNotNull { i ->
                val obj = array.optJSONObject(i) ?: return@mapNotNull null
                WidgetRow(
                    title = obj.optString("title"),
                    meta = obj.optString("meta"),
                    day = obj.optString("day"),
                    posterPath = obj.optString("poster"),
                    link = obj.optString("link"),
                )
            }
        }.getOrDefault(emptyList())
    }
}
