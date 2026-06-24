package com.mobiletvtracker.widgetclient

enum class WidgetState {
    OK,
    EMPTY,
    ERROR;

    companion object {
        fun fromRaw(value: String?): WidgetState {
            return when ((value ?: "").trim().lowercase()) {
                "ok" -> OK
                "empty" -> EMPTY
                "error" -> ERROR
                else -> ERROR
            }
        }
    }
}

data class WidgetMeta(
    val source: String = "",
    val stale: Boolean = false,
)

data class UpcomingWidgetItem(
    val id: String,
    val tmdbId: Long,
    val mediaType: String,
    val title: String,
    val season: Int?,
    val episode: Int?,
    val airDate: String?,
    val daysUntil: Int?,
    val isToday: Boolean,
    val isTomorrow: Boolean,
    val network: String?,
    val posterUrl: String?,
    val deepLink: String?,
    val priority: Int,
)

data class UpcomingWidgetPayload(
    val version: String,
    val generatedAt: String,
    val ttlSeconds: Int,
    val widgetState: WidgetState,
    val items: List<UpcomingWidgetItem>,
    val meta: WidgetMeta,
)

data class WidgetFetchInput(
    val favoritesJson: String,
    val watchedJson: String,
    val limit: Int = 6,
)

data class WidgetFetchResult(
    val payload: UpcomingWidgetPayload?,
    val rawBody: String?,
    val eTag: String?,
    val notModified: Boolean,
    val httpCode: Int,
    val error: String?,
)
