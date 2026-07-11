package app.samo.android.audio

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.TransferListener
import java.io.IOException

/**
 * Open-failure fallback for DIRECT podcast enclosure streams.
 *
 * Podcast episodes play their CDN enclosure URL directly (no server hop —
 * the win is large when the app reaches the server through a remote tunnel).
 * Enclosures can still die (moved feeds, geo blocks, TLS misconfig), so the
 * engine registers each direct URL's authenticated server-proxy twin here, and
 * this wrapper retries a failed open through the proxy with a freshly-minted
 * stream token. That covers first load AND mid-stream errors (ExoPlayer's
 * retry re-opens the source at the failing byte position, which re-enters
 * open() and falls back with the Range preserved).
 *
 * The wrapper is inert for every URL without a registered fallback — music,
 * proxy-mode podcasts, audiobooks, radio, and local files behave exactly as
 * before.
 */
@UnstableApi
internal object SamoDirectStreamFallback {
    private const val TAG = "SamoDirectFallback"
    private const val MAX_ENTRIES = 256

    internal data class Entry(
        val proxyUrl: String,
        val serverUrl: String?,
        val bearer: String?,
    )

    // Small LRU keyed by the exact direct URL set on the MediaItem — DataSpec
    // opens use that same string (redirect hops happen inside OkHttp and never
    // change the DataSpec URI).
    private val entries = object : LinkedHashMap<String, Entry>(32, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Entry>?): Boolean =
            size > MAX_ENTRIES
    }

    @Synchronized
    fun register(directUrl: String?, proxyUrl: String?, serverUrl: String?, bearer: String?) {
        if (directUrl.isNullOrBlank() || proxyUrl.isNullOrBlank() || directUrl == proxyUrl) {
            return
        }
        entries[directUrl] = Entry(proxyUrl, serverUrl, bearer)
    }

    @Synchronized
    internal fun lookup(url: String): Entry? = entries[url]

    /** Fresh-token proxy URL for a fallback open; the stale-token URL if minting fails. */
    private fun mintProxyUrl(context: Context, entry: Entry): String {
        val serverUrl = entry.serverUrl
        val bearer = entry.bearer
        if (serverUrl.isNullOrBlank() || bearer.isNullOrBlank()) {
            return entry.proxyUrl
        }
        val item = HashMap<String, Any?>().apply {
            put("url", entry.proxyUrl)
            put("serverUrl", serverUrl)
            put("serverBearerToken", bearer)
        }
        return when (val result = SamoNativeStreamUrl.refreshQueueItem(context, item)) {
            is SamoNativeStreamUrl.RefreshResult.Ready ->
                (result.item["url"] as? String) ?: entry.proxyUrl
            else -> entry.proxyUrl
        }
    }

    fun wrap(context: Context, upstream: DataSource.Factory): DataSource.Factory {
        val appContext = context.applicationContext
        return DataSource.Factory { FallbackDataSource(appContext, upstream) }
    }

    private class FallbackDataSource(
        private val context: Context,
        private val upstreamFactory: DataSource.Factory,
    ) : DataSource {
        private val listeners = mutableListOf<TransferListener>()
        private val primary: DataSource = upstreamFactory.createDataSource()
        private var fallback: DataSource? = null
        private var active: DataSource = primary

        override fun addTransferListener(transferListener: TransferListener) {
            listeners.add(transferListener)
            primary.addTransferListener(transferListener)
        }

        override fun open(dataSpec: DataSpec): Long {
            active = primary
            return try {
                primary.open(dataSpec)
            } catch (error: IOException) {
                val entry = lookup(dataSpec.uri.toString()) ?: throw error
                Log.w(
                    TAG,
                    "direct stream open failed (${error.message}); retrying via server proxy",
                )
                // The failed primary stays un-reopened; close() below closes both.
                val proxySource = upstreamFactory.createDataSource().also { source ->
                    listeners.forEach(source::addTransferListener)
                }
                fallback = proxySource
                active = proxySource
                proxySource.open(dataSpec.withUri(Uri.parse(mintProxyUrl(context, entry))))
            }
        }

        override fun read(buffer: ByteArray, offset: Int, length: Int): Int =
            active.read(buffer, offset, length)

        override fun getUri(): Uri? = active.uri

        override fun getResponseHeaders(): Map<String, List<String>> = active.responseHeaders

        override fun close() {
            try {
                primary.close()
            } finally {
                fallback?.close()
                fallback = null
                active = primary
            }
        }
    }
}
