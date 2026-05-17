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
        // Without an explicit MediaNotification.Provider the service falls
        // back to the placeholder we post in onStartCommand — Media3's
        // DefaultMediaNotificationProvider never actually swapped in for us,
        // which is what left the shade showing the silent stub. The custom
        // provider builds the proper MediaStyle (play/pause/prev/next) and
        // pulls a Palette-derived background color from the cover art.
        setMediaNotificationProvider(SamoMediaNotificationProvider(this))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Android 8+ contract: when a process calls startForegroundService(),
        // the service has 5 seconds to call startForeground() or the system
        // ANRs the app. We only post the silent placeholder when there's no
        // MediaSession yet — once Media3's notification provider owns the
        // slot, reposting the placeholder here OVERWRITES the proper
        // MediaStyle notification every time the system delivers an intent
        // (eg pause/resume via media buttons, or a START_STICKY service
        // restart). That overwrite was the bug behind "pause kills the play
        // card and replaces it with the silent notification".
        if (mediaSession == null) {
            startForeground(NOTIFICATION_ID, buildPlaceholderNotification())
        }
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
        mediaSession?.let { session ->
            // Remove from the service's tracked-session set BEFORE releasing
            // so the notification manager has a chance to tear down its bound
            // listeners cleanly. release() then frees the underlying player.
            removeSession(session)
            session.player.release()
            session.release()
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
            mediaSession?.let { session ->
                removeSession(session)
                session.release()
            }
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
        val builtSession = MediaSession.Builder(this, createdPlayer).build()
        // addSession() is the step that was missing before: without it the
        // service's notification manager doesn't know there's a session to
        // post a media notification for, so the placeholder in
        // onStartCommand never gets replaced.
        addSession(builtSession)
        mediaSession = builtSession
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
