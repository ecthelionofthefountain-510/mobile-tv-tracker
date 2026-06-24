package com.mobiletvtracker.widgetclient

import org.json.JSONArray
import org.json.JSONObject

object WidgetPayloadParser {

    fun parse(json: String): UpcomingWidgetPayload? {
        return try {
            val root = JSONObject(json)
            val itemsArray = root.optJSONArray("items") ?: JSONArray()
            val items = ArrayList<UpcomingWidgetItem>(itemsArray.length())

            for (i in 0 until itemsArray.length()) {
                val itemObj = itemsArray.optJSONObject(i) ?: continue
                val id = itemObj.optString("id", "")
                if (id.isBlank()) continue

                items.add(
                    UpcomingWidgetItem(
                        id = id,
                        tmdbId = itemObj.optLong("tmdbId", -1L),
                        mediaType = itemObj.optString("mediaType", "tv"),
                        title = itemObj.optString("title", ""),
                        season = itemObj.optNullableInt("season"),
                        episode = itemObj.optNullableInt("episode"),
                        airDate = itemObj.optNullableString("airDate"),
                        daysUntil = itemObj.optNullableInt("daysUntil"),
                        isToday = itemObj.optBoolean("isToday", false),
                        isTomorrow = itemObj.optBoolean("isTomorrow", false),
                        network = itemObj.optNullableString("network"),
                        posterUrl = itemObj.optNullableString("posterUrl"),
                        deepLink = itemObj.optNullableString("deepLink"),
                        priority = itemObj.optInt("priority", 0),
                    ),
                )
            }

            val metaObj = root.optJSONObject("meta") ?: JSONObject()
            UpcomingWidgetPayload(
                version = root.optString("version", "1"),
                generatedAt = root.optString("generatedAt", ""),
                ttlSeconds = root.optInt("ttlSeconds", 1800),
                widgetState = WidgetState.fromRaw(root.optString("widgetState", "error")),
                items = items,
                meta = WidgetMeta(
                    source = metaObj.optString("source", ""),
                    stale = metaObj.optBoolean("stale", false),
                ),
            )
        } catch (_: Throwable) {
            null
        }
    }

    private fun JSONObject.optNullableString(key: String): String? {
        if (!has(key) || isNull(key)) return null
        val value = optString(key, "")
        return value.ifBlank { null }
    }

    private fun JSONObject.optNullableInt(key: String): Int? {
        if (!has(key) || isNull(key)) return null
        return optInt(key)
    }
}
