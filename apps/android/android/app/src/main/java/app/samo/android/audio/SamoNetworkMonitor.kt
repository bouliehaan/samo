package app.samo.android.audio

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Handler
import android.util.Log
import java.util.concurrent.CopyOnWriteArraySet

/**
 * Tracks whether the device has a usable network. The playback engine asks two
 * things of this:
 *
 *   1. "Is the network up right now?" — so the recovery layer can choose
 *      between an immediate retry and entering [PlaybackState.WAITING_FOR_NETWORK]
 *      without burning attempts on a dead radio.
 *   2. "Tell me when the network comes back" — so a paused-for-network player
 *      can resume the instant the system reports connectivity, not at the next
 *      arbitrary retry timer.
 *
 * Listeners fire on the main thread (the supplied [mainHandler]), so playback
 * state mutations from them are safe to do inline.
 */
internal class SamoNetworkMonitor(
    private val context: Context,
    private val mainHandler: Handler,
) {
    fun interface Listener {
        fun onNetworkAvailable()
    }

    private val connectivityManager: ConnectivityManager? =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    private val listeners = CopyOnWriteArraySet<Listener>()

    @Volatile
    private var hasInternet: Boolean = computeInitialOnlineState()

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            hasInternet = true
            mainHandler.post {
                listeners.forEach { listener ->
                    try {
                        listener.onNetworkAvailable()
                    } catch (error: Exception) {
                        Log.w(TAG, "network listener threw", error)
                    }
                }
            }
        }

        override fun onLost(network: Network) {
            // Re-check the system view of connectivity — losing one network
            // (Wi-Fi) does not mean we're offline if cellular is still up.
            hasInternet = isAnyNetworkOnline()
        }

        override fun onCapabilitiesChanged(
            network: Network,
            capabilities: NetworkCapabilities,
        ) {
            hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        }
    }

    private var registered = false

    fun start() {
        val manager = connectivityManager ?: return
        if (registered) return
        registered = true
        // Defaultnetworkcallback would be the obvious pick on 24+, but it only
        // fires for the system DEFAULT route; on a multi-route device (Wi-Fi
        // up, cellular up, default is Wi-Fi) we still want to know when an
        // alternate route comes online so a pocketed podcast can resume the
        // moment the device falls back to cellular.
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        try {
            manager.registerNetworkCallback(request, callback)
        } catch (error: Exception) {
            registered = false
            Log.w(TAG, "failed to register network callback", error)
        }
    }

    fun stop() {
        val manager = connectivityManager ?: return
        if (!registered) return
        registered = false
        try {
            manager.unregisterNetworkCallback(callback)
        } catch (_: Exception) {
            // Already unregistered, or never registered cleanly. Best effort.
        }
    }

    /** True when the system reports at least one validated internet route. */
    fun isOnline(): Boolean = hasInternet

    fun addListener(listener: Listener) {
        listeners.add(listener)
    }

    fun removeListener(listener: Listener) {
        listeners.remove(listener)
    }

    private fun computeInitialOnlineState(): Boolean = isAnyNetworkOnline()

    private fun isAnyNetworkOnline(): Boolean {
        val manager = connectivityManager ?: return true
        val active = manager.activeNetwork ?: return false
        val caps = manager.getNetworkCapabilities(active) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    companion object {
        private const val TAG = "SamoNetwork"
    }
}
