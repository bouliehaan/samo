package app.samo.android.audio

import com.facebook.react.bridge.ReadableMap
import androidx.media3.common.MimeTypes

fun ReadableMap.getOptionalString(key: String): String? {
  if (!hasKey(key) || isNull(key)) {
    return null
  }

  return getString(key)
}

fun ReadableMap.getOptionalBoolean(key: String): Boolean? {
  if (!hasKey(key) || isNull(key)) {
    return null
  }

  return getBoolean(key)
}

fun ReadableMap.getOptionalInt(key: String): Int? {
  if (!hasKey(key) || isNull(key)) {
    return null
  }

  return getDouble(key).toInt()
}

fun ReadableMap.getOptionalDouble(key: String): Double? {
  if (!hasKey(key) || isNull(key)) {
    return null
  }

  return getDouble(key)
}


fun ReadableMap.getHttpHeaders(key: String = "httpHeaders"): Map<String, String> {
  if (!hasKey(key) || isNull(key)) {
    return emptyMap()
  }

  val headers = getMap(key) ?: return emptyMap()
  val iterator = headers.keySetIterator()
  val result = mutableMapOf<String, String>()

  while (iterator.hasNextKey()) {
    val key = iterator.nextKey()

    if (!headers.isNull(key)) {
      headers.getString(key)?.let { value ->
        if (key.isNotBlank() && value.isNotBlank()) {
          result[key] = value
        }
      }
    }
  }

  return result
}


fun getMediaItemMimeType(url: String, declaredMimeType: String?): String? {
  val normalizedUrl = url.lowercase()
  val normalizedMime = declaredMimeType?.lowercase()?.trim()

  if (
    normalizedMime?.contains("mpegurl") == true ||
      normalizedUrl.contains("/hls/") ||
      normalizedUrl.contains(".m3u8")
  ) {
    return MimeTypes.APPLICATION_M3U8
  }

  // Only force a container ExoPlayer can reliably map to an extractor. A
  // declared podcast enclosure type is frequently wrong, empty, or non-audio
  // (video/*, application/octet-stream, or even an HTML error page's
  // text/html); forcing it makes DefaultMediaSourceFactory select the wrong
  // extractor and fail with "no supported source was found". Returning null
  // lets ExoPlayer sniff the actual container from the response bytes, which is
  // reliable for real audio. Genuine audio/* types are still honored so music
  // and audiobook playback is unchanged.
  if (normalizedMime != null && normalizedMime.startsWith("audio/")) {
    return declaredMimeType
  }

  return null
}


internal fun ReadableMap.getSourceQuality(): SamoAudioSourceQuality {
  val quality = if (hasKey("quality") && !isNull("quality")) {
    getMap("quality")
  } else {
    null
  }

  return SamoAudioSourceQuality(
    bitDepth = quality?.getOptionalInt("bitDepth"),
    channelCount = quality?.getOptionalInt("channelCount"),
    container = quality?.getOptionalString("container"),
    losslessRequired = quality?.getOptionalBoolean("losslessRequired") ?: false,
    sampleRate = quality?.getOptionalInt("sampleRate"),
    serverTranscodeRequested =
      quality?.getOptionalBoolean("serverTranscodeRequested") ?: true
  )
}

