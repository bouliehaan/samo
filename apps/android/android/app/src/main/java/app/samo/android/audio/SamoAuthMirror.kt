package app.samo.android.audio

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File

/**
 * Kotlin-readable mirror of the JS-side Samo server connections. The
 * Phase 5 background catalog sync needs `{type, url, credential}` to mint
 * stream tokens + hit the delta endpoints; that data lives in expo-secure-
 * store on the JS side, which Kotlin can't decrypt without re-implementing
 * the entire encrypt path. Instead, JS calls [save] every time the
 * connection list changes, and we cache a plaintext JSON copy under
 * `filesDir`.
 *
 * Security profile: the file is in the app-sandboxed `filesDir`, so it's
 * only readable by this app process — the same threat boundary the
 * Phase 1/2-LITE queue payload already crosses (queue items carry the
 * bearer token unencrypted so SamoNativeStreamUrl can mint fresh tokens
 * for auto-advance). Storing it here for the BG sync is no worse.
 */
internal object SamoAuthMirror {
    private const val TAG = "SamoAuthMirror"
    private const val FILE_NAME = "samo-auth-mirror.v1.json"

    data class Connection(
        val type: String,
        val url: String,
        val credential: String,
        val ndCredential: String?,
    )

    /**
     * Load the mirrored connections from disk. Returns an empty list when the
     * mirror file is missing (fresh install, JS hasn't pushed yet) or unreadable.
     */
    fun load(context: Context): List<Connection> {
        val file = File(context.filesDir, FILE_NAME)
        if (!file.exists()) return emptyList()
        return try {
            val text = file.readText()
            val array = JSONArray(text)
            (0 until array.length()).mapNotNull { i ->
                val obj = array.optJSONObject(i) ?: return@mapNotNull null
                val type = obj.optString("type").takeIf { it.isNotBlank() }
                    ?: return@mapNotNull null
                val url = obj.optString("url").takeIf { it.isNotBlank() }
                    ?: return@mapNotNull null
                val credential = obj.optString("credential")
                    ?: return@mapNotNull null
                val nd = obj.optString("ndCredential").takeIf { it.isNotBlank() }
                Connection(type, url, credential, nd)
            }
        } catch (error: JSONException) {
            Log.w(TAG, "auth mirror is malformed", error)
            emptyList()
        } catch (error: Throwable) {
            Log.w(TAG, "auth mirror read failed", error)
            emptyList()
        }
    }

    /** Filter the loaded connections to just Samo. The other server types
     *  (Subsonic/Navidrome/Audiobookshelf) keep their live-network path. */
    fun loadSamo(context: Context): List<Connection> =
        load(context).filter { it.type == "samo" }

    private fun saveJson(context: Context, jsonText: String) {
        val target = File(context.filesDir, FILE_NAME)
        val tmp = File(context.filesDir, "$FILE_NAME.tmp")
        tmp.writeText(jsonText)
        if (!tmp.renameTo(target)) {
            // renameTo can fail on some filesystems if target exists; fall
            // back to copy + delete tmp.
            target.delete()
            if (!tmp.renameTo(target)) {
                tmp.copyTo(target, overwrite = true)
                tmp.delete()
            }
        }
    }

    internal fun saveFromReadableArray(context: Context, list: ReadableArray) {
        val array = JSONArray()
        for (i in 0 until list.size()) {
            val item = list.getMap(i) ?: continue
            val obj = JSONObject()
            item.getString("type")?.let { obj.put("type", it) }
            item.getString("url")?.let { obj.put("url", it) }
            item.getString("credential")?.let { obj.put("credential", it) }
            if (item.hasKey("ndCredential") && !item.isNull("ndCredential")) {
                item.getString("ndCredential")?.let { obj.put("ndCredential", it) }
            }
            array.put(obj)
        }
        saveJson(context, array.toString())
    }

    internal fun clear(context: Context) {
        File(context.filesDir, FILE_NAME).delete()
    }
}

/**
 * RN bridge for the auth mirror. JS calls `save(connections)` after every
 * SecureStore write so the BG worker can keep reading without a JS context.
 */
class SamoAuthMirrorModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "SamoAuthMirror"

    @ReactMethod
    fun save(connections: ReadableArray, promise: Promise) {
        try {
            SamoAuthMirror.saveFromReadableArray(reactContext, connections)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("SamoAuthMirrorSaveError", error)
        }
    }

    @ReactMethod
    fun clear(promise: Promise) {
        try {
            SamoAuthMirror.clear(reactContext)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("SamoAuthMirrorClearError", error)
        }
    }
}
