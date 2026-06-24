package com.mobiletvtracker.widgetclient

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Invisible trampoline for widget list-row taps. Android 14+ forbids a
 * FLAG_MUTABLE PendingIntent with an implicit intent, but a collection's
 * click template must be mutable (for per-row fill-in). So the template points
 * here (explicit), and this activity forwards the filled-in URL to the browser.
 */
class LinkTrampolineActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val data = intent?.data
        if (data != null) {
            try {
                startActivity(
                    Intent(Intent.ACTION_VIEW, data).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            } catch (_: Throwable) {
                // No browser / bad URL — nothing to do.
            }
        }
        finish()
    }
}
