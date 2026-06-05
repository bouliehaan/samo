package app.samo.android.audio

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.net.URLEncoder
import java.net.UnknownHostException
import java.util.concurrent.Executors

/**
 * Native Samo stream URL operations. The engine asks two things of this:
 *
 *  1. "Give me a usable URL for this queue item." — at every play(), and every
 *     auto-advance. Always mints a fresh stream token so the player never gets
 *     handed a 30-minute-old URL that will 401 ten seconds later.
 *
 *  2. "I got a 401 on this URL; mint a new token and give me a new URL." — used
 *     by recovery on auth-class errors. Token expiry mid-track is the canonical
 *     symptom that motivated this entire flow.
 *
 * Failure modes are classified rather than silently returning the original URL.
 * That used to be the load-bearing band-aid behind the "podcast dies in the
 * pocket" bug: the original URL's token was already stale, so handing it back
 * to ExoPlayer just produced the same 401 → reconnect loop → give up cycle.
 * The caller now sees [RefreshResult.MintFailed] and can choose to wait on the
 * network monitor instead of burning attempts.
 *
 * Phase 2 PROPER: when the queue item carries `samoProgressKind` +
 * `samoProgressTargetId`, this object builds the stream + artwork URLs from
 * scratch (instead of just replacing the `stream_token` query param on the
 * JS-built URL). That lets the catalog reader pick the freshest artwork target
 * — e.g. a music track's CURRENT album cover — and survives a stale URL on a
 * long-resident queue item.
 */
internal object SamoNativeStreamUrl {
    private const val TAG = "SamoNativeStream"
    private val refreshExecutor = Executors.newSingleThreadExecutor()

    enum class MintFailureReason {
        /** Could not reach the server (DNS, connect, read timeout). */
        Network,

        /** Server responded with 401/403 — the stored bearer token is bad. */
        Auth,

        /** Server responded with 5xx or unexpected body shape. */
        Server,

        /** The item doesn't carry the credentials needed for native refresh. */
        MissingCredentials,
    }

    sealed class RefreshResult {
        /** URL was refreshed (or already fresh) and is safe to hand to ExoPlayer. */
        data class Ready(val item: HashMap<String, Any?>) : RefreshResult()

        /** Refresh failed. The original item is included for callers that
         *  want to bubble back to JS with the legacy URL — but the recovery
         *  layer should NOT just play the original; it should react to
         *  [reason]. */
        data class MintFailed(
            val reason: MintFailureReason,
            val originalItem: HashMap<String, Any?>,
        ) : RefreshResult()

        /** This URL is not a Samo stream URL; pass through unchanged (radio,
         *  offline file, etc.). */
        data class NotApplicable(val item: HashMap<String, Any?>) : RefreshResult()
    }

    fun refreshQueueItemAsync(
        context: Context,
        item: HashMap<String, Any?>,
        onResult: (RefreshResult) -> Unit,
    ) {
        refreshExecutor.execute {
            onResult(refreshQueueItem(context, item))
        }
    }

    fun refreshQueueItem(context: Context, item: HashMap<String, Any?>): RefreshResult {
        val serverUrl = item.optionalString("serverUrl")
        val bearer = item.optionalString("serverBearerToken")
        val kind = item.optionalString("samoProgressKind")
        val targetId = item.optionalString("samoProgressTargetId")

        // Phase 2 PROPER: when the item carries the kind + target id, build the
        // URL from scratch instead of patching a JS-supplied URL. This is the
        // native authoritative path — survives a stale `url`, picks the
        // freshest artwork target via the catalog, and doesn't need the JS
        // payload's `url` field at all (though we still honor it as a fallback
        // when minting the new URL succeeds but the catalog can't resolve
        // artwork).
        if (!serverUrl.isNullOrBlank() && !bearer.isNullOrBlank() && kind != null && targetId != null) {
            return buildFromKindAndTarget(context, item, serverUrl, bearer, kind, targetId)
        }

        // Fallback: token-substitution on a JS-supplied URL. This is the path
        // radio / non-Samo / pre-Phase-2-PROPER items take.
        val url = item.optionalString("url") ?: return RefreshResult.NotApplicable(item)
        if (!isSamoStreamUrl(url)) {
            return RefreshResult.NotApplicable(item)
        }

        if (serverUrl.isNullOrBlank() || bearer.isNullOrBlank()) {
            Log.w(
                TAG,
                "missing native stream credentials for ${item.optionalString("id")}",
            )
            return RefreshResult.MintFailed(MintFailureReason.MissingCredentials, item)
        }

        return when (val mint = mintStreamToken(serverUrl, bearer)) {
            is MintResult.Success -> {
                val refreshed = HashMap(item)
                refreshed["url"] = replaceStreamToken(url, mint.token)
                item.optionalString("castUrl")?.let { castUrl ->
                    if (isSamoStreamUrl(castUrl)) {
                        refreshed["castUrl"] = replaceStreamToken(castUrl, mint.token)
                    }
                }
                item.optionalString("artworkUrl")?.let { artworkUrl ->
                    if (isSamoStreamUrl(artworkUrl)) {
                        refreshed["artworkUrl"] = replaceStreamToken(artworkUrl, mint.token)
                    }
                }
                RefreshResult.Ready(refreshed)
            }
            is MintResult.Failed -> RefreshResult.MintFailed(mint.reason, item)
        }
    }

    /**
     * Re-mints a token for an URL that's already known to be Samo and known to
     * have failed with an auth error. Returns the URL with the new token if
     * we got one, or a classified failure otherwise.
     */
    fun refreshUrlAuthAsync(
        url: String,
        serverUrl: String?,
        bearer: String?,
        onResult: (RefreshResult) -> Unit,
    ) {
        refreshExecutor.execute {
            if (!isSamoStreamUrl(url)) {
                val item = HashMap<String, Any?>().apply { put("url", url) }
                onResult(RefreshResult.NotApplicable(item))
                return@execute
            }
            if (serverUrl.isNullOrBlank() || bearer.isNullOrBlank()) {
                val item = HashMap<String, Any?>().apply { put("url", url) }
                onResult(
                    RefreshResult.MintFailed(MintFailureReason.MissingCredentials, item),
                )
                return@execute
            }
            when (val mint = mintStreamToken(serverUrl, bearer)) {
                is MintResult.Success -> {
                    val item = HashMap<String, Any?>().apply {
                        put("url", replaceStreamToken(url, mint.token))
                    }
                    onResult(RefreshResult.Ready(item))
                }
                is MintResult.Failed -> {
                    val item = HashMap<String, Any?>().apply { put("url", url) }
                    onResult(RefreshResult.MintFailed(mint.reason, item))
                }
            }
        }
    }

    /** True when [url] looks like a Samo `/api/v1/…` stream URL. */
    fun isSamoStreamUrl(url: String): Boolean =
        try {
            URL(url).path.contains("/api/v1/")
        } catch (_: Exception) {
            false
        }

    // -----------------------------------------------------------------------
    // Phase 2 PROPER: native URL builders.
    //
    // These mirror the JS builders in `packages/core/src/server/server-samo.ts`
    // exactly — same paths, same query-param shape, same encodeURIComponent
    // semantics. The on-server route table is the contract; both sides must
    // agree.
    // -----------------------------------------------------------------------

    /**
     * `${serverUrl}/api/v1/music/tracks/{trackId}/stream?stream_token=…`
     */
    fun buildMusicTrackStreamUrl(serverUrl: String, trackId: String, token: String): String =
        buildStreamUrl(serverUrl, "/music/tracks/${encodeSamoId(trackId)}/stream", token)

    /**
     * `${serverUrl}/api/v1/audiobooks/{bookId}/stream?mediaFileId=…&offsetSeconds=…&stream_token=…`
     *
     * `bookId` is the audiobook id; `mediaFileId` picks which file in the
     * per-book manifest is being streamed. The JS player owns the file
     * iteration (the queue carries one item per file), so this builder is the
     * inverse of `buildSamoAudiobookQueueFromFiles` in mobile-playback.ts.
     */
    fun buildAudiobookStreamUrl(
        serverUrl: String,
        bookId: String,
        token: String,
        mediaFileId: String? = null,
        offsetSeconds: Long? = null,
        progressSeconds: Long? = null,
        disc: Int? = null,
    ): String =
        buildStreamUrl(
            serverUrl,
            // Audiobook ids are server-assigned UUIDs / ULIDs — no encoding
            // needed but we encode for parity with the JS builder (which uses
            // the raw value because the JS builder accepts the same shape).
            "/audiobooks/$bookId/stream",
            token,
            extraQuery = buildMap {
                if (mediaFileId != null) put("mediaFileId", mediaFileId)
                if (offsetSeconds != null) put("offsetSeconds", offsetSeconds.toString())
                if (progressSeconds != null) put("progressSeconds", progressSeconds.toString())
                if (disc != null) put("disc", disc.toString())
            },
        )

    /**
     * `${serverUrl}/api/v1/podcasts/episodes/{episodeId}/stream?stream_token=…`
     */
    fun buildPodcastEpisodeStreamUrl(serverUrl: String, episodeId: String, token: String): String =
        buildStreamUrl(serverUrl, "/podcasts/episodes/$episodeId/stream", token)

    /**
     * `${serverUrl}/api/v1/music/albums/{albumId}/cover?stream_token=…`
     */
    fun buildMusicAlbumCoverUrl(serverUrl: String, albumId: String, token: String): String =
        buildStreamUrl(serverUrl, "/music/albums/${encodeSamoId(albumId)}/cover", token)

    /**
     * `${serverUrl}/api/v1/audiobooks/{bookId}/cover?stream_token=…`
     */
    fun buildAudiobookCoverUrl(serverUrl: String, bookId: String, token: String): String =
        buildStreamUrl(serverUrl, "/audiobooks/$bookId/cover", token)

    /**
     * `${serverUrl}/api/v1/podcasts/shows/{showId}/cover?stream_token=…`
     */
    fun buildPodcastShowCoverUrl(serverUrl: String, showId: String, token: String): String =
        buildStreamUrl(serverUrl, "/podcasts/shows/$showId/cover", token)

    /**
     * `${serverUrl}/api/v1/media/images/{imageId}/image?stream_token=…`
     *
     * Higher-fidelity than the entity-cover routes when the catalog has a
     * scanned metadata image id (`image_*`) — the cover routes return the
     * entity's downscaled cover blob.
     */
    fun buildMetadataImageUrl(serverUrl: String, imageId: String, token: String): String =
        buildStreamUrl(serverUrl, "/media/images/${encodeSamoId(imageId)}/image", token)

    /**
     * Resolve a fresh artwork URL for a queue item, preferring the catalog's
     * metadata image when present and falling back to the entity cover route
     * by kind. Returns null when the catalog can't resolve anything — callers
     * should then keep the JS-supplied artwork URL with a refreshed token.
     */
    fun buildArtworkUrlForKind(
        context: Context,
        serverUrl: String,
        contentSourceId: String,
        kind: String,
        targetId: String,
        token: String,
    ): String? {
        return when (kind) {
            "music-track" -> {
                // Track-level metadata image wins (per-track embedded art); else
                // the album cover; else null.
                SamoCatalogDb.findArtworkImageIdForTrack(context, contentSourceId, targetId)
                    ?.let { return buildMetadataImageUrl(serverUrl, it, token) }
                val albumId = SamoCatalogDb.findAlbumIdForTrack(context, contentSourceId, targetId)
                if (albumId != null) buildMusicAlbumCoverUrl(serverUrl, albumId, token) else null
            }
            "audiobook" -> {
                // Audiobook cover is a known entity route — no catalog lookup
                // required. The catalog metadata image (when present) wins on
                // a re-scan, so we still consult it.
                SamoCatalogDb.findArtworkImageIdForItem(context, contentSourceId, "audiobook", targetId)
                    ?.let { return buildMetadataImageUrl(serverUrl, it, token) }
                buildAudiobookCoverUrl(serverUrl, targetId, token)
            }
            "podcast-episode" -> {
                // Podcast covers live on the SHOW, not the episode. Look up the
                // owning show id from the catalog; fall back to null when the
                // episode isn't mirrored locally (rare — the JS payload's
                // artwork URL still has the show id baked in for that case).
                val showId = SamoCatalogDb.findContainerIdForTrack(
                    context,
                    contentSourceId,
                    containerType = "podcast",
                    trackId = targetId,
                )
                if (showId != null) buildPodcastShowCoverUrl(serverUrl, showId, token) else null
            }
            else -> null
        }
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    private fun buildFromKindAndTarget(
        context: Context,
        item: HashMap<String, Any?>,
        serverUrl: String,
        bearer: String,
        kind: String,
        targetId: String,
    ): RefreshResult {
        val mint = mintStreamToken(serverUrl, bearer)
        if (mint is MintResult.Failed) {
            return RefreshResult.MintFailed(mint.reason, item)
        }
        val token = (mint as MintResult.Success).token

        val streamUrl = buildStreamUrlForItem(item, serverUrl, kind, targetId, token)
            ?: run {
                // Couldn't build a stream URL for this kind — fall back to
                // patching the JS-supplied URL (if it's a Samo URL).
                return refreshExistingUrlsWithToken(item, token)
            }

        val refreshed = HashMap(item)
        refreshed["url"] = streamUrl

        // Cast URL: when the JS layer set a separate castUrl (e.g. for
        // audiobookshelf cross-server flows) we leave it alone; otherwise mirror
        // the new stream URL to it so Chromecast also benefits.
        val existingCast = item.optionalString("castUrl")
        if (existingCast != null && isSamoStreamUrl(existingCast)) {
            // Cast leg is the same stream — refresh by rebuilding from scratch.
            refreshed["castUrl"] = streamUrl
        }

        val contentSourceId = item.optionalString("contentSourceId").orEmpty()
        val artworkUrl =
            if (contentSourceId.isNotBlank()) {
                buildArtworkUrlForKind(context, serverUrl, contentSourceId, kind, targetId, token)
            } else {
                null
            }
        if (artworkUrl != null) {
            refreshed["artworkUrl"] = artworkUrl
        } else {
            // Catalog miss / unsupported kind. Keep the JS-supplied artwork
            // URL but freshen its token so it doesn't 401 in 30 min.
            item.optionalString("artworkUrl")?.let { existing ->
                if (isSamoStreamUrl(existing)) {
                    refreshed["artworkUrl"] = replaceStreamToken(existing, token)
                }
            }
        }

        return RefreshResult.Ready(refreshed)
    }

    /**
     * Build the stream URL for a queue item given its kind + target id. Returns
     * null for unsupported kinds (radio, etc.) so the caller can fall back.
     */
    private fun buildStreamUrlForItem(
        item: HashMap<String, Any?>,
        serverUrl: String,
        kind: String,
        targetId: String,
        token: String,
    ): String? =
        when (kind) {
            "music-track" -> buildMusicTrackStreamUrl(serverUrl, targetId, token)
            "audiobook" -> {
                // Audiobook items in the queue carry the per-file media id in
                // the playback id: `…:audiobook:<bookId>:file:<mediaFileId>`.
                // Parse it so the per-file URL stays accurate across the
                // whole-file-streaming path.
                val playbackId = item.optionalString("id").orEmpty()
                val mediaFileId = parseAudiobookMediaFileId(playbackId)
                val initialPosition =
                    (item["initialPositionSeconds"] as? Number)?.toLong()
                buildAudiobookStreamUrl(
                    serverUrl,
                    targetId,
                    token,
                    mediaFileId = mediaFileId,
                    // Whole-file serving means the player owns seeking; only
                    // the initialPositionSeconds on a fresh queue start has any
                    // meaning, and that's a local-only concern (not a server
                    // offset). The legacy offsetSeconds/progressSeconds query
                    // params are NOT forwarded — pre-Phase-2-PROPER queue
                    // payloads carried them in `url` and that was the bug we
                    // fixed in the audiobook rework. The catalog payload
                    // doesn't need them.
                    offsetSeconds = null,
                    progressSeconds = null,
                )
            }
            "podcast-episode" -> buildPodcastEpisodeStreamUrl(serverUrl, targetId, token)
            else -> null
        }

    private fun refreshExistingUrlsWithToken(
        item: HashMap<String, Any?>,
        token: String,
    ): RefreshResult {
        val url = item.optionalString("url") ?: return RefreshResult.NotApplicable(item)
        if (!isSamoStreamUrl(url)) {
            return RefreshResult.NotApplicable(item)
        }
        val refreshed = HashMap(item)
        refreshed["url"] = replaceStreamToken(url, token)
        item.optionalString("castUrl")?.let { castUrl ->
            if (isSamoStreamUrl(castUrl)) {
                refreshed["castUrl"] = replaceStreamToken(castUrl, token)
            }
        }
        item.optionalString("artworkUrl")?.let { artworkUrl ->
            if (isSamoStreamUrl(artworkUrl)) {
                refreshed["artworkUrl"] = replaceStreamToken(artworkUrl, token)
            }
        }
        return RefreshResult.Ready(refreshed)
    }

    /**
     * Build a complete `/api/v1<path>?…&stream_token=<token>` URL. Public to
     * the module so SamoCatalogConverters can mint cover URLs for endpoints
     * that don't have a dedicated builder (e.g. artist / playlist covers).
     */
    internal fun buildStreamUrl(
        serverUrl: String,
        path: String,
        token: String,
        extraQuery: Map<String, String> = emptyMap(),
    ): String {
        val base = serverUrl.trimEnd('/')
        val builder = StringBuilder("$base/api/v1$path")
        builder.append('?')
        for ((key, value) in extraQuery) {
            builder.append(encodeQueryComponent(key))
                .append('=')
                .append(encodeQueryComponent(value))
                .append('&')
        }
        builder.append("stream_token=").append(encodeQueryComponent(token))
        return builder.toString()
    }

    /**
     * Mirror of `encodeURIComponent`: encodes everything except
     * `A-Z a-z 0-9 - _ . ! ~ * ' ( )`. `URLEncoder.encode` is form-urlencoded
     * (spaces → +, ! / ' / ( ) / ~ / * escaped) so we patch those back to
     * keep IDs byte-for-byte identical to what the server's route matcher and
     * the JS builder produce.
     *
     * Visible (internal) so the JUnit suite in src/test can lock the byte-
     * equivalence against `encodeURIComponent` for every reserved character —
     * this is the only place URL encoding could quietly drift away from JS,
     * and a drift would surface as a silent 404 on the stream URL.
     */
    internal fun encodeSamoId(id: String): String =
        URLEncoder.encode(id, Charsets.UTF_8.name())
            .replace("+", "%20")
            .replace("%21", "!")
            .replace("%27", "'")
            .replace("%28", "(")
            .replace("%29", ")")
            .replace("%2A", "*")
            .replace("%7E", "~")

    /** Same shape as encodeSamoId; named for the call-site intent. */
    private fun encodeQueryComponent(value: String): String = encodeSamoId(value)

    /**
     * Pull the per-file id out of an audiobook playback id of the form
     * `<auth>:audiobook:<bookId>:file:<mediaFileId>`. Returns null for the
     * single-file form (`<auth>:audiobook:<bookId>`).
     */
    private fun parseAudiobookMediaFileId(playbackId: String): String? {
        val marker = ":file:"
        val idx = playbackId.lastIndexOf(marker)
        if (idx < 0) return null
        val rest = playbackId.substring(idx + marker.length)
        return rest.ifBlank { null }
    }

    private sealed class MintResult {
        data class Success(val token: String) : MintResult()
        data class Failed(val reason: MintFailureReason) : MintResult()
    }

    private fun mintStreamToken(serverUrl: String, bearer: String): MintResult {
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
                if (status in 200..299) connection.inputStream else connection.errorStream
            val body = bodyStream?.bufferedReader()?.use { it.readText() }.orEmpty()

            if (status == 401 || status == 403) {
                Log.w(TAG, "stream-token rejected: HTTP $status: $body")
                return MintResult.Failed(MintFailureReason.Auth)
            }
            if (status !in 200..299) {
                Log.w(TAG, "stream-token HTTP $status: $body")
                return MintResult.Failed(MintFailureReason.Server)
            }

            val token = JSONObject(body).optString("token")
            if (token.isNullOrBlank()) {
                Log.w(TAG, "stream-token response missing token")
                return MintResult.Failed(MintFailureReason.Server)
            }
            return MintResult.Success(token)
        } catch (error: UnknownHostException) {
            return MintResult.Failed(MintFailureReason.Network)
        } catch (error: SocketTimeoutException) {
            return MintResult.Failed(MintFailureReason.Network)
        } catch (error: IOException) {
            return MintResult.Failed(MintFailureReason.Network)
        } catch (error: Exception) {
            Log.w(TAG, "stream-token unexpected failure", error)
            return MintResult.Failed(MintFailureReason.Server)
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
