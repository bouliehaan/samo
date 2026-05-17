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
 */
class SamoForwardingPlayer(
    delegate: ExoPlayer,
    private val onNavigate: (direction: Int) -> Unit,
) : ForwardingPlayer(delegate) {

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

    override fun seekToNext() {
        onNavigate(1)
    }

    override fun seekToNextMediaItem() {
        onNavigate(1)
    }

    override fun seekToPrevious() {
        onNavigate(-1)
    }

    override fun seekToPreviousMediaItem() {
        onNavigate(-1)
    }
}
