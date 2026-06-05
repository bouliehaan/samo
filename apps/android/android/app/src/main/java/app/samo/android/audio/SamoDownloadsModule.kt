package app.samo.android.audio

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Thin RN bridge over [SamoDownloads]. Every method maps directly to a
 * SamoDownloads call — no business logic lives here. Registry changes fan out
 * via the `SamoDownloadsChanged` device event.
 */
class SamoDownloadsModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    private val unsubscribe: () -> Unit

    init {
        SamoDownloads.init(reactContext)
        unsubscribe = SamoDownloads.subscribe { entries ->
            // The event payload is the full registry. The JS shim diff-checks
            // on a `signature` it derives so listeners can no-op on idempotent
            // emits (e.g., the warmup callback that fires synchronously on
            // subscribe).
            val event = Arguments.createMap()
            event.putArray("entries", SamoDownloads.toWritableArray(entries))
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_REGISTRY_CHANGED, event)
        }
    }

    override fun getName(): String = MODULE_NAME

    override fun invalidate() {
        try {
            unsubscribe()
        } catch (_: Exception) {
            // Best-effort cleanup; never block teardown on listener removal.
        }
        super.invalidate()
    }

    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit

    @ReactMethod
    fun enqueue(input: ReadableMap, promise: Promise) {
        try {
            val entry = parseEntryInput(input)
            val resolved = SamoDownloads.enqueue(reactContext, entry)
            promise.resolve(resolved.toMap())
        } catch (error: Exception) {
            promise.reject("SAMO_DOWNLOADS_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun cancel(id: String, promise: Promise) {
        SamoDownloads.cancel(reactContext, id)
        promise.resolve(null)
    }

    @ReactMethod
    fun remove(id: String, promise: Promise) {
        SamoDownloads.remove(reactContext, id)
        promise.resolve(null)
    }

    @ReactMethod
    fun clearAll(promise: Promise) {
        SamoDownloads.clearAll(reactContext)
        promise.resolve(null)
    }

    @ReactMethod
    fun retry(id: String, promise: Promise) {
        SamoDownloads.retry(reactContext, id)
        promise.resolve(null)
    }

    @ReactMethod
    fun list(promise: Promise) {
        promise.resolve(SamoDownloads.toWritableArray(SamoDownloads.list(reactContext)))
    }

    @ReactMethod
    fun localUriForTrack(trackId: String, sourceId: String, promise: Promise) {
        promise.resolve(SamoDownloads.localUriForTrack(reactContext, trackId, sourceId))
    }

    @ReactMethod
    fun setPlaybackActive(active: Boolean, promise: Promise) {
        SamoDownloads.setPlaybackThrottle(active)
        promise.resolve(null)
    }

    @ReactMethod
    fun getDownloadsRootUri(promise: Promise) {
        promise.resolve(SamoDownloads.downloadsRootUri(reactContext))
    }

    @ReactMethod
    fun patchLocalUri(id: String, localUri: String, promise: Promise) {
        SamoDownloads.patchLocalUri(reactContext, id, localUri)
        promise.resolve(null)
    }

    @ReactMethod
    fun replaceAll(entries: com.facebook.react.bridge.ReadableArray, promise: Promise) {
        val parsed = mutableListOf<SamoDownloads.Entry>()
        for (i in 0 until entries.size()) {
            val entry = entries.getMap(i) ?: continue
            try {
                parsed.add(parseFullEntry(entry))
            } catch (error: Exception) {
                // Skip malformed rows from the JS discovery pass rather than
                // crashing the whole reconciliation; the next pass will see
                // the file again and try once more.
            }
        }
        SamoDownloads.replaceAll(reactContext, parsed)
        promise.resolve(null)
    }

    private fun parseFullEntry(input: ReadableMap): SamoDownloads.Entry {
        val collectionMap = input.getMap("collection")
            ?: throw IllegalArgumentException("Missing collection")
        val collection = SamoDownloads.Collection(
            id = collectionMap.getString("id") ?: throw IllegalArgumentException("Missing collection.id"),
            sourceId = collectionMap.getString("sourceId") ?: throw IllegalArgumentException("Missing collection.sourceId"),
            title = collectionMap.getString("title") ?: throw IllegalArgumentException("Missing collection.title"),
            type = collectionMap.getString("type") ?: throw IllegalArgumentException("Missing collection.type"),
            subtitle = collectionMap.optionalString("subtitle"),
            artworkUrl = collectionMap.optionalString("artworkUrl"),
            artworkImageId = collectionMap.optionalString("artworkImageId"),
        )
        val segment = input.getMap("audiobookSegment")?.let { map ->
            SamoDownloads.AudiobookSegment(
                index = if (map.hasKey("index")) map.getInt("index") else 0,
                startOffsetSeconds = if (map.hasKey("startOffsetSeconds")) map.getDouble("startOffsetSeconds") else 0.0,
                durationSeconds = if (map.hasKey("durationSeconds")) map.getDouble("durationSeconds") else null,
            )
        }
        val statusRaw = input.optionalString("status")
        return SamoDownloads.Entry(
            id = input.optionalString("id") ?: throw IllegalArgumentException("Missing id"),
            trackId = input.getString("trackId") ?: throw IllegalArgumentException("Missing trackId"),
            title = input.getString("title") ?: throw IllegalArgumentException("Missing title"),
            sourceUrl = input.getString("sourceUrl") ?: throw IllegalArgumentException("Missing sourceUrl"),
            trackSubtitle = input.optionalString("trackSubtitle"),
            audiobookSegment = segment,
            collection = collection,
            status = SamoDownloads.Status.fromWire(statusRaw),
            enqueuedAt = if (input.hasKey("enqueuedAt")) input.getDouble("enqueuedAt").toLong() else System.currentTimeMillis(),
            localUri = input.optionalString("localUri"),
            bytesDownloaded = if (input.hasKey("bytesDownloaded") && !input.isNull("bytesDownloaded")) input.getDouble("bytesDownloaded").toLong() else null,
            totalBytes = if (input.hasKey("totalBytes") && !input.isNull("totalBytes")) input.getDouble("totalBytes").toLong() else null,
            progress = if (input.hasKey("progress") && !input.isNull("progress")) input.getDouble("progress") else null,
            completedAt = if (input.hasKey("completedAt") && !input.isNull("completedAt")) input.getDouble("completedAt").toLong() else null,
            errorMessage = input.optionalString("errorMessage"),
        )
    }

    private fun parseEntryInput(input: ReadableMap): SamoDownloads.Entry {
        val collectionMap = input.getMap("collection")
            ?: throw IllegalArgumentException("Missing collection")
        val collection = SamoDownloads.Collection(
            id = collectionMap.getString("id") ?: throw IllegalArgumentException("Missing collection.id"),
            sourceId = collectionMap.getString("sourceId") ?: throw IllegalArgumentException("Missing collection.sourceId"),
            title = collectionMap.getString("title") ?: throw IllegalArgumentException("Missing collection.title"),
            type = collectionMap.getString("type") ?: throw IllegalArgumentException("Missing collection.type"),
            subtitle = collectionMap.optionalString("subtitle"),
            artworkUrl = collectionMap.optionalString("artworkUrl"),
            artworkImageId = collectionMap.optionalString("artworkImageId"),
        )
        val segment = input.getMap("audiobookSegment")?.let { map ->
            SamoDownloads.AudiobookSegment(
                index = if (map.hasKey("index")) map.getInt("index") else 0,
                startOffsetSeconds = if (map.hasKey("startOffsetSeconds")) map.getDouble("startOffsetSeconds") else 0.0,
                durationSeconds = if (map.hasKey("durationSeconds")) map.getDouble("durationSeconds") else null,
            )
        }
        return SamoDownloads.Entry(
            id = input.optionalString("id") ?: "",
            trackId = input.getString("trackId") ?: throw IllegalArgumentException("Missing trackId"),
            title = input.getString("title") ?: throw IllegalArgumentException("Missing title"),
            sourceUrl = input.getString("sourceUrl") ?: throw IllegalArgumentException("Missing sourceUrl"),
            trackSubtitle = input.optionalString("trackSubtitle"),
            audiobookSegment = segment,
            collection = collection,
            status = SamoDownloads.Status.Queued,
            enqueuedAt = if (input.hasKey("enqueuedAt")) input.getDouble("enqueuedAt").toLong() else 0L,
        )
    }

    private fun ReadableMap.optionalString(key: String): String? {
        if (!hasKey(key) || isNull(key)) return null
        return getString(key)
    }

    companion object {
        const val MODULE_NAME = "SamoDownloads"
        const val EVENT_REGISTRY_CHANGED = "SamoDownloadsChanged"
    }
}
