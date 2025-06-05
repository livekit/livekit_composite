package io.livekit.android.example.voiceassistant

import android.widget.Toast
import androidx.activity.ComponentActivity
import com.github.ajalt.timberkt.Timber
import com.google.gson.Gson
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.io.IOException

// TODO: Add your Sandbox ID here
const val sandboxID = ""

/**
 * Ensures a valid LiveKit token is generated.
 *
 * Currently configured to use LiveKit's Sandbox token server.
 * When building an app for production, you should use your own token server.
 */
fun ComponentActivity.requireToken(onTokenGenerated: (url: String, token: String) -> Unit) {
    if (sandboxID.isEmpty()) {
        runOnUiThread {
            // NOTE: If you prefer not to use LiveKit Sandboxes for testing, you can generate your
            // tokens manually by visiting https://cloud.livekit.io/projects/p_/settings/keys
            // and using one of your API Keys to generate a token with custom TTL and permissions.
            onTokenGenerated("MY_WS_URL", "MY_TOKEN")
            Timber.w { "sandboxID not populated, using default URL and token." }
        }
        return
    }

    val activity = this
    val tokenEndpoint = "https://cloud-api.livekit.io/api/sandbox/connection-details"
    val client = OkHttpClient()
    val request = Request.Builder()
        .url(tokenEndpoint)
        .header("X-Sandbox-ID", sandboxID)
        .build()

    client.newCall(request).enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            e.printStackTrace()
            runOnUiThread {
                Toast.makeText(
                    activity,
                    "Failed to fetch connection details",
                    Toast.LENGTH_SHORT
                )
                    .show()
            }
        }

        override fun onResponse(call: Call, response: Response) {
            response.body.let { responseBody ->
                if (response.isSuccessful) {
                    data class ConnectionDetails(
                        val serverUrl: String,
                        val participantToken: String,
                    )
                    val json = responseBody.string()
                    val cd = Gson().fromJson(json, ConnectionDetails::class.java)
                    runOnUiThread {
                        onTokenGenerated(cd.serverUrl, cd.participantToken)
                    }
                } else {
                    runOnUiThread {
                        Toast.makeText(
                            activity,
                            "Failed to parse connection details",
                            Toast.LENGTH_SHORT
                        )
                            .show()
                    }
                }
            }
        }
    })
}