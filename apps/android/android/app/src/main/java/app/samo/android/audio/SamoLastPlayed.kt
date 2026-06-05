package app.samo.android.audio

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONException
import org.json.JSONObject

/**
 * Persists the most recently played item across launches. JS used to own this
 * via fs-storage JSON, but a JS bundle reload or a hot-restart in dev would
 * drop the unflushed write — the cause of "I closed the app and it forgot
 * what I was listening to" on the daily driver.
 *
 * SharedPreferences gives us a synchronous-read, async-write store that
 * survives bundle reloads, process death, and Doze. The payload is just the
 * `MobilePlayableAudio` shape JS already saved — we round-trip it as a JSON
 * blob without decoding it on the native side because nothing native needs to
 * read the inside today.
 */
class SamoLastPlayedModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit

    @ReactMethod
    fun load(promise: Promise) {
        val raw = prefs(reactContext).getString(KEY_ITEM, null)
        if (raw.isNullOrBlank()) {
            promise.resolve(null)
            return
        }
        try {
            promise.resolve(jsonToMap(JSONObject(raw)))
        } catch (error: JSONException) {
            // Corrupt blob — clear it so we don't keep failing on every load.
            prefs(reactContext).edit().remove(KEY_ITEM).apply()
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun save(item: ReadableMap, promise: Promise) {
        try {
            val json = mapToJson(item)
            prefs(reactContext).edit().putString(KEY_ITEM, json.toString()).apply()
            // Fan out the change so a second JS subscriber (e.g., a future
            // mini-player previewer) can react without re-reading the prefs.
            val event = Arguments.createMap()
            event.putMap("item", jsonToMap(json))
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_CHANGED, event)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("SAMO_LAST_PLAYED_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun clear(promise: Promise) {
        prefs(reactContext).edit().remove(KEY_ITEM).apply()
        promise.resolve(null)
    }

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun mapToJson(map: ReadableMap): JSONObject {
        val json = JSONObject()
        val iterator = map.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            if (map.isNull(key)) {
                json.put(key, JSONObject.NULL)
                continue
            }
            try {
                when (map.getType(key)) {
                    com.facebook.react.bridge.ReadableType.Boolean -> json.put(key, map.getBoolean(key))
                    com.facebook.react.bridge.ReadableType.Number -> json.put(key, map.getDouble(key))
                    com.facebook.react.bridge.ReadableType.String -> json.put(key, map.getString(key))
                    com.facebook.react.bridge.ReadableType.Map -> map.getMap(key)?.let { json.put(key, mapToJson(it)) }
                    com.facebook.react.bridge.ReadableType.Array -> {
                        // Last-played payload is documented as flat metadata
                        // (id, title, url, source, quality {…}) — no arrays
                        // today. Skip if we ever see one rather than carrying
                        // a recursive array converter that nothing exercises.
                        Log.w(TAG, "skipping array field in last-played payload: $key")
                    }
                    else -> {}
                }
            } catch (error: Exception) {
                Log.w(TAG, "could not serialize last-played field $key: ${error.message}")
            }
        }
        return json
    }

    private fun jsonToMap(json: JSONObject): WritableMap {
        val out = Arguments.createMap()
        val names = json.names() ?: return out
        for (i in 0 until names.length()) {
            val key = names.getString(i)
            when (val value = json.get(key)) {
                JSONObject.NULL -> out.putNull(key)
                is Boolean -> out.putBoolean(key, value)
                is Int -> out.putInt(key, value)
                is Long -> out.putDouble(key, value.toDouble())
                is Double -> out.putDouble(key, value)
                is String -> out.putString(key, value)
                is JSONObject -> out.putMap(key, jsonToMap(value))
                else -> out.putString(key, value.toString())
            }
        }
        return out
    }

    companion object {
        const val MODULE_NAME = "SamoLastPlayed"
        const val EVENT_CHANGED = "SamoLastPlayedChanged"
        private const val PREFS_NAME = "samo.android.last-played"
        private const val KEY_ITEM = "item"
        private const val TAG = "SamoLastPlayed"
    }
}
