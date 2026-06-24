# Android Widget Client Module

This folder contains a drop-in Kotlin module for consuming the widget endpoint:

- POST `/api/widget/upcoming`
- request body with `favorites`, `watched`, `limit`
- response payload shape from `WIDGET_IMPLEMENTATION_SPEC.md`

## Files

- `WidgetModels.kt` data models and enum for payload
- `WidgetPayloadParser.kt` defensive JSON parser (`org.json`)
- `WidgetApiClient.kt` minimal network client using `HttpURLConnection`
- `WidgetCache.kt` cache record + staleness policy helpers
- `WidgetDataStore.kt` DataStore persistence for payload + ETag
- `WidgetRepository.kt` refresh flow with network + stale fallback
- `WidgetSyncWorker.kt` WorkManager sync worker
- `WidgetRefreshScheduler.kt` periodic/immediate work enqueuer
- `UpcomingGlanceWidget.kt` Glance widget UI (ok/empty/error)
- `UpcomingGlanceWidgetReceiver.kt` Android widget receiver
- `WidgetGlanceUpdater.kt` helper to trigger widget redraw

## Android dependencies

Add these in your Android app module:

```gradle
implementation "androidx.work:work-runtime-ktx:2.10.0"
implementation "androidx.datastore:datastore-preferences:1.1.1"
implementation "androidx.glance:glance-appwidget:1.1.1"
```

## Integration Steps

1. Copy these files into your Android app module.
2. Replace `package com.mobiletvtracker.widgetclient` with your app package.
3. Use `WidgetRefreshScheduler.enqueueImmediate(...)` on app open and after favorites/watched changes.
4. Use `WidgetRefreshScheduler.enqueuePeriodic(...)` for background refresh.
5. In your widget renderer, read cache with `WidgetDataStore.readCache()` and parse via `WidgetPayloadParser`.
6. Pass `apiBaseUrl` as your server API root, for example `https://your-host/api`.
7. After a successful sync, call `WidgetGlanceUpdater.refreshAll(context)`.

## Manifest snippet

Add a receiver in your AndroidManifest:

```xml
<receiver
	android:name=".widgetclient.UpcomingGlanceWidgetReceiver"
	android:exported="false">
	<intent-filter>
		<action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
	</intent-filter>

	<meta-data
		android:name="android.appwidget.provider"
		android:resource="@xml/upcoming_widget_info" />
</receiver>
```

Template fil for provider-info finns i denna mapp:

- `upcoming_widget_info.xml`

Placera den i din Android-app under `res/xml/upcoming_widget_info.xml`.

## Notes

- No external serialization dependency is required.
- Parser is tolerant of missing fields and unknown values.
- Network call supports `ETag` + `If-None-Match`.
