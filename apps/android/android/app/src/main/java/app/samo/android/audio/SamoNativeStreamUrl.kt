package app.samo.android.audio

import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

/**
 * Refreshes Samo stream_token query params for native queue auto-advance so
 * ExoPlayer can start the next track without a live JS bridge.
 */
internal object SamoNativeStreamUrl {
  private const val TAG = "SamoNativeStream"
  private val refreshExecutor = Executors.newSingleThreadExecutor()

  fun refreshQueueItemAsync(
    item: HashMap<String, Any?>,
    onResult: (HashMap<String, Any?>) -> Unit,
  ) {
    refreshExecutor.execute {
      onResult(refreshQueueItem(item))
    }
  }

  fun refreshQueueItem(item: HashMap<String, Any?>): HashMap<String, Any?> {
    val url = item.optionalString("url") ?: return item
    if (!shouldRefresh(url)) {
      return item
    }

    val serverUrl = item.optionalString("serverUrl")
    val bearer = item.optionalString("serverBearerToken")
    if (serverUrl.isNullOrBlank() || bearer.isNullOrBlank()) {
      Log.w(
        TAG,
        "missing native stream credentials for ${item.optionalString("id")}; playback may stall",
      )
      return item
    }

    val token =
      mintStreamToken(serverUrl, bearer)
        ?: run {
          Log.w(TAG, "stream token mint failed for ${item.optionalString("id")}")
          return item
        }

    val refreshed = HashMap(item)
    refreshed["url"] = replaceStreamToken(url, token)
    item.optionalString("castUrl")?.let { castUrl ->
      if (shouldRefresh(castUrl)) {
        refreshed["castUrl"] = replaceStreamToken(castUrl, token)
      }
    }
    item.optionalString("artworkUrl")?.let { artworkUrl ->
      if (shouldRefresh(artworkUrl)) {
        refreshed["artworkUrl"] = replaceStreamToken(artworkUrl, token)
      }
    }
    return refreshed
  }

  fun shouldRefresh(url: String): Boolean =
    try {
      URL(url).path.contains("/api/v1/")
    } catch (_: Exception) {
      false
    }

  private fun mintStreamToken(serverUrl: String, bearer: String): String? {
    var connection: HttpURLConnection? = null
    try {
      val endpoint = "${serverUrl.trimEnd('/')}/api/v1/auth/stream-token"
      connection =
        (URL(endpoint).openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          connectTimeout = 15_000
          readTimeout = 15_000
          doInput = true
          setRequestProperty("Authorization", "Bearer $bearer")
          setRequestProperty("Accept", "application/json")
        }

      val status = connection.responseCode
      val bodyStream =
        if (status in 200..299) {
          connection.inputStream
        } else {
          connection.errorStream
        }
      val body = bodyStream?.bufferedReader()?.use { it.readText() }.orEmpty()
      if (status !in 200..299) {
        Log.w(TAG, "stream-token HTTP $status: $body")
        return null
      }

      val token = JSONObject(body).optString("token")
      if (token.isNullOrBlank()) {
        Log.w(TAG, "stream-token response missing token")
        return null
      }
      return token
    } catch (error: Exception) {
      Log.w(TAG, "stream-token request failed", error)
      return null
    } finally {
      connection?.disconnect()
    }
  }

  private fun replaceStreamToken(url: String, token: String): String {
    val parsed = URL(url)
    val retained =
      parsed.query
        ?.split("&")
        ?.filter { part ->
          part.isNotBlank() && !part.startsWith("stream_token=")
        }
        ?.joinToString("&")
        .orEmpty()

    val builder = StringBuilder()
    builder.append(parsed.protocol).append("://").append(parsed.authority).append(parsed.path)
    if (retained.isNotEmpty()) {
      builder.append('?').append(retained)
    }
    builder.append(if (builder.contains('?')) '&' else '?')
    builder.append("stream_token=").append(URLEncoder.encode(token, Charsets.UTF_8.name()))
    return builder.toString()
  }

  private fun HashMap<String, Any?>.optionalString(key: String): String? =
    this[key] as? String
}
