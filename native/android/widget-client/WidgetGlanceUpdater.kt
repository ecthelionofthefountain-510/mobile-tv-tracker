package com.mobiletvtracker.widgetclient

import android.content.Context
import androidx.glance.appwidget.updateAll

object WidgetGlanceUpdater {

    suspend fun refreshAll(context: Context) {
        UpcomingGlanceWidget().updateAll(context)
    }
}
