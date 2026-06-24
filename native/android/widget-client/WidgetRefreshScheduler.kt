package com.mobiletvtracker.widgetclient

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import java.util.concurrent.TimeUnit

object WidgetRefreshScheduler {

    private const val PERIODIC_WORK_NAME = "widget_upcoming_periodic_sync"
    private const val ONE_SHOT_WORK_NAME = "widget_upcoming_one_shot_sync"

    fun enqueuePeriodic(
        context: Context,
        apiBaseUrl: String,
        favoritesJson: String,
        watchedJson: String,
        widgetServerToken: String? = null,
        limit: Int = 10,
        repeatMinutes: Long = 60,
    ) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val input = workDataOf(
            WidgetSyncWorker.KEY_API_BASE_URL to apiBaseUrl,
            WidgetSyncWorker.KEY_FAVORITES_JSON to favoritesJson,
            WidgetSyncWorker.KEY_WATCHED_JSON to watchedJson,
            WidgetSyncWorker.KEY_LIMIT to limit,
            WidgetSyncWorker.KEY_WIDGET_SERVER_TOKEN to widgetServerToken,
        )

        val request = PeriodicWorkRequestBuilder<WidgetSyncWorker>(
            repeatMinutes.coerceAtLeast(15),
            TimeUnit.MINUTES,
        )
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .setInputData(input)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }

    fun enqueueImmediate(
        context: Context,
        apiBaseUrl: String,
        favoritesJson: String,
        watchedJson: String,
        widgetServerToken: String? = null,
        limit: Int = 10,
    ) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val input = workDataOf(
            WidgetSyncWorker.KEY_API_BASE_URL to apiBaseUrl,
            WidgetSyncWorker.KEY_FAVORITES_JSON to favoritesJson,
            WidgetSyncWorker.KEY_WATCHED_JSON to watchedJson,
            WidgetSyncWorker.KEY_LIMIT to limit,
            WidgetSyncWorker.KEY_WIDGET_SERVER_TOKEN to widgetServerToken,
        )

        val request = OneTimeWorkRequestBuilder<WidgetSyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .setInputData(input)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            ONE_SHOT_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }
}
