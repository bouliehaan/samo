package app.samo.android.audio

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import android.support.v4.media.session.MediaSessionCompat
import androidx.media.app.NotificationCompat.MediaStyle
import androidx.media3.common.Player
import androidx.media3.session.CommandButton
import androidx.media3.session.MediaNotification
import androidx.media3.session.MediaSession
import androidx.palette.graphics.Palette
import app.samo.android.MainActivity
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.FutureCallback
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.MoreExecutors

/**
 * MediaNotification.Provider that gives Samo a proper "now playing" card in
 * the system shade — previous/play-pause/next controls, real artwork, and a
 * background color sampled from that artwork via Palette so the notification
 * reads like part of the album rather than a stock system tile.
 *
 * Pipeline on each createNotification() call:
 *   1. Build the base MediaStyle notification synchronously with whatever
 *      artwork + color we already have cached for the current track. This is
 *      what Media3 displays immediately — nothing is "loading"-looking.
 *   2. If the cache misses (first time we see this track, or artwork URL
 *      changed), kick off an async load through the session's BitmapLoader,
 *      run Palette on the result, cache the swatch, then call
 *      onNotificationChangedCallback so Media3 re-asks us to render — at
 *      which point the cache hits and the colored version goes out.
 *
 * Palette specifically picks `darkMuted` (and falls back through `darkVibrant`,
 * `dominant`) — "muted" being the difference between Spotify-classy and Now-
 * That's-What-I-Call-Music-2003 gaudy. The final color is darkened toward
 * black so white notification text stays readable across album art.
 */
class SamoMediaNotificationProvider(
    private val context: Context,
) : MediaNotification.Provider {

    private val mainHandler = Handler(Looper.getMainLooper())
    // Per-artwork cache. Sized small intentionally: a typical session cycles
    // through ≤ a few tracks; we don't need to cache hundreds of bitmaps.
    private val artworkCache = object : LinkedHashMap<String, ArtworkBundle>(8, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, ArtworkBundle>?): Boolean {
            return size > MAX_ARTWORK_CACHE
        }
    }
    private val inFlightLoads = mutableSetOf<String>()

    override fun createNotification(
        mediaSession: MediaSession,
        customLayout: ImmutableList<CommandButton>,
        actionFactory: MediaNotification.ActionFactory,
        onNotificationChangedCallback: MediaNotification.Provider.Callback,
    ): MediaNotification {
        val mediaNotification = buildNotification(mediaSession, actionFactory)

        // Kick off the async artwork + palette fetch only if the cache doesn't
        // already cover this artwork URL. The repaint that happens after the
        // fetch lands needs the same kind of factory we just got from Media3,
        // so it's threaded through to loadArtworkAndColor.
        val metadata =
            mediaSession.player.currentMediaItem?.mediaMetadata ?: mediaSession.player.mediaMetadata
        val artworkUri = metadata.artworkUri
        if (artworkUri != null) {
            val artworkKey = artworkUri.toString()
            if (artworkCache[artworkKey] == null && artworkKey !in inFlightLoads) {
                inFlightLoads.add(artworkKey)
                loadArtworkAndColor(
                    mediaSession = mediaSession,
                    artworkUri = artworkUri,
                    artworkKey = artworkKey,
                    actionFactory = actionFactory,
                    onNotificationChangedCallback = onNotificationChangedCallback,
                )
            }
        }
        return mediaNotification
    }

    override fun handleCustomCommand(
        session: MediaSession,
        action: String,
        extras: Bundle,
    ): Boolean {
        // We don't expose any custom buttons; Media3 routes the built-in
        // commands (play/pause/skip) through the actions in buildNotification
        // without touching this method.
        return false
    }

    /**
     * Tell Media3 about the notification channel we render through. The
     * channel itself is created by SamoPlaybackService.ensureNotificationChannel;
     * this just tells the provider its name so it doesn't try to create a
     * second one with default labels.
     */
    override fun getNotificationChannelInfo(): MediaNotification.Provider.NotificationChannelInfo {
        return MediaNotification.Provider.NotificationChannelInfo(
            NOTIFICATION_CHANNEL_ID,
            NOTIFICATION_CHANNEL_NAME,
        )
    }

    /**
     * Synchronous notification builder. Reads whatever's currently cached for
     * the track's artwork URL and produces a complete MediaStyle notification
     * (cover-art largeIcon + colorized background when available, controls
     * always). Called both from createNotification() and from the artwork
     * load callback once a new bitmap + color is ready.
     */
    private fun buildNotification(
        mediaSession: MediaSession,
        actionFactory: MediaNotification.ActionFactory,
    ): MediaNotification {
        val player = mediaSession.player
        val metadata = player.currentMediaItem?.mediaMetadata ?: player.mediaMetadata
        val artworkKey = metadata.artworkUri?.toString()
        val cached = artworkKey?.let { artworkCache[it] }
        val title = metadata.title?.toString().orEmpty()
        val artist = metadata.artist?.toString().orEmpty()
        val isPlaying = player.playWhenReady && player.playbackState != Player.STATE_IDLE

        val builder = NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
            // Android requires every notification to carry a smallIcon in the
            // top-left of the card and the status bar; you can't suppress it.
            // The Samo "S" mark generated from build/samologo.png reads as
            // brand chrome rather than a fourth phantom play control (the
            // previous android.R.drawable.ic_media_play was being mistaken for
            // an action button next to the real prev/play/next ones below).
            .setSmallIcon(app.samo.android.R.drawable.ic_notification_samo)
            .setContentTitle(title.ifEmpty { "Samo" })
            .setContentText(artist)
            // Stay ongoing while a session is alive — NOT just while actively
            // playing. Tying this to isPlaying made the notification flip to
            // dismissible on every pause AND on the brief playWhenReady dips
            // during a track change / seek; the always-on-display culls
            // non-ongoing notification icons, so the Samo mark kept vanishing
            // from the AOD. Keeping it ongoing pins the icon. Swipe-away while
            // paused still tears the whole service down via onTaskRemoved, so
            // this never leaves a stuck, undismissable card.
            .setOngoing(true)
            .setShowWhen(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(buildLaunchPendingIntent(context))

        cached?.bitmap?.let { builder.setLargeIcon(it) }
        cached?.notificationColor?.let { color ->
            builder.setColor(color)
            builder.setColorized(true)
        }

        // Order matters: setShowActionsInCompactView(0, 1, 2) indexes into
        // THIS list, so [0, 1, 2] maps to previous, play/pause, next.
        builder.addAction(
            actionFactory.createMediaAction(
                mediaSession,
                androidx.core.graphics.drawable.IconCompat.createWithResource(
                    context,
                    android.R.drawable.ic_media_previous,
                ),
                "Previous",
                Player.COMMAND_SEEK_TO_PREVIOUS,
            ),
        )
        builder.addAction(
            actionFactory.createMediaAction(
                mediaSession,
                androidx.core.graphics.drawable.IconCompat.createWithResource(
                    context,
                    if (isPlaying) android.R.drawable.ic_media_pause
                    else android.R.drawable.ic_media_play,
                ),
                if (isPlaying) "Pause" else "Play",
                Player.COMMAND_PLAY_PAUSE,
            ),
        )
        builder.addAction(
            actionFactory.createMediaAction(
                mediaSession,
                androidx.core.graphics.drawable.IconCompat.createWithResource(
                    context,
                    android.R.drawable.ic_media_next,
                ),
                "Next",
                Player.COMMAND_SEEK_TO_NEXT,
            ),
        )

        // Media3 1.10 exposes the framework MediaSession.Token via platformToken;
        // the compat MediaStyle still wants a MediaSessionCompat.Token, which
        // we get by wrapping the platform token through the static factory.
        builder.setStyle(
            MediaStyle()
                .setMediaSession(
                    MediaSessionCompat.Token.fromToken(mediaSession.platformToken),
                )
                .setShowActionsInCompactView(0, 1, 2),
        )

        return MediaNotification(NOTIFICATION_ID, builder.build())
    }

    /**
     * Fetch the artwork through the session's BitmapLoader (which uses the
     * data sources Samo already configured for ExoPlayer, so authenticated
     * Samo URLs work), run Palette to pick a dark-leaning swatch,
     * stash the result in the cache, and tell Media3 to repaint.
     */
    private fun loadArtworkAndColor(
        mediaSession: MediaSession,
        artworkUri: Uri,
        artworkKey: String,
        actionFactory: MediaNotification.ActionFactory,
        onNotificationChangedCallback: MediaNotification.Provider.Callback,
    ) {
        val bitmapFuture = mediaSession.bitmapLoader.loadBitmap(artworkUri)
        Futures.addCallback(
            bitmapFuture,
            object : FutureCallback<Bitmap> {
                override fun onSuccess(bitmap: Bitmap?) {
                    if (bitmap == null) {
                        mainHandler.post { inFlightLoads.remove(artworkKey) }
                        return
                    }
                    Palette.from(bitmap)
                        .clearFilters()
                        .maximumColorCount(24)
                        .generate { palette ->
                            val swatchColor = palette?.let { pickNotificationColor(it) }
                            mainHandler.post {
                                artworkCache[artworkKey] = ArtworkBundle(
                                    bitmap = bitmap,
                                    notificationColor = swatchColor,
                                )
                                inFlightLoads.remove(artworkKey)
                                onNotificationChangedCallback.onNotificationChanged(
                                    buildNotification(mediaSession, actionFactory),
                                )
                            }
                        }
                }

                override fun onFailure(t: Throwable) {
                    // Network or auth failure — leave the cached entry unset
                    // so the next playback attempt retries. The current
                    // notification stays without a largeIcon, which is still
                    // a valid MediaStyle, just without the artwork.
                    mainHandler.post { inFlightLoads.remove(artworkKey) }
                }
            },
            MoreExecutors.directExecutor(),
        )
    }

    /**
     * Pick a Palette swatch that reads well as a notification background.
     * Prefer dark-leaning swatches so light text stays legible; fall through
     * several Palette buckets so single-color or low-variance covers still
     * produce something usable. Final color is darkened toward black if it's
     * still on the bright side — the trick Spotify uses to keep the
     * notification looking like "the artwork's atmosphere" rather than "a
     * tile painted with the artwork's most saturated pixel".
     */
    private fun pickNotificationColor(palette: Palette): Int? {
        val swatch = palette.darkMutedSwatch
            ?: palette.darkVibrantSwatch
            ?: palette.mutedSwatch
            ?: palette.dominantSwatch
            ?: return null
        return darkenForNotification(swatch.rgb)
    }

    /**
     * Mix the input color toward pure black until its perceptual luminance is
     * comfortably below the mid-tone where Android starts switching to dark
     * text in colorized notifications. Keeps the cover-art hue, kills the
     * brightness.
     */
    private fun darkenForNotification(color: Int): Int {
        val r = (color shr 16) and 0xff
        val g = (color shr 8) and 0xff
        val b = color and 0xff
        // 0.55 keeps enough of the color to read as "from the artwork" while
        // pushing every channel comfortably below the bright end of the spectrum.
        val mix = 0.55
        val nr = (r * mix).toInt().coerceIn(0, 255)
        val ng = (g * mix).toInt().coerceIn(0, 255)
        val nb = (b * mix).toInt().coerceIn(0, 255)
        return (0xff shl 24) or (nr shl 16) or (ng shl 8) or nb
    }

    private fun buildLaunchPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    private data class ArtworkBundle(
        val bitmap: Bitmap?,
        val notificationColor: Int?,
    )

    companion object {
        const val NOTIFICATION_ID = 1001
        const val NOTIFICATION_CHANNEL_ID = "samo-playback"
        const val NOTIFICATION_CHANNEL_NAME = "Playback"
        private const val MAX_ARTWORK_CACHE = 6
    }
}
