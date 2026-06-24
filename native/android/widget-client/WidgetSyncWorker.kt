package com.mobiletvtracker.widgetclient

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

class WidgetSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    private fun canonicalTitle(raw: String): String {
        return raw
            .lowercase()
            .replace("å", "a")
            .replace("ä", "a")
            .replace("ö", "o")
            .replace(Regex("[^a-z0-9]"), "")
    }

    private fun titlesLikelySame(a: String, b: String): Boolean {
        val ca = canonicalTitle(a)
        val cb = canonicalTitle(b)
        if (ca.isBlank() || cb.isBlank()) return false
        if (ca == cb) return true
        // Handle cases like "The Lord of the Rings: The Rings of Power" vs "The Rings of Power".
        return (ca.length >= 8 && cb.length >= 8) && (ca.contains(cb) || cb.contains(ca))
    }

    private fun posterPathForSlot(slot: Int): File {
        return File(applicationContext.cacheDir, "widget_poster_$slot.jpg")
    }

    private fun cachePoster(posterUrl: String?, slot: Int): String {
        if (posterUrl.isNullOrBlank()) return ""
        return try {
            val connection = (URL(posterUrl).openConnection() as HttpURLConnection).apply {
                connectTimeout = 6000
                readTimeout = 8000
                requestMethod = "GET"
                doInput = true
            }
            connection.connect()

            if (connection.responseCode !in 200..299) {
                connection.disconnect()
                return ""
            }

            val bitmap = connection.inputStream.use { input ->
                BitmapFactory.decodeStream(input)
            }
            connection.disconnect()

            if (bitmap == null) return ""

            val outFile = posterPathForSlot(slot)
            FileOutputStream(outFile).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 82, out)
                out.flush()
            }

            outFile.absolutePath
        } catch (_: Throwable) {
            ""
        }
    }

    private fun normalizeApiBaseForLocalDev(apiBase: String): String {
        val trimmed = apiBase.trim()
        // Local dev server runs plain HTTP on 5174 by default.
        return if (trimmed.startsWith("https://") && trimmed.contains(":5174")) {
            "http://" + trimmed.removePrefix("https://")
        } else {
            trimmed
        }
    }

    // Tapping a widget row opens the web/PWA app on that show's detail.
    private fun webShowUrl(tmdbId: Long): String {
        return "$WEB_APP_BASE_URL#/shows?show=$tmdbId"
    }

    private fun persistRenderSnapshot(result: WidgetResolveResult) {
        val payload = result.payload
        val count = payload?.items?.size ?: 0
        val hasError = !result.error.isNullOrBlank()

        val line1 = when {
            hasError -> "Kunde inte ansluta"
            payload == null -> "Syncar data..."
            count == 0 -> "Inga kommande avsnitt"
            else -> "$count kommande"
        }

        val line2 = when {
            hasError -> {
                val errorText = result.error.orEmpty()
                if (errorText.contains("TLS", ignoreCase = true)) {
                    "Använd http:// för lokal server"
                } else {
                    "Kontrollera URL och server"
                }
            }
            count > 0 -> payload?.items?.firstOrNull()?.title.orEmpty()
            else -> ""
        }

        fun rowMeta(item: UpcomingWidgetItem): String {
            val parts = mutableListOf<String>()
            if (item.season != null && item.episode != null) {
                parts += "S${item.season}E${item.episode}"
            }
            if (!item.network.isNullOrBlank()) {
                parts += item.network
            }
            return parts.joinToString(" - ")
        }

        fun rowDay(item: UpcomingWidgetItem): String {
            return when {
                item.isToday -> "0D"
                item.isTomorrow -> "1D"
                item.daysUntil != null && item.daysUntil >= 0 -> "${item.daysUntil}D"
                else -> ""
            }
        }

        val items = payload?.items.orEmpty().take(MAX_ROWS)
        val rowsJson = JSONArray()
        items.forEachIndexed { index, item ->
            val posterPath = cachePoster(item.posterUrl, index + 1)
            rowsJson.put(
                JSONObject()
                    .put("title", item.title)
                    .put("meta", rowMeta(item))
                    .put("day", rowDay(item))
                    .put("poster", posterPath)
                    .put("link", webShowUrl(item.tmdbId)),
            )
        }

        applicationContext
            .getSharedPreferences(SNAPSHOT_PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_SNAPSHOT_LINE1, line1)
            .putString(KEY_SNAPSHOT_LINE2, line2)
            .putString(KEY_ITEMS_JSON, rowsJson.toString())
            .apply()
    }

    override suspend fun doWork(): Result {
        val apiBaseInput = inputData.getString(KEY_API_BASE_URL)
        if (apiBaseInput.isNullOrBlank()) {
            Log.e(TAG, "Missing api_base_url in work input data")
            UpcomingRemoteWidgetProvider.updateAll(applicationContext)
            return Result.success()
        }
        val apiBase = normalizeApiBaseForLocalDev(apiBaseInput)

        val favoritesJson = inputData.getString(KEY_FAVORITES_JSON) ?: "[]"
        val watchedJson = inputData.getString(KEY_WATCHED_JSON) ?: "[]"
        val limit = inputData.getInt(KEY_LIMIT, DEFAULT_LIMIT)
        val widgetServerToken = inputData.getString(KEY_WIDGET_SERVER_TOKEN)

        val repository = WidgetRepository(
            apiBaseUrl = apiBase,
            dataStore = WidgetDataStore(applicationContext),
            authTokenProvider = null,
            widgetTokenProvider = {
                widgetServerToken
            },
        )

        val result = repository.refreshUpcoming(
            favoritesJson = favoritesJson,
            watchedJson = watchedJson,
            limit = limit,
        )

        Log.d(
            TAG,
            "refresh result source=${result.source} error=${result.error ?: "none"} attempts=$runAttemptCount apiBase=$apiBase",
        )

        persistRenderSnapshot(result)

        // Always request a UI refresh so host sees latest cached/fallback state.
        UpcomingRemoteWidgetProvider.updateAll(applicationContext)

        return when (result.source) {
            WidgetDataSource.NETWORK,
            WidgetDataSource.NOT_MODIFIED_CACHE,
            WidgetDataSource.STALE_CACHE,
            -> Result.success()
            WidgetDataSource.EMPTY -> Result.success()
        }
    }

    companion object {
        private const val TAG = "WidgetSyncWorker"
        const val KEY_API_BASE_URL = "api_base_url"
        const val KEY_FAVORITES_JSON = "favorites_json"
        const val KEY_WATCHED_JSON = "watched_json"
        const val KEY_LIMIT = "limit"
        const val KEY_WIDGET_SERVER_TOKEN = "widget_server_token"
        const val SNAPSHOT_PREFS = "widget_render_snapshot"
        const val KEY_SNAPSHOT_LINE1 = "line1"
        const val KEY_SNAPSHOT_LINE2 = "line2"
        const val KEY_ITEMS_JSON = "items_json"

        // Max rows rendered in the scrollable list (also the poster cache budget).
        const val MAX_ROWS = 10
        private const val DEFAULT_LIMIT = 10

        // Public URL of the deployed React/PWA app (HashRouter). Used to deep-link
        // a tapped widget row into that show's detail.
        private const val WEB_APP_BASE_URL =
            "https://ecthelionofthefountain-510.github.io/mobile-tv-tracker/"
    }
}
