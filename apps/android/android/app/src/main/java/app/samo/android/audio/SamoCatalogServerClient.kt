package app.samo.android.audio

import android.util.Log
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.net.URLEncoder
import java.net.UnknownHostException

/**
 * Native HTTP client for the Samo catalog endpoints used by Phase 5's
 * background sync. Mirrors the JS-side `loadMobileFullCollection` /
 * `loadSamoLibraryTracks` / `fetchSamoSyncManifest` paths but stays out of
 * the React bridge — these calls run from a CoroutineWorker against the
 * Kotlin-mirrored auth credentials.
 *
 * Pagination matches the server contract: each list endpoint returns
 * `{ data: [...], total, hasMore }`; we walk pages until `data` is empty or
 * `hasMore` is false. Failures classify into Network / Auth / Server so the
 * orchestrator can decide whether to retry, skip, or mark the source errored.
 */
internal object SamoCatalogServerClient {
    private const val TAG = "SamoCatalogClient"
    private const val PAGE_LIMIT = 200
    private const val CONNECT_TIMEOUT_MS = 15_000
    private const val READ_TIMEOUT_MS = 30_000
    private const val MAX_PAGES = 1_000 // 200K rows hard cap; safety net

    enum class FailureKind { Network, Auth, Server }

    class FetchException(val kind: FailureKind, message: String, cause: Throwable? = null) :
        Exception(message, cause)

    /**
     * Mint a fresh stream token for [auth]. Returns null on transient failure
     * — the orchestrator can proceed without it (artwork URLs degrade to the
     * un-tokenized form, still serviceable for the next 30 min until
     * tokens come back online).
     */
    fun mintStreamToken(auth: SamoAuthMirror.Connection): String? =
        try {
            val endpoint = "${auth.url.trimEnd('/')}/api/v1/auth/stream-token"
            val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                setRequestProperty("Authorization", "Bearer ${auth.credential}")
                setRequestProperty("Accept", "application/json")
            }
            try {
                val status = conn.responseCode
                if (status !in 200..299) {
                    Log.w(TAG, "stream-token HTTP $status")
                    null
                } else {
                    val body = conn.inputStream.bufferedReader().use { it.readText() }
                    JSONObject(body).optString("token").nullIfBlankInternal()
                }
            } finally {
                conn.disconnect()
            }
        } catch (error: Throwable) {
            Log.w(TAG, "stream-token failed", error)
            null
        }

    /**
     * Fetch the manifest: every current entity id per type, plus the server
     * clock used as the delta watermark on the next sync.
     */
    fun fetchManifest(auth: SamoAuthMirror.Connection): JSONObject {
        val body = getJson(auth, "/catalog/sync/manifest", emptyMap())
        return body as? JSONObject
            ?: throw FetchException(FailureKind.Server, "manifest response not an object")
    }

    /**
     * Pull every page of a list endpoint, optionally filtered by
     * `updatedSince`. Returns the flattened `data` array. Pages of 200; safe
     * for 100K+ row libraries (capped at MAX_PAGES so a runaway server can't
     * spin forever).
     */
    fun fetchAllPages(
        auth: SamoAuthMirror.Connection,
        path: String,
        updatedSince: String? = null,
        extraQuery: Map<String, String> = emptyMap(),
    ): List<JSONObject> {
        val accumulator = mutableListOf<JSONObject>()
        var offset = 0
        var pageIndex = 0
        while (pageIndex < MAX_PAGES) {
            val query = HashMap<String, String>(extraQuery).apply {
                put("limit", PAGE_LIMIT.toString())
                put("offset", offset.toString())
                if (!updatedSince.isNullOrBlank()) put("updatedSince", updatedSince)
            }
            val body = getJson(auth, path, query)
            val data: JSONArray = when (body) {
                is JSONObject -> body.optJSONArray("data") ?: JSONArray()
                is JSONArray -> body // a few endpoints return a bare array
                else -> throw FetchException(FailureKind.Server, "$path: unexpected body shape")
            }
            if (data.length() == 0) break
            for (i in 0 until data.length()) {
                val record = data.optJSONObject(i) ?: continue
                accumulator.add(record)
            }
            val hasMore = (body as? JSONObject)?.optBoolean("hasMore", data.length() == PAGE_LIMIT)
                ?: (data.length() == PAGE_LIMIT)
            if (!hasMore) break
            offset += data.length()
            pageIndex += 1
        }
        return accumulator
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    /**
     * Single-page GET that returns the JSON body. Used by [fetchManifest]
     * and (via [fetchAllPages]) all the list endpoints. Throws
     * [FetchException] on the classified failure modes so the orchestrator
     * can react.
     */
    private fun getJson(
        auth: SamoAuthMirror.Connection,
        path: String,
        query: Map<String, String>,
    ): Any {
        val url = buildUrl(auth.url, path, query)
        val conn = try {
            (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                setRequestProperty("Authorization", "Bearer ${auth.credential}")
                setRequestProperty("Accept", "application/json")
            }
        } catch (error: UnknownHostException) {
            throw FetchException(FailureKind.Network, "DNS failed for $path", error)
        } catch (error: IOException) {
            throw FetchException(FailureKind.Network, "open failed for $path", error)
        }

        try {
            val status = try {
                conn.responseCode
            } catch (error: SocketTimeoutException) {
                throw FetchException(FailureKind.Network, "timeout on $path", error)
            } catch (error: UnknownHostException) {
                throw FetchException(FailureKind.Network, "DNS failed for $path", error)
            } catch (error: IOException) {
                throw FetchException(FailureKind.Network, "read failed for $path", error)
            }
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val raw = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (status == 401 || status == 403) {
                throw FetchException(FailureKind.Auth, "$path: HTTP $status")
            }
            if (status !in 200..299) {
                throw FetchException(FailureKind.Server, "$path: HTTP $status — ${raw.take(200)}")
            }
            return try {
                // Try object first; if it's an array, parse as one.
                JSONObject(raw)
            } catch (_: JSONException) {
                try {
                    JSONArray(raw)
                } catch (error: JSONException) {
                    throw FetchException(FailureKind.Server, "$path: malformed JSON", error)
                }
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun buildUrl(serverUrl: String, path: String, query: Map<String, String>): String {
        val base = serverUrl.trimEnd('/')
        val apiPath = if (path.startsWith("/api/v1")) path
        else "/api/v1${if (path.startsWith('/')) "" else "/"}$path"

        if (query.isEmpty()) return "$base$apiPath"
        val qs = query.entries.joinToString("&") { (k, v) ->
            "${URLEncoder.encode(k, "UTF-8")}=${URLEncoder.encode(v, "UTF-8")}"
        }
        return "$base$apiPath?$qs"
    }
}

private fun String?.nullIfBlankInternal(): String? =
    if (this.isNullOrBlank() || this == "null") null else this
