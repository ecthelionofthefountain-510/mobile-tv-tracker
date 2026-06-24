package com.mobiletvtracker.widgetclient

data class CachedWidgetPayload(
    val payloadJson: String,
    val eTag: String?,
    val fetchedAtEpochMs: Long,
    val ttlSeconds: Int,
)

object WidgetCachePolicy {

    private const val DEFAULT_MAX_STALE_MS: Long = 24L * 60L * 60L * 1000L

    fun isFresh(nowEpochMs: Long, cache: CachedWidgetPayload): Boolean {
        val ageMs = nowEpochMs - cache.fetchedAtEpochMs
        return ageMs >= 0L && ageMs <= cache.ttlSeconds * 1000L
    }

    fun canUseAsStale(
        nowEpochMs: Long,
        cache: CachedWidgetPayload,
        maxStaleMs: Long = DEFAULT_MAX_STALE_MS,
    ): Boolean {
        val ageMs = nowEpochMs - cache.fetchedAtEpochMs
        return ageMs >= 0L && ageMs <= maxStaleMs
    }
}
