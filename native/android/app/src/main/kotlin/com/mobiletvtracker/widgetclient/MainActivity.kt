package com.mobiletvtracker.widgetclient

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import org.json.JSONArray
import org.json.JSONObject

private const val PREFS_NAME = "widget_config"
private const val KEY_API_URL = "api_base_url"
private const val KEY_TOKEN = "widget_server_token"
private const val KEY_FAVORITES_JSON = "favorites_json"
private const val KEY_WATCHED_JSON = "watched_json"

// First-run seed so widget can render non-empty upcoming rows immediately.
private const val DEMO_FAVORITES_JSON =
    """[{"id":94997,"mediaType":"tv","name":"House of the Dragon"},{"id":84773,"mediaType":"tv","name":"The Rings of Power"},{"id":71912,"mediaType":"tv","name":"The Witcher"}]"""

private val Yellow400 = Color(0xFFFFD54F)
private val DarkBg = Color(0xFF0D0D0D)

private fun normalizeApiBaseUrl(raw: String): String {
    val trimmed = raw.trim().trimEnd('/')
    if (trimmed.isBlank()) return ""

    val withScheme = if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        trimmed
    } else {
        "http://$trimmed"
    }

    return if (withScheme.endsWith("/api")) withScheme else "$withScheme/api"
}

private fun ensureMinimumDemoFavorites(rawJson: String): String {
    val demoArray = JSONArray(DEMO_FAVORITES_JSON)
    val demoById = mutableMapOf<String, JSONObject>()
    for (i in 0 until demoArray.length()) {
        val obj = demoArray.optJSONObject(i) ?: continue
        val id = obj.opt("id")?.toString() ?: continue
        demoById[id] = obj
    }

    val existing = try {
        JSONArray(rawJson)
    } catch (_: Throwable) {
        JSONArray()
    }

    val result = JSONArray()
    val seenIds = mutableSetOf<String>()

    fun appendUnique(obj: JSONObject) {
        val id = obj.opt("id")?.toString() ?: return
        if (!seenIds.add(id)) return
        result.put(obj)
    }

    for (i in 0 until existing.length()) {
        val original = existing.optJSONObject(i) ?: continue
        val originalId = original.opt("id")?.toString().orEmpty()
        val originalName = original.optString("name", original.optString("title", ""))

        // Migrate the old demo bug where House of the Dragon was stored as TMDb id 1399.
        val migrated = if (originalId == "1399" && originalName.equals("House of the Dragon", ignoreCase = true)) {
            demoById["94997"] ?: original
        } else {
            original
        }

        appendUnique(migrated)
    }

    for (i in 0 until demoArray.length()) {
        if (result.length() >= 3) break
        val obj = demoArray.optJSONObject(i) ?: continue
        appendUnique(obj)
    }

    return result.toString()
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Yellow400,
                    background = DarkBg,
                    surface = Color(0xFF1A1A1A),
                ),
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    WidgetConfigScreen(
                        initialUrl = prefs.getString(KEY_API_URL, "") ?: "",
                        initialToken = prefs.getString(KEY_TOKEN, "") ?: "",
                        onSave = { url, token ->
                            val normalizedUrl = normalizeApiBaseUrl(url)
                            val existingFavJson = prefs.getString(KEY_FAVORITES_JSON, "[]") ?: "[]"
                            val existingWatchedJson = prefs.getString(KEY_WATCHED_JSON, "[]") ?: "[]"

                            val favJson = if (existingFavJson.isBlank() || existingFavJson == "[]") {
                                DEMO_FAVORITES_JSON
                            } else {
                                ensureMinimumDemoFavorites(existingFavJson)
                            }

                            val watchedJson = if (existingWatchedJson.isBlank()) "[]" else existingWatchedJson

                            prefs.edit()
                                .putString(KEY_API_URL, normalizedUrl)
                                .putString(KEY_TOKEN, token)
                                .putString(KEY_FAVORITES_JSON, favJson)
                                .putString(KEY_WATCHED_JSON, watchedJson)
                                .apply()

                            val tokenOrNull = token.ifBlank { null }

                            WidgetRefreshScheduler.enqueuePeriodic(
                                context = applicationContext,
                                apiBaseUrl = normalizedUrl,
                                favoritesJson = favJson,
                                watchedJson = watchedJson,
                                widgetServerToken = tokenOrNull,
                                repeatMinutes = 60,
                            )
                            WidgetRefreshScheduler.enqueueImmediate(
                                context = applicationContext,
                                apiBaseUrl = normalizedUrl,
                                favoritesJson = favJson,
                                watchedJson = watchedJson,
                                widgetServerToken = tokenOrNull,
                            )
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun WidgetConfigScreen(
    initialUrl: String,
    initialToken: String,
    onSave: (url: String, token: String) -> Unit,
) {
    var apiUrl by remember { mutableStateOf(initialUrl) }
    var token by remember { mutableStateOf(initialToken) }
    var saved by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp, vertical = 48.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "TV Tracker Widget",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Ange din server-URL för att aktivera widgeten.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(modifier = Modifier.height(40.dp))

        OutlinedTextField(
            value = apiUrl,
            onValueChange = { apiUrl = it; saved = false },
            label = { Text("API Base URL") },
            placeholder = { Text("http://192.168.x.x:5174/api") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = token,
            onValueChange = { token = it; saved = false },
            label = { Text("Widget Token (valfritt)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "💡 Lokal server på wifi: använd http://<din-ip>:5174/api (inte https).",
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFF888888),
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Första sync använder demo-serier om ingen profil-data finns ännu.",
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFF777777),
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = {
                val url = apiUrl.trim()
                if (url.isNotBlank()) {
                    onSave(url, token.trim())
                    saved = true
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = apiUrl.isNotBlank(),
            colors = ButtonDefaults.buttonColors(
                containerColor = Yellow400,
                contentColor = Color.Black,
            ),
        ) {
            Text("Spara & synka widget", style = MaterialTheme.typography.labelLarge)
        }

        if (saved) {
            Spacer(modifier = Modifier.height(16.dp))
            Row {
                Text(
                    text = "✓ Sparat. Lägg till widgeten på hemskärmen via lång tryckning.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}
