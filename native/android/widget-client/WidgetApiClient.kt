package com.mobiletvtracker.widgetclient

import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

object WidgetApiClient {

    fun fetchUpcoming(
        apiBaseUrl: String,
        input: WidgetFetchInput,
        authToken: String? = null,
        widgetServerToken: String? = null,
        ifNoneMatch: String? = null,
        connectTimeoutMs: Int = 8000,
        readTimeoutMs: Int = 12000,
    ): WidgetFetchResult {
        val endpoint = apiBaseUrl.trimEnd('/') + "/widget/upcoming?limit=" + input.limit
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = connectTimeoutMs
            readTimeout = readTimeoutMs
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")

            if (!authToken.isNullOrBlank()) {
                setRequestProperty("Authorization", "Bearer $authToken")
            }
            if (!widgetServerToken.isNullOrBlank()) {
                setRequestProperty("x-widget-server-token", widgetServerToken)
            }
            if (!ifNoneMatch.isNullOrBlank()) {
                setRequestProperty("If-None-Match", ifNoneMatch)
            }
        }

        return try {
            val body = JSONObject()
                .put("favorites", org.json.JSONArray(input.favoritesJson))
                .put("watched", org.json.JSONArray(input.watchedJson))
                .put("limit", input.limit)
                .toString()

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(body)
                writer.flush()
            }

            val code = connection.responseCode
            val eTag = connection.getHeaderField("ETag")

            if (code == HttpURLConnection.HTTP_NOT_MODIFIED) {
                return WidgetFetchResult(
                    payload = null,
                    rawBody = null,
                    eTag = eTag,
                    notModified = true,
                    httpCode = code,
                    error = null,
                )
            }

            val stream =
                if (code in 200..299) connection.inputStream else connection.errorStream
            val raw = stream?.bufferedReaderCompat().orEmpty()
            val payload = if (code in 200..299) WidgetPayloadParser.parse(raw) else null

            WidgetFetchResult(
                payload = payload,
                rawBody = raw,
                eTag = eTag,
                notModified = false,
                httpCode = code,
                error = if (code in 200..299) null else "HTTP $code",
            )
        } catch (t: Throwable) {
            WidgetFetchResult(
                payload = null,
                rawBody = null,
                eTag = null,
                notModified = false,
                httpCode = -1,
                error = t.message ?: "Network error",
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun java.io.InputStream.bufferedReaderCompat(): String {
        return BufferedReader(InputStreamReader(this)).use { it.readText() }
    }
}
