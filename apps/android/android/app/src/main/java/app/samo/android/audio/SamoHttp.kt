package app.samo.android.audio

import okhttp3.ConnectionPool
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * One process-wide OkHttp stack for every Samo network call the native side
 * makes — control writes (progress PATCH, stream-token mint) AND the ExoPlayer
 * media stream (via OkHttpDataSource).
 *
 * THE BUG THIS FIXES (measured on-device, 2026-06-15): the native code reused
 * idle keep-alive sockets from a shared pool. On this network an idle TCP
 * connection to the box is dropped *silently* — no RST ever reaches the phone
 * (proven: ICMP to the box stayed flawless throughout a 15s HTTP stall). The
 * pool kept handing out those half-open sockets; the write succeeded into the
 * void and the *read* then blocked the full timeout before failing. Connections
 * went stale after ~15-20s idle, so switching to radio/audiobook (which sends no
 * progress polls to keep the pool warm) cascaded into 30-60s of dead playback.
 *
 * WHY retryOnConnectionFailure ALONE WASN'T ENOUGH (the first fix attempt):
 * OkHttp only retries failures that happen *before the request is sent*. A
 * post-send `SocketTimeoutException` (exactly the half-open-socket case) is
 * treated as non-recoverable — it just fails, evicts that one dead socket, and
 * the next call grabs the next stale pooled socket. So the stalls continued,
 * only shorter (one read-timeout per dead socket instead of 15s). OkHttp's
 * connection health check can't help either: a silently half-open socket looks
 * open locally, so it passes the probe and gets reused.
 *
 * THE ACTUAL CURE: do NOT reuse idle pooled connections. `ConnectionPool(0, …)`
 * retains zero idle connections, so every call performs a fresh TCP handshake
 * and can never inherit a dead socket. On a LAN that handshake is a few ms; the
 * trade is invisible next to a 40-second stall, and it makes "tap → audio"
 * deterministic regardless of how long the app sat idle. retryOnConnectionFailure
 * is kept on so a fresh connect that races a Wi-Fi blip still self-heals.
 */
internal object SamoHttp {
    /**
     * Base client: the no-reuse connection pool + the stale-socket-proof connect
     * retry. Never used directly — the timeout-tuned variants below derive from
     * it via [OkHttpClient.newBuilder], which keeps the (no-reuse) pool shared.
     */
    private val base: OkHttpClient =
        OkHttpClient.Builder()
            .retryOnConnectionFailure(true)
            // maxIdleConnections = 0: keep no idle connections, so a call never
            // reuses a (possibly silently-dead) pooled socket. The keepAlive
            // value is irrelevant when zero idle connections are retained.
            .connectionPool(ConnectionPool(0, 1, TimeUnit.SECONDS))
            .build()

    /**
     * Fail-fast client for the small idempotent JSON control calls (progress
     * PATCH, stream-token mint). A fresh LAN connection answers in single-digit
     * ms; a multi-second wait now only ever means genuine network loss (the
     * stale-socket case is gone), so we fail fast and let the caller's recovery
     * react instead of hanging.
     */
    val control: OkHttpClient =
        base.newBuilder()
            .connectTimeout(4, TimeUnit.SECONDS)
            .readTimeout(6, TimeUnit.SECONDS)
            .writeTimeout(6, TimeUnit.SECONDS)
            .build()

    /**
     * Client for the media stream body, handed to ExoPlayer's
     * [androidx.media3.datasource.okhttp.OkHttpDataSource]. Connect stays tight
     * (a fresh socket handshakes fast), but the read window stays generous: a
     * legitimately slow ad-chain or radio buffer can have long gaps between
     * bytes, and genuine read stalls are governed by ExoPlayer's
     * SamoLoadErrorHandlingPolicy, not by cutting the socket here. Each
     * ExoPlayer open() gets its own fresh connection (no idle reuse), so a
     * stream that starts after a long idle stretch never inherits a dead socket.
     */
    val stream: OkHttpClient =
        base.newBuilder()
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build()
}
