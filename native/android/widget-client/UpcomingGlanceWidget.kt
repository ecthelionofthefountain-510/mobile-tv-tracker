package com.mobiletvtracker.widgetclient

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.Text

class UpcomingGlanceWidget : GlanceAppWidget() {

    // Declare the exact sizes Android should pass to LocalSize.
    // Glance renders each size bucket independently, so compact vs large
    // layout decisions in UpcomingWidgetContent are always accurate on device.
    override val sizeMode = SizeMode.Responsive(
        setOf(
            DpSize(width = 180.dp, height = 110.dp), // small (2x1)
            DpSize(width = 250.dp, height = 160.dp), // medium (3x2)
            DpSize(width = 340.dp, height = 220.dp), // large (4x3)
        )
    )

    override suspend fun provideGlance(context: android.content.Context, id: androidx.glance.GlanceId) {
        val snapshotPrefs = context.getSharedPreferences(
            WidgetSyncWorker.SNAPSHOT_PREFS,
            android.content.Context.MODE_PRIVATE,
        )
        val snapshotLine1 = snapshotPrefs.getString(WidgetSyncWorker.KEY_SNAPSHOT_LINE1, null)
        val snapshotLine2 = snapshotPrefs.getString(WidgetSyncWorker.KEY_SNAPSHOT_LINE2, "") ?: ""

        val payload = runCatching {
            WidgetDataStore(context)
                .readCache()
                ?.payloadJson
                ?.let { WidgetPayloadParser.parse(it) }
        }.getOrNull()

        provideContent {
            SafeDynamicWidgetContent(
                payload = payload,
                snapshotLine1 = snapshotLine1,
                snapshotLine2 = snapshotLine2,
            )
        }
    }
}

@Composable
private fun SafeDynamicWidgetContent(
    payload: UpcomingWidgetPayload?,
    snapshotLine1: String?,
    snapshotLine2: String,
) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(12.dp),
        contentAlignment = Alignment.TopStart,
    ) {
        Column(modifier = GlanceModifier.fillMaxWidth()) {
            Text(text = "TV Tracker")
            Spacer(modifier = GlanceModifier.height(8.dp))

            if (!snapshotLine1.isNullOrBlank()) {
                Text(text = snapshotLine1)
                if (snapshotLine2.isNotBlank()) {
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Text(text = snapshotLine2)
                }
            } else {
                when {
                    payload == null -> Text(text = "Syncar data...")
                    payload.items.isEmpty() -> Text(text = "Inga kommande avsnitt")
                    else -> {
                        Text(text = "${payload.items.size} kommande")
                        Spacer(modifier = GlanceModifier.height(4.dp))
                        Text(text = payload.items.firstOrNull()?.title ?: "Untitled")
                    }
                }
            }
        }
    }
}
