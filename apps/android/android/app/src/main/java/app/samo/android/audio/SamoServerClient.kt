package app.samo.android.audio

import android.util.Log
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.net.UnknownHostException

/**
 * Minimal Samo HTTP client for the few endpoints the native audio engine needs
 * to hit while JS is suspended. Uses HttpURLConnection (matching [SamoNativeStreamUrl])
 * so we don't add an OkHttp dependency for ~50 lines of code.
 *
 * Only [patchPlayback] is implemented today. Add more endpoints here as the
 * Kotlin/JS boundary migration progresses (Phase 2 URL building, etc).
 */
internal object SamoServerClient {
    private const val TAG = "SamoServerClient"

    enum class PatchFailure {
        Network,
        Auth,
        Server,
    }

    sealed class PatchResult {
        data object Success : PatchResult()
        data class Failed(val reason: PatchFailure) : PatchResult()
    }

    data class PlaybackPatch(
        val progressSeconds: Long? = null,
        val completed: Boolean? = null,
        val touchLastPlayedAt: Boolean = false,
        val touchLastPositionAt: Boolean = false,
        val incrementPlayCount: Boolean = false,
    ) {
        fun toJson(): JSONObject {
            val json = JSONObject()
            progressSeconds?.let { json.put("progressSeconds", it) }
            completed?.let { json.put("completed", it) }
            if (touchLastPlayedAt) json.put("touchLastPlayedAt", true)
            if (touchLastPositionAt) json.put("touchLastPositionAt", true)
            if (incrementPlayCount) json.put("incrementPlayCount", true)
            return json
        }
    }

    /**
     * PATCH /api/v1/playback/{kind}/{targetId}. [kind] is the Samo playback
     * target kind ("music-track", "music-playlist", "audiobook",
     * "podcast-episode"). Caller controls retry semantics.
     */
    fun patchPlayback(
        serverUrl: String,
        bearer: String,
        kind: String,
        targetId: String,
        body: PlaybackPatch,
    ): PatchResult {
        var connection: HttpURLConnection? = null
        try {
            val endpoint =
                "${serverUrl.trimEnd('/')}/api/v1/playback/$kind/$targetId"
            connection =
                (URL(endpoint).openConnection() as HttpURLConnection).apply {
                    requestMethod = "PATCH"
                    connectTimeout = 15_000
                    readTimeout = 15_000
                    doInput = true
                    doOutput = true
                    setRequestProperty("Authorization", "Bearer $bearer")
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("Content-Type", "application/json")
                }

            connection.outputStream.use { stream ->
                stream.write(body.toJson().toString().toByteArray(Charsets.UTF_8))
            }

            val status = connection.responseCode
            if (status in 200..299) {
                // Drain so the connection can be pooled cleanly.
                connection.inputStream.use { it.readBytes() }
                return PatchResult.Success
            }

            val errorBody =
                connection.errorStream
                    ?.bufferedReader()
                    ?.use { it.readText() }
                    .orEmpty()

            return when (status) {
                401, 403 -> {
                    Log.w(TAG, "$endpoint rejected: HTTP $status: $errorBody")
                    PatchResult.Failed(PatchFailure.Auth)
                }
                else -> {
                    Log.w(TAG, "$endpoint HTTP $status: $errorBody")
                    PatchResult.Failed(PatchFailure.Server)
                }
            }
        } catch (_: UnknownHostException) {
            return PatchResult.Failed(PatchFailure.Network)
        } catch (_: SocketTimeoutException) {
            return PatchResult.Failed(PatchFailure.Network)
        } catch (_: IOException) {
            return PatchResult.Failed(PatchFailure.Network)
        } catch (error: Exception) {
            Log.w(TAG, "playback PATCH unexpected failure", error)
            return PatchResult.Failed(PatchFailure.Server)
        } finally {
            connection?.disconnect()
        }
    }
}
