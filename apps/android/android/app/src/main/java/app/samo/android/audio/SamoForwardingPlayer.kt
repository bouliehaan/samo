package app.samo.android.audio

import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer

/**
 * Wraps the underlying ExoPlayer so the MediaSession (and therefore the system
 * notification, lock screen, Bluetooth media buttons, Android Auto, etc) sees
 * next/previous as always-available commands.
 *
 * ExoPlayer here only ever holds ONE MediaItem at a time — Samo manages the
 * queue in JavaScript and feeds the native player one track per play(). Out
 * of the box that means Media3 reports COMMAND_SEEK_TO_NEXT as unavailable
 * (there's no upcoming media item in the player's own queue) and hides the
 * Next action from the notification entirely. The Previous button stayed
 * because COMMAND_SEEK_TO_PREVIOUS includes "rewind to position 0" when
 * there's no actual previous track — that fallback doesn't exist for Next.
 *
 * This ForwardingPlayer claims the commands are always available and routes
 * seekToNext / seekToPrevious back through the supplied callback, which
 * SamoPlaybackService wires to a JS event so the React-side queue can pick
 * the right track and call play() with it. As a bonus, the same path also
 * powers headphone / Bluetooth media-button skips — they all funnel through
 * the player surface.
 *
 * While Chromecast owns playback, play/pause/seek from the notification are
 * routed to [SamoCastNotificationBridge] instead of the paused local mirror.
 * [castOverlay] mirrors cast position and play state so the notification UI
 * stays in sync without starting local audio.
 */
internal class SamoForwardingPlayer(
    delegate: ExoPlayer,
    private val castBridge: () -> SamoCastNotificationBridge?,
    private val onNavigate: (direction: Int) -> Unit,
) : ForwardingPlayer(delegate) {

    private var castOverlay: SamoCastPlaybackOverlay? = null

    internal fun setCastOverlay(overlay: SamoCastPlaybackOverlay?) {
        castOverlay = overlay
    }

    private fun activeCastBridge(): SamoCastNotificationBridge? = castBridge()

    private fun refreshCastOverlayFromBridge() {
        castOverlay = activeCastBridge()?.getCastOverlayState()
    }

    override fun getPlayWhenReady(): Boolean =
        castOverlay?.playWhenReady ?: super.getPlayWhenReady()

    override fun getCurrentPosition(): Long =
        castOverlay?.currentPositionMs ?: super.getCurrentPosition()

    override fun getDuration(): Long {
        val overlayDuration = castOverlay?.durationMs ?: -1L
        return if (overlayDuration > 0) overlayDuration else super.getDuration()
    }

    override fun getPlaybackState(): Int {
        if (castOverlay != null && super.getPlaybackState() != Player.STATE_IDLE) {
            return Player.STATE_READY
        }
        return super.getPlaybackState()
    }

    override fun play() {
        refreshCastOverlayFromBridge()
        if (activeCastBridge()?.handleCastPlay() == true) {
            refreshCastOverlayFromBridge()
            return
        }
        super.play()
    }

    override fun pause() {
        refreshCastOverlayFromBridge()
        if (activeCastBridge()?.handleCastPause() == true) {
            refreshCastOverlayFromBridge()
            return
        }
        super.pause()
    }

    override fun setPlayWhenReady(playWhenReady: Boolean) {
        refreshCastOverlayFromBridge()
        if (playWhenReady) {
            if (activeCastBridge()?.handleCastPlay() == true) {
                refreshCastOverlayFromBridge()
                return
            }
        } else if (activeCastBridge()?.handleCastPause() == true) {
            refreshCastOverlayFromBridge()
            return
        }
        super.setPlayWhenReady(playWhenReady)
    }

    override fun seekTo(positionMs: Long) {
        refreshCastOverlayFromBridge()
        if (activeCastBridge()?.handleCastSeek(positionMs) == true) {
            refreshCastOverlayFromBridge()
            return
        }
        super.seekTo(positionMs)
    }

    override fun getAvailableCommands(): Player.Commands {
        return super.getAvailableCommands()
            .buildUpon()
            .add(Player.COMMAND_SEEK_TO_NEXT)
            .add(Player.COMMAND_SEEK_TO_PREVIOUS)
            .add(Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM)
            .add(Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM)
            .build()
    }

    override fun isCommandAvailable(command: Int): Boolean {
        if (
            command == Player.COMMAND_SEEK_TO_NEXT ||
            command == Player.COMMAND_SEEK_TO_PREVIOUS ||
            command == Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM ||
            command == Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM
        ) {
            return true
        }
        return super.isCommandAvailable(command)
    }

    override fun hasNextMediaItem(): Boolean = true

    override fun hasPreviousMediaItem(): Boolean = true

    // When ExoPlayer holds a real multi-item playlist (music — the full queue is
    // loaded so it can advance natively for hours with the screen off), route
    // next/prev to the real player for instant, JS-free navigation. Single-item
    // content (audiobook / podcast chapter rows) still routes through the JS
    // callback for book-global chapter nav, and cast always does (the local
    // player is a paused mirror; JS drives the cast queue).
    private fun canUseRealPlaylistNav(): Boolean =
        activeCastBridge() == null && mediaItemCount > 1

    override fun seekToNext() {
        if (canUseRealPlaylistNav() && currentMediaItemIndex < mediaItemCount - 1) {
            super.seekToNext()
        } else {
            onNavigate(1)
        }
    }

    override fun seekToNextMediaItem() {
        if (canUseRealPlaylistNav() && currentMediaItemIndex < mediaItemCount - 1) {
            super.seekToNextMediaItem()
        } else {
            onNavigate(1)
        }
    }

    override fun seekToPrevious() {
        if (canUseRealPlaylistNav()) super.seekToPrevious() else onNavigate(-1)
    }

    override fun seekToPreviousMediaItem() {
        if (canUseRealPlaylistNav() && currentMediaItemIndex > 0) {
            super.seekToPreviousMediaItem()
        } else {
            onNavigate(-1)
        }
    }
}
