package app.samo.android.audio

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.ResolvingDataSource

/**
 * Wraps the playback [DataSource.Factory] so every MUSIC track ExoPlayer loads
 * gets a FRESH Samo stream token minted at the moment its DataSource is opened.
 *
 * This is the piece that makes a multi-hour, screen-off music queue work. When
 * the whole queue is loaded into ExoPlayer as a real playlist, ExoPlayer
 * pre-buffers each upcoming item and opens its DataSource shortly before it
 * plays — on its own loader thread, with the foreground service holding the
 * wake lock. Minting here means:
 *
 *   - the token is always fresh when the track actually starts, so a token
 *     minted at queue-build time can never expire mid-queue (the 6-hour case);
 *   - zero JavaScript is involved between tracks, so Doze freezing the RN
 *     thread is irrelevant;
 *   - an error-retry re-opens the source, which re-enters this resolver and
 *     mints again — so a transient auth/network failure self-heals.
 *
 * Scoped to discrete-file Samo tracks: music (`/music/tracks/.../stream`) and
 * podcast episodes (`/podcasts/episodes/.../stream`). Audiobook (often HLS with
 * many per-segment requests), radio, and offline file URIs pass through
 * untouched so this can't regress the long-form / streaming paths.
 */
@UnstableApi
internal object SamoResolvingDataSource {
    private const val TAG = "SamoResolvingDS"

    /** Wrap [upstream] so each music track gets a freshly-minted token at load. */
    fun wrap(context: Context, upstream: DataSource.Factory): DataSource.Factory {
        val appContext = context.applicationContext
        return ResolvingDataSource.Factory(upstream) { dataSpec: DataSpec ->
            resolve(appContext, dataSpec)
        }
    }

    private fun isResolvableTrackUri(uri: String): Boolean =
        SamoNativeStreamUrl.isSamoStreamUrl(uri) &&
            (uri.contains("/music/tracks/") || uri.contains("/podcasts/episodes/"))

    private fun resolve(context: Context, dataSpec: DataSpec): DataSpec {
        val uri = dataSpec.uri.toString()
        if (!isResolvableTrackUri(uri)) {
            return dataSpec
        }

        val connection = SamoAuthMirror.loadSamo(context).firstOrNull { uri.startsWith(it.url) }
        if (connection == null) {
            // No mirrored credentials for this server (fresh install, JS hasn't
            // pushed yet). Use the URI's existing token — it may still be valid.
            Log.w(TAG, "no mirrored Samo credentials for music stream; using existing token")
            return dataSpec
        }

        val item = HashMap<String, Any?>().apply {
            put("url", uri)
            put("serverUrl", connection.url)
            put("serverBearerToken", connection.credential)
        }

        return when (val result = SamoNativeStreamUrl.refreshQueueItem(context, item)) {
            is SamoNativeStreamUrl.RefreshResult.Ready -> {
                val fresh = result.item["url"] as? String
                if (fresh.isNullOrBlank() || fresh == uri) {
                    dataSpec
                } else {
                    dataSpec.withUri(Uri.parse(fresh))
                }
            }
            is SamoNativeStreamUrl.RefreshResult.MintFailed -> {
                // Offline / server error. Keep the existing token; the recovery
                // layer re-opens on failure, which re-enters this resolver.
                Log.w(TAG, "music token mint failed (${result.reason}); using existing token")
                dataSpec
            }
            is SamoNativeStreamUrl.RefreshResult.NotApplicable -> dataSpec
        }
    }
}
