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
 *
 * It is also native's only answer to "which sessions does this device hold
 * right now?", which everything that stored a credential for later asks
 * before using it ([SamoSessionCredentials]). That makes a missing file mean
 * something: JS writes the mirror on every sign-in and on every launch that
 * has a session, and deletes it on every sign-out, so no file is signed out,
 * not "unknown".
 */
internal object SamoAuthMirror {
    private const val TAG = "SamoAuthMirror"
    private const val FILE_NAME = "samo-auth-mirror.v1.json"

    data class Connection(
        val type: String,
        val url: String,
        val credential: String,
        val ndCredential: String?,
        /**
         * The key JS files this connection's local state under, pushed verbatim.
         *
         * The sync used to derive its own key as `type:url`, which agreed with
         * JS only by coincidence — and stopped agreeing the moment a server was
         * reachable at more than one address. Every row this engine writes is
         * read back by JS under ITS key, so the key has to travel with the
         * connection rather than be re-derived from a field that can change.
         * Null for a mirror written by an older build; see [key].
         */
        val connectionKey: String?,
    ) {
        /** The sourceId every mirror row is written under. Falls back to the
         *  address-derived form only for a mirror that predates the field —
         *  which is exactly what JS pins for those same connections. */
        val key: String get() = connectionKey?.takeIf { it.isNotBlank() }
            ?: "$type:${url.trimEnd('/')}"
    }

    /** The Samo sessions the device holds, as far as it can tell. */
    sealed interface Sessions {
        /** Every Samo session the device holds. Empty when it is signed out. */
        data class Known(val connections: List<Connection>) : Sessions

        /**
         * A mirror exists but cannot be read, so the device cannot say which
         * sessions it holds — the one state in which a record's own copy of
         * its credential is still worth trying.
         */
        object Unreadable : Sessions
    }

    // Read on every stream open, progress write and download attempt, from
    // the main thread as often as not, so it is served from memory. Only this
    // process writes the file, and every write goes through [adopt].
    @Volatile private var snapshot: Sessions? = null
    private val snapshotLock = Any()

    fun sessions(context: Context): Sessions {
        snapshot?.let { return it }
        return synchronized(snapshotLock) {
            snapshot ?: readSessions(context).also { snapshot = it }
        }
    }

    /** The Samo connections the device holds; empty when signed out or unreadable. */
    fun loadSamo(context: Context): List<Connection> =
        (sessions(context) as? Sessions.Known)?.connections.orEmpty()

    private fun readSessions(context: Context): Sessions {
        val file = File(context.filesDir, FILE_NAME)
        if (!file.exists()) return Sessions.Known(emptyList())
        val text = try {
            file.readText()
        } catch (error: Exception) {
            Log.w(TAG, "auth mirror read failed", error)
            return Sessions.Unreadable
        }
        return parse(text).also { parsed ->
            if (parsed is Sessions.Unreadable) Log.w(TAG, "auth mirror is malformed")
        }
    }

    /** The mirror file's contents as sessions. Samo rows only; a row that
     *  cannot authenticate anything is not a session. */
    internal fun parse(text: String): Sessions {
        val array = try {
            JSONArray(text)
        } catch (_: JSONException) {
            return Sessions.Unreadable
        }
        val connections = (0 until array.length()).mapNotNull { i ->
            val obj = array.optJSONObject(i) ?: return@mapNotNull null
            val type = obj.optString("type").takeIf { it.isNotBlank() }
                ?: return@mapNotNull null
            val url = obj.optString("url").takeIf { it.isNotBlank() }
                ?: return@mapNotNull null
            val credential = obj.optString("credential").takeIf { it.isNotBlank() }
                ?: return@mapNotNull null
            val nd = obj.optString("ndCredential").takeIf { it.isNotBlank() }
            val connectionKey = obj.optString("connectionKey").takeIf { it.isNotBlank() }
            Connection(type, url, credential, nd, connectionKey)
        }.filter { it.type == "samo" }
        return Sessions.Known(connections)
    }

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
            if (item.hasKey("connectionKey") && !item.isNull("connectionKey")) {
                item.getString("connectionKey")?.let { obj.put("connectionKey", it) }
            }
            array.put(obj)
        }
        val text = array.toString()
        saveJson(context, text)
        adopt(context, parse(text))
    }

    internal fun clear(context: Context) {
        File(context.filesDir, FILE_NAME).delete()
        adopt(context, Sessions.Known(emptyList()))
    }

    /** Make [sessions] the answer from now on, and let everything holding a
     *  record for some server re-check it against the new one. */
    private fun adopt(context: Context, sessions: Sessions) {
        synchronized(snapshotLock) { snapshot = sessions }
        SamoSessionCredentials.onSessionsChanged(context.applicationContext, sessions)
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
