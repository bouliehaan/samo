package app.samo.android.audio

/**
 * Routes system media controls (notification shade, lock screen, Bluetooth keys)
 * to the active Chromecast session while local ExoPlayer is only a paused mirror.
 */
internal interface SamoCastNotificationBridge {
    fun getCastOverlayState(): SamoCastPlaybackOverlay?

    fun handleCastPlay(): Boolean

    fun handleCastPause(): Boolean

    fun handleCastSeek(positionMs: Long): Boolean
}

internal data class SamoCastPlaybackOverlay(
    val currentPositionMs: Long,
    val durationMs: Long,
    val playWhenReady: Boolean,
)
