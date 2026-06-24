package com.mobiletvtracker.widgetclient

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.widgetDataStore by preferencesDataStore(name = "widget_upcoming_store")

class WidgetDataStore(private val context: Context) {

    suspend fun readCache(): CachedWidgetPayload? {
        val prefs = context.widgetDataStore.data.first()
        val payloadJson = prefs[KEY_PAYLOAD_JSON] ?: return null
        val fetchedAt = prefs[KEY_FETCHED_AT_MS] ?: return null
        val ttlSeconds = prefs[KEY_TTL_SECONDS]?.toInt() ?: 0
        val eTag = prefs[KEY_ETAG]

        return CachedWidgetPayload(
            payloadJson = payloadJson,
            eTag = eTag,
            fetchedAtEpochMs = fetchedAt,
            ttlSeconds = ttlSeconds,
        )
    }

    suspend fun writeCache(rawPayloadJson: String, eTag: String?, ttlSeconds: Int) {
        val now = System.currentTimeMillis()
        context.widgetDataStore.edit { prefs ->
            prefs[KEY_PAYLOAD_JSON] = rawPayloadJson
            prefs[KEY_FETCHED_AT_MS] = now
            prefs[KEY_TTL_SECONDS] = ttlSeconds.toLong()
            if (eTag.isNullOrBlank()) {
                prefs.remove(KEY_ETAG)
            } else {
                prefs[KEY_ETAG] = eTag
            }
        }
    }

    suspend fun clearCache() {
        context.widgetDataStore.edit { prefs ->
            prefs.remove(KEY_PAYLOAD_JSON)
            prefs.remove(KEY_ETAG)
            prefs.remove(KEY_FETCHED_AT_MS)
            prefs.remove(KEY_TTL_SECONDS)
        }
    }

    companion object {
        private val KEY_PAYLOAD_JSON = stringPreferencesKey("payload_json")
        private val KEY_ETAG = stringPreferencesKey("etag")
        private val KEY_FETCHED_AT_MS = longPreferencesKey("fetched_at_ms")
        private val KEY_TTL_SECONDS = longPreferencesKey("ttl_seconds")
    }
}
