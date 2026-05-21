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

  if (
    declaredMimeType?.lowercase()?.contains("mpegurl") == true ||
      normalizedUrl.contains("/hls/") ||
      normalizedUrl.contains(".m3u8")
  ) {
    return MimeTypes.APPLICATION_M3U8
  }

  return declaredMimeType
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

