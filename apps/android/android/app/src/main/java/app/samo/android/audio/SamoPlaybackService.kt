package app.samo.android.audio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioDeviceInfo
import android.os.Binder
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * MediaSessionService that owns the ExoPlayer. Hosts a MediaSession so the
 * system surfaces the playback in the notification shade, the lock screen, and
 * Bluetooth media keys — and, crucially, promotes the service to the foreground
 * the moment playback starts. That foreground state plus C.WAKE_MODE_NETWORK is
 * what keeps audio going for hours when the screen is off, instead of the
 * process getting frozen by Doze after a minute or two.
 *
 * The native module binds to this service to access the underlying player
 * directly so it can keep its existing analytics + bit-perfect routing logic.
 */
class SamoPlaybackService : MediaSessionService() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val localBinder = LocalBinder()
    private var mediaSession: MediaSession? = null
    private var player: ExoPlayer? = null
    private var playerRequestHeaders: Map<String, String> = emptyMap()
    var preferredMixerDevice: AudioDeviceInfo? = null

    inner class LocalBinder : Binder() {
        fun getService(): SamoPlaybackService = this@SamoPlaybackService
    }

    override fun onCreate() {
        super.onCreate()
        ensureNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Android 8+ contract: when a process calls startForegroundService(), the
        // service has 5 seconds to call startForeground() or the system ANRs the
        // app ("Context.startForegroundService() did not then call
        // Service.startForeground()"). MediaSessionService auto-promotes only
        // when the player transitions to playing, which can take longer than
        // that on a slow first-buffer. Call startForeground immediately with a
        // minimal placeholder so we satisfy the contract; Media3 swaps in the
        // real media notification once the session has content.
        startForeground(NOTIFICATION_ID, buildPlaceholderNotification())
        return super.onStartCommand(intent, flags, startId)
    }

    override fun onBind(intent: Intent?): IBinder? {
        if (intent?.action == ACTION_BIND_LOCAL) {
            return localBinder
        }
        return super.onBind(intent)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        // The user swiped the app away. If we're actively playing, keep going —
        // the user opened audio expecting it to stick around. If we're paused
        // with nothing queued, release so we don't squat as a foreground
        // service forever.
        val resolvedPlayer = player
        if (resolvedPlayer == null || !resolvedPlayer.playWhenReady ||
            resolvedPlayer.mediaItemCount == 0
        ) {
            stopSelf()
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        mediaSession?.run {
            this.player.release()
            release()
        }
        mediaSession = null
        player = null
        super.onDestroy()
    }

    fun getCurrentPlayer(): ExoPlayer? = player

    /**
     * Build the ExoPlayer used for everything from streaming radio to lossless
     * library playback. The configuration matches what SamoAudioModule used to
     * do inline before this service existed; nothing has changed except that
     * the player now lives in a long-lived process-keeping component.
     */
    fun ensurePlayer(requestHeaders: Map<String, String>): ExoPlayer {
        val existing = player

        // Reuse the existing player only if headers match AND it's not in a
        // stuck error state. A lingering playerError means the player will
        // silently swallow play commands until rebuilt — that was the
        // "audio cuts out and won't recover until APK rebuild" bug.
        if (existing != null &&
            playerRequestHeaders == requestHeaders &&
            existing.playerError == null
        ) {
            return existing
        }

        if (existing != null) {
            mediaSession?.release()
            mediaSession = null
            existing.release()
            player = null
        }

        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()
        val renderersFactory = DefaultRenderersFactory(this)
            .setEnableAudioFloatOutput(true)
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setDefaultRequestProperties(requestHeaders)
        val dataSourceFactory = DefaultDataSource.Factory(this, httpDataSourceFactory)
        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)
        val createdPlayer = ExoPlayer.Builder(this, renderersFactory)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()

        createdPlayer.setAudioAttributes(audioAttributes, true)
        createdPlayer.setHandleAudioBecomingNoisy(true)
        // Hold a partial wake lock while audio is loading or playing so streaming
        // radio doesn't die when the device idles into Doze with the screen off.
        createdPlayer.setWakeMode(C.WAKE_MODE_NETWORK)
        createdPlayer.trackSelectionParameters = createdPlayer.trackSelectionParameters
            .buildUpon()
            .setAudioOffloadPreferences(
                TrackSelectionParameters.AudioOffloadPreferences.Builder()
                    // DISABLED instead of ENABLED. Hardware audio offload is
                    // great for battery on long audiobook sessions, but some
                    // devices have firmware bugs where the offload path gets
                    // wedged after hours of playback and audio silently stops
                    // until the process is killed. Until we can detect+work
                    // around that case dynamically, force ExoPlayer to use
                    // standard software decode — slightly higher battery,
                    // dramatically more reliable.
                    .setAudioOffloadMode(
                        TrackSelectionParameters.AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_DISABLED
                    )
                    .setIsGaplessSupportRequired(false)
                    .setIsSpeedChangeSupportRequired(false)
                    .build()
            )
            .build()

        // The MediaSession is what makes Android treat us as an active media
        // app — once a player attached to a MediaSession starts playing,
        // MediaSessionService promotes us to a foreground service with the
        // standard playback notification. That's the load-bearing piece for
        // screen-off survival.
        mediaSession = MediaSession.Builder(this, createdPlayer).build()
        player = createdPlayer
        playerRequestHeaders = requestHeaders

        return createdPlayer
    }

    fun resetPlayerState() {
        val resolvedPlayer = player ?: return
        resolvedPlayer.stop()
        resolvedPlayer.clearMediaItems()
    }

    private fun ensureNotificationChannel() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID) != null) {
            return
        }
        // LOW importance — this is a media-playback notification, it must not
        // ding or vibrate every time it appears.
        val channel = NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            "Playback",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Now playing controls and media notification."
            setShowBadge(false)
        }
        manager.createNotificationChannel(channel)
    }

    private fun buildPlaceholderNotification(): Notification {
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("Samo")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            // Don't expose on the lock screen until the MediaSession has real
            // metadata — Media3 will replace this within a beat.
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
            .build()
    }

    companion object {
        const val ACTION_BIND_LOCAL = "app.samo.android.audio.BIND_LOCAL"
        private const val NOTIFICATION_ID = 1001
        private const val NOTIFICATION_CHANNEL_ID = "samo-playback"
    }
}
