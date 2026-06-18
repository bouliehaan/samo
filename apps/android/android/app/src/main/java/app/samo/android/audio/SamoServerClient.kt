package app.samo.android.audio

import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.net.SocketTimeoutException

/**
 * Minimal Samo HTTP client for the few endpoints the native audio engine needs
 * to hit while JS is suspended. Routes through the shared [SamoHttp.control]
 * OkHttpClient so a stale pooled socket is re-dialed transparently instead of
 * blocking on a dead connection until the read timeout fires.
 *
 * Only [patchPlayback] is implemented today. Add more endpoints here as the
 * Kotlin/JS boundary migration progresses (Phase 2 URL building, etc).
 */
internal object SamoServerClient {
    private const val TAG = "SamoServerClient"
    private val JSON = "application/json; charset=utf-8".toMediaType()

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
        val endpoint = "${serverUrl.trimEnd('/')}/api/v1/playback/$kind/$targetId"
        val request =
            Request.Builder()
                .url(endpoint)
                .patch(body.toJson().toString().toRequestBody(JSON))
                .header("Authorization", "Bearer $bearer")
                .header("Accept", "application/json")
                .build()

        return try {
            // retryOnConnectionFailure on the shared client re-dials a stale
            // pooled socket before this ever blocks on a dead connection.
            SamoHttp.control.newCall(request).execute().use { response ->
                when {
                    response.isSuccessful -> PatchResult.Success
                    response.code == 401 || response.code == 403 -> {
                        Log.w(TAG, "$endpoint rejected: HTTP ${response.code}")
                        PatchResult.Failed(PatchFailure.Auth)
                    }
                    else -> {
                        Log.w(TAG, "$endpoint HTTP ${response.code}")
                        PatchResult.Failed(PatchFailure.Server)
                    }
                }
            }
        } catch (_: SocketTimeoutException) {
            PatchResult.Failed(PatchFailure.Network)
        } catch (_: IOException) {
            PatchResult.Failed(PatchFailure.Network)
        } catch (error: Exception) {
            Log.w(TAG, "playback PATCH unexpected failure", error)
            PatchResult.Failed(PatchFailure.Server)
        }
    }
}
