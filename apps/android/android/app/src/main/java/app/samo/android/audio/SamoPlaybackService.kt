package app.samo.android.audio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioDeviceInfo
import android.net.wifi.WifiManager
import android.os.Binder
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.datasource.DataSourceBitmapLoader
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy
import androidx.media3.exoplayer.upstream.LoadErrorHandlingPolicy
import androidx.media3.session.CacheBitmapLoader
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
    // Held only while audio is actively playing. ExoPlayer's
    // C.WAKE_MODE_NETWORK keeps the CPU awake, but on Wi-Fi the radio can still
    // drop into a power-save state that adds seconds of latency and lets idle
    // keep-alive sockets go stale between tracks/stations. A HIGH_PERF Wi-Fi
    // lock keeps the link hot for the streaming session. Released on pause/stop
    // so it never drains battery while idle.
    private var wifiLock: WifiManager.WifiLock? = null
    private var recoveryWakeLock: PowerManager.WakeLock? = null
    private var isPlayerPlaying = false
    private var isRecoveryActive = false
    var preferredMixerDevice: AudioDeviceInfo? = null
    var preferredOutputDevice: AudioDeviceInfo? = null
    /**
     * Set by SamoAudioModule once the React bridge is connected. The
     * notification's previous/next buttons land here via the ForwardingPlayer
     * wrapping ExoPlayer; this hop is what lets the JS-side queue handle
     * track navigation while the native player only ever holds one item.
     */
    var navigationHandler: ((direction: Int) -> Unit)? = null
    internal var castNotificationBridge: (() -> SamoCastNotificationBridge?)? = null

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
        releaseWifiLock()
        releaseWakeLock()
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

    fun setRecoveryActive(active: Boolean) {
        if (isRecoveryActive == active) return
        isRecoveryActive = active
        updateLocks()
    }

    private fun updateLocks() {
        if (isPlayerPlaying || isRecoveryActive) {
            acquireWifiLock()
            acquireWakeLock()
        } else {
            releaseWifiLock()
            releaseWakeLock()
        }
    }

    private fun acquireWakeLock() {
        val lock = recoveryWakeLock ?: run {
            val powerManager =
                applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                    ?: return
            powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "samo:recovery"
            ).also {
                it.setReferenceCounted(false)
                recoveryWakeLock = it
            }
        }
        if (!lock.isHeld) {
            lock.acquire(10 * 60 * 1000L) // 10 minutes max safeguard
        }
    }

    private fun releaseWakeLock() {
        recoveryWakeLock?.let { if (it.isHeld) it.release() }
    }

    @Suppress("DEPRECATION") // WIFI_MODE_FULL_HIGH_PERF is the right mode for
    // sustained media streaming; LOW_LATENCY targets real-time gaming.
    private fun acquireWifiLock() {
        val lock = wifiLock ?: run {
            val wifiManager =
                applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                    ?: return
            wifiManager.createWifiLock(
                WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                "samo:playback",
            ).also {
                it.setReferenceCounted(false)
                wifiLock = it
            }
        }
        if (!lock.isHeld) {
            lock.acquire()
        }
    }

    private fun releaseWifiLock() {
        wifiLock?.let { if (it.isHeld) it.release() }
    }

    /**
     * Build the ExoPlayer used for everything from streaming radio to lossless
     * library playback. The configuration matches what SamoAudioModule used to
     * do inline before this service existed; nothing has changed except that
     * the player now lives in a long-lived process-keeping component.
     */
    fun ensurePlayer(
        requestHeaders: Map<String, String>,
    ): ExoPlayer {
        val existing = player

        // Reuse the existing player unless the request headers changed or it's
        // in a stuck error state (a lingering playerError silently swallows
        // play commands until rebuilt). One player config serves every source
        // type — rebuilding on a config switch released the player AND the
        // MediaSession mid-handoff (e.g. radio → music), which blew away the
        // notification and any buffered audio.
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
        // OkHttp-backed source on the shared SamoHttp.stream client. The old
        // DefaultHttpDataSource used java.net.HttpURLConnection, sharing the
        // process-global keep-alive pool with the native control calls — a
        // stale pooled socket there blocked the stream open for the full 15s
        // read timeout before failing (measured on-device, while ICMP to the
        // same box stayed flawless). OkHttp's retryOnConnectionFailure re-dials
        // a fresh socket in under a second instead. Connect/read timeouts and
        // connection reuse live on the client (SamoHttp); OkHttp follows the
        // cross-protocol radio redirect (6969 -> 8050) per its client config.
        val httpDataSourceFactory = OkHttpDataSource.Factory(SamoHttp.stream)
            .setDefaultRequestProperties(requestHeaders)
        // Disk cache is opt-in: progressive podcast streams with auth query
        // params and Range seeks are unreliable through SimpleCache today.
        val dataSourceFactory = SamoStreamCache.buildDataSourceFactory(
            this,
            httpDataSourceFactory,
            enableDiskCache = false,
        )
        // Direct podcast enclosures get an open-failure fallback onto the
        // authenticated server proxy (inert for every other URL). Above that,
        // re-mint each music track's stream token at the moment ExoPlayer opens
        // its DataSource. With the full queue loaded as a Media3 playlist,
        // ExoPlayer pre-buffers upcoming items and opens this just before each
        // track plays — so a long queue survives hours with the screen off,
        // entirely natively, with no token minted at queue-build time able to
        // expire mid-session. Non-music / non-Samo URIs pass through untouched.
        val fallbackDataSourceFactory = SamoDirectStreamFallback.wrap(this, dataSourceFactory)
        val resolvingDataSourceFactory = SamoResolvingDataSource.wrap(this, fallbackDataSourceFactory)
        val extractorsFactory = DefaultExtractorsFactory()
            .setConstantBitrateSeekingEnabled(true)
        val mediaSourceFactory = DefaultMediaSourceFactory(resolvingDataSourceFactory, extractorsFactory)
            .setLoadErrorHandlingPolicy(SamoLoadErrorHandlingPolicy())
        // One tuned LoadControl for every source type (music, podcast,
        // audiobook, radio): enough buffer to ride out Wi-Fi handoffs without
        // letting long sessions hoard memory and make the React Native UI lag.
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                /* minBufferMs = */ 15_000,
                /* maxBufferMs = */ 60_000,
                /* bufferForPlaybackMs = */ 2_500,
                /* bufferForPlaybackAfterRebufferMs = */ 5_000,
            )
            .build()
        val createdPlayer = ExoPlayer.Builder(this, renderersFactory)
            .setMediaSourceFactory(mediaSourceFactory)
            .setLoadControl(loadControl)
            .build()

        createdPlayer.setAudioAttributes(audioAttributes, true)
        createdPlayer.setPreferredAudioDevice(preferredOutputDevice)
        createdPlayer.setHandleAudioBecomingNoisy(true)
        createdPlayer.repeatMode = Player.REPEAT_MODE_OFF
        // Hold a partial wake lock while audio is loading or playing so streaming
        // radio doesn't die when the device idles into Doze with the screen off.
        createdPlayer.setWakeMode(C.WAKE_MODE_NETWORK)
        // Keep the Wi-Fi link out of power-save while actually playing. Acquire
        // on play / release on pause-stop so we never hold it idle.
        createdPlayer.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                isPlayerPlaying = isPlaying
                updateLocks()
            }
        })
        // ExoPlayer defaults to software decode; SamoAudioEngine dynamically
        // requests AUDIO_OFFLOAD_MODE_ENABLED for music tracks to achieve
        // bit-perfect playback, and falls back to software decode for everything
        // else to avoid hardware wedge bugs on long-form content.

        // The MediaSession is what makes Android treat us as an active media
        // app — once a player attached to a MediaSession starts playing,
        // MediaSessionService promotes us to a foreground service with the
        // standard playback notification. That's the load-bearing piece for
        // screen-off survival.
        //
        // We hand the session a ForwardingPlayer instead of the raw ExoPlayer
        // so previous/next show up in the notification (and respond to
        // Bluetooth + headphone media buttons) even though Samo's queue lives
        // in JavaScript. The forwarding player claims those commands are
        // always available and routes them back through navigationHandler,
        // which SamoAudioModule wires to a JS event.
        val sessionPlayer = SamoForwardingPlayer(
            createdPlayer,
            castBridge = { castNotificationBridge?.invoke() },
        ) { direction ->
            mainHandler.post { navigationHandler?.invoke(direction) }
        }
        // Load notification / lock-screen cover art through the same OkHttp
        // (no-reuse) stack as the stream. The default MediaSession bitmap loader
        // uses DefaultHttpDataSource (HttpURLConnection) — the very pool whose
        // stale sockets produced the "Failed to load bitmap: SocketTimeout"
        // lines and a coverless lock screen after the app sat idle. Wrapped in
        // CacheBitmapLoader so a given cover is only fetched + decoded once.
        // DefaultDataSource keeps non-http schemes (file:// for downloaded art)
        // working; http goes through OkHttp.
        val bitmapLoader = CacheBitmapLoader(
            DataSourceBitmapLoader.Builder(this)
                .setDataSourceFactory(
                    DefaultDataSource.Factory(this, OkHttpDataSource.Factory(SamoHttp.stream)),
                )
                .build(),
        )
        val builtSession = MediaSession.Builder(this, sessionPlayer)
            .setBitmapLoader(bitmapLoader)
            .build()
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

    internal fun getSessionPlayer(): SamoForwardingPlayer? = mediaSession?.player as? SamoForwardingPlayer

    /**
     * Rebuild the MediaStyle notification after cast playback state changes.
     * The local mirror stays paused, so we mirror cast state on [SamoForwardingPlayer]
     * and ask MediaSessionService to repaint the shade controls.
     */
    internal fun refreshPlaybackNotification() {
        val session = mediaSession ?: return
        onUpdateNotification(session, false)
    }

    private fun ensureNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) {
            return
        }
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
            // Same Samo S used by the real notification — so the cold-start
            // placeholder doesn't flash a system play triangle for the frame
            // before Media3 swaps in the proper MediaStyle card.
            .setSmallIcon(app.samo.android.R.drawable.ic_notification_samo)
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

/**
 * Custom load-error policy for ExoPlayer. The default
 * `DefaultLoadErrorHandlingPolicy` allows 3 retries with 1s/2s/4s backoff —
 * that's enough for stable Wi-Fi but cuts out the moment a handoff to a
 * different AP takes longer than 7 seconds total. For internet radio (and
 * live HLS audiobook transcodes) we want to ride out longer blips without
 * surfacing an error to the user.
 *
 * The retry count is bumped from 3 → 8 and the per-retry delay capped at
 * 3s so the wall-clock recovery window grows from ~7s to ~24s without any
 * single retry stalling for half a minute the way the default exponential
 * backoff can.
 */
private class SamoLoadErrorHandlingPolicy : DefaultLoadErrorHandlingPolicy() {
    override fun getMinimumLoadableRetryCount(dataType: Int): Int = 8

    override fun getRetryDelayMsFor(
        loadErrorInfo: LoadErrorHandlingPolicy.LoadErrorInfo,
    ): Long {
        val base = super.getRetryDelayMsFor(loadErrorInfo)
        if (base == C.TIME_UNSET) return base
        return base.coerceAtMost(3_000L)
    }
}
