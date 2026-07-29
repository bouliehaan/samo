package app.samo.android.audio

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap

// RN 0.86 made every `code` parameter on Promise nullable; overriding with a
// non-null `String` no longer matches the interface.
internal object SamoNoOpPromise : Promise {
  override fun resolve(value: Any?) = Unit

  override fun reject(code: String?, message: String?) = Unit

  override fun reject(message: String) = Unit

  override fun reject(code: String?, throwable: Throwable?) = Unit

  override fun reject(code: String?, message: String?, throwable: Throwable?) = Unit

  override fun reject(throwable: Throwable) = Unit

  override fun reject(throwable: Throwable, userInfo: WritableMap) = Unit

  override fun reject(code: String?, userInfo: WritableMap) = Unit

  override fun reject(code: String?, throwable: Throwable?, userInfo: WritableMap) = Unit

  override fun reject(code: String?, message: String?, userInfo: WritableMap) = Unit

  override fun reject(
    code: String?,
    message: String?,
    throwable: Throwable?,
    userInfo: WritableMap?,
  ) = Unit
}

/**
 * Deep-copies React Native bridge maps so playback queue entries survive after
 * the JS call returns. The native service advances tracks without JS.
 */
internal object SamoBridgeMapCopier {
  fun toHashMap(map: ReadableMap): HashMap<String, Any?> {
    val result = HashMap<String, Any?>()
    val iterator = map.keySetIterator()
    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()
      if (map.isNull(key)) {
        result[key] = null
        continue
      }
      result[key] = when (map.getType(key)) {
        ReadableType.Boolean -> map.getBoolean(key)
        ReadableType.Number -> map.getDouble(key)
        ReadableType.String -> map.getString(key)
        ReadableType.Map -> toHashMap(map.getMap(key)!!)
        ReadableType.Array -> toList(map.getArray(key)!!)
        else -> null
      }
    }
    return result
  }

  fun toWritableMap(map: HashMap<String, Any?>): WritableMap = Arguments.makeNativeMap(map)

  private fun toList(array: ReadableArray): ArrayList<Any?> {
    val result = ArrayList<Any?>(array.size())
    for (index in 0 until array.size()) {
      if (array.isNull(index)) {
        result.add(null)
        continue
      }
      result.add(
        when (array.getType(index)) {
          ReadableType.Boolean -> array.getBoolean(index)
          ReadableType.Number -> array.getDouble(index)
          ReadableType.String -> array.getString(index)
          ReadableType.Map -> toHashMap(array.getMap(index)!!)
          ReadableType.Array -> toList(array.getArray(index)!!)
          else -> null
        },
      )
    }
    return result
  }
}

internal class SamoNativePlaybackQueue(
  val items: MutableList<HashMap<String, Any?>>,
  var index: Int,
) {
  fun hasNext(): Boolean = index + 1 < items.size

  fun hasPrevious(): Boolean = index > 0
}

internal fun parseNativePlaybackQueue(
  queueItems: ReadableArray?,
  queueIndex: Int?,
  sourceLabel: String?,
): SamoNativePlaybackQueue? {
  val queueArray = queueItems ?: return null
  val items = ArrayList<HashMap<String, Any?>>(queueArray.size())
  for (index in 0 until queueArray.size()) {
    val item = queueArray.getMap(index) ?: continue
    items.add(SamoBridgeMapCopier.toHashMap(item))
  }
  return buildNativePlaybackQueue(items, queueIndex, sourceLabel)
}

/**
 * Pure mirror-queue decision, split out of [parseNativePlaybackQueue] so it can
 * be unit-tested without the React Native bridge types.
 *
 * Radio is a live, endless stream you can't gaplessly advance OUT of, so when
 * it's the CURRENTLY PLAYING item ([sourceLabel]) there's no queue to mirror.
 * But a radio item sitting LATER in the queue MUST stay in the mirror: native
 * auto-advance — STATE_ENDED -> requestQueueAdvanceFromEnded ->
 * tryNavigateNativeQueue -> playQueueItemAt -> playLocally(radio) — is the ONLY
 * advancer that runs while the app is asleep (JS is frozen by Doze). The old
 * code returned null for the WHOLE queue the moment ANY item was radio, which
 * left a backgrounded "podcast -> radio" (also music/audiobook -> radio, or
 * radio mid-queue) with nothing for native to advance into: the radio never
 * started until the user unlocked the phone and the JS nav-request backstop
 * thawed. The JS gate shouldMirrorPlaybackQueueToNative (playback-queue-mirror.ts)
 * was already fixed to mirror radio-later queues; this is the other half of that
 * fix. Radio items are kept HERE but stay out of the gapless ExoPlayer timeline
 * (the `all { music || podcast }` gates in playLocally and reconcileExoPlaylistToQueue
 * exclude them), so a radio-bearing queue always takes the single-item +
 * mirror-advance path, and playLocally treats the radio item as a live stream
 * when it's reached.
 */
internal fun buildNativePlaybackQueue(
  items: List<HashMap<String, Any?>>,
  queueIndex: Int?,
  sourceLabel: String?,
): SamoNativePlaybackQueue? {
  if (items.size < 2) {
    return null
  }
  if (sourceLabel == "radio") {
    return null
  }

  val requestedIndex = queueIndex ?: 0
  val clampedIndex = requestedIndex.coerceIn(0, items.lastIndex)
  return SamoNativePlaybackQueue(items.toMutableList(), clampedIndex)
}

internal fun ReadableMap.syncNativePlaybackQueue(
  current: SamoNativePlaybackQueue?,
): SamoNativePlaybackQueue? {
  if (!hasKey("queueItems") || isNull("queueItems")) {
    return null
  }

  return parseNativePlaybackQueue(
    queueItems = getArray("queueItems"),
    queueIndex = getOptionalInt("queueIndex"),
    sourceLabel = getOptionalString("source"),
  )
}
