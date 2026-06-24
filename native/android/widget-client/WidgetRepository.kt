package com.mobiletvtracker.widgetclient

enum class WidgetDataSource {
    NETWORK,
    NOT_MODIFIED_CACHE,
    STALE_CACHE,
    EMPTY,
}

data class WidgetResolveResult(
    val payload: UpcomingWidgetPayload?,
    val source: WidgetDataSource,
    val error: String?,
)

class WidgetRepository(
    private val apiBaseUrl: String,
    private val dataStore: WidgetDataStore,
    private val authTokenProvider: (() -> String?)? = null,
    private val widgetTokenProvider: (() -> String?)? = null,
) {

    suspend fun refreshUpcoming(
        favoritesJson: String,
        watchedJson: String,
        limit: Int = 6,
    ): WidgetResolveResult {
        val cache = dataStore.readCache()
        val ifNoneMatch = cache?.eTag

        val fetchResult = WidgetApiClient.fetchUpcoming(
            apiBaseUrl = apiBaseUrl,
            input = WidgetFetchInput(
                favoritesJson = favoritesJson,
                watchedJson = watchedJson,
                limit = limit,
            ),
            authToken = authTokenProvider?.invoke(),
            widgetServerToken = widgetTokenProvider?.invoke(),
            ifNoneMatch = ifNoneMatch,
        )

        if (fetchResult.notModified && cache != null) {
            val parsed = WidgetPayloadParser.parse(cache.payloadJson)
            if (parsed == null) {
                return WidgetResolveResult(
                    payload = null,
                    source = WidgetDataSource.EMPTY,
                    error = "Cached payload parse failed",
                )
            }
            return WidgetResolveResult(
                payload = parsed,
                source = WidgetDataSource.NOT_MODIFIED_CACHE,
                error = null,
            )
        }

        if (fetchResult.payload != null && !fetchResult.rawBody.isNullOrBlank()) {
            dataStore.writeCache(
                rawPayloadJson = fetchResult.rawBody,
                eTag = fetchResult.eTag,
                ttlSeconds = fetchResult.payload.ttlSeconds,
            )
            return WidgetResolveResult(
                payload = fetchResult.payload,
                source = WidgetDataSource.NETWORK,
                error = null,
            )
        }

        if (cache != null && WidgetCachePolicy.canUseAsStale(System.currentTimeMillis(), cache)) {
            val parsed = WidgetPayloadParser.parse(cache.payloadJson)
            if (parsed == null) {
                return WidgetResolveResult(
                    payload = null,
                    source = WidgetDataSource.EMPTY,
                    error = fetchResult.error ?: "Cached payload parse failed",
                )
            }
            return WidgetResolveResult(
                payload = parsed,
                source = WidgetDataSource.STALE_CACHE,
                error = fetchResult.error,
            )
        }

        return WidgetResolveResult(
            payload = null,
            source = WidgetDataSource.EMPTY,
            error = fetchResult.error,
        )
    }
}
