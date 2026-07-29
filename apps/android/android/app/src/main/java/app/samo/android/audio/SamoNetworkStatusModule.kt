package app.samo.android.audio

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * The device's connectivity, reported to JS.
 *
 * This is deliberately NOT the same object as [SamoNetworkMonitor], which the
 * playback engine owns and which answers exactly one question ("can I retry a
 * stream yet?") on the audio thread's terms. Sharing one callback between the
 * two would tie the app's offline UI to the lifecycle of the playback service;
 * a second ConnectivityManager callback costs nothing measurable and keeps
 * playback recovery untouchable.
 *
 * The Wi-Fi name is the only part that is conditional. Android has required
 * ACCESS_FINE_LOCATION to read the connected SSID since API 27, and redacts it
 * from [NetworkCapabilities.getTransportInfo] without it, so this reports
 * `null` rather than the `<unknown ssid>` placeholder whenever the permission
 * has not been granted. Everything the app does with connectivity works
 * without it — the SSID is a shortcut, never a requirement.
 */
class SamoNetworkStatusModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = NAME

    private val connectivityManager: ConnectivityManager? =
        reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    private var registered = false

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) = emitCurrentStatus()

        override fun onLost(network: Network) = emitCurrentStatus()

        override fun onCapabilitiesChanged(
            network: Network,
            capabilities: NetworkCapabilities,
        ) = emitCurrentStatus()
    }

    init {
        register()
    }

    private fun register() {
        val manager = connectivityManager ?: return
        if (registered) return
        try {
            // The DEFAULT network is the right question here, unlike the
            // playback monitor's any-route callback: the app talks to one
            // server over whatever route the system actually chose, and
            // "some other interface exists" is not a reason to call ourselves
            // online.
            manager.registerDefaultNetworkCallback(callback)
            registered = true
        } catch (error: Exception) {
            Log.w(TAG, "failed to register default network callback", error)
        }
    }

    override fun invalidate() {
        val manager = connectivityManager
        if (registered && manager != null) {
            try {
                manager.unregisterNetworkCallback(callback)
            } catch (_: Exception) {
                // Already gone. Best effort.
            }
        }
        registered = false
        super.invalidate()
    }

    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit

    /** One-shot read, for the boot path that runs before the first callback. */
    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            promise.resolve(buildStatus())
        } catch (error: Throwable) {
            promise.reject("SamoNetworkStatusError", error)
        }
    }

    /** Whether the SSID is readable, so the UI can ask for permission only when
     *  it would actually change the answer. */
    @ReactMethod
    fun canReadSsid(promise: Promise) {
        promise.resolve(hasLocationPermission())
    }

    private fun emitCurrentStatus() {
        if (!reactContext.hasActiveReactInstance()) return
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT, buildStatus())
        } catch (error: Throwable) {
            Log.w(TAG, "failed to emit network status", error)
        }
    }

    private fun buildStatus(): WritableMap {
        val manager = connectivityManager
        val active = manager?.activeNetwork
        val capabilities = active?.let { manager.getNetworkCapabilities(it) }

        val online = capabilities != null &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)

        val transport = when {
            capabilities == null -> "none"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
            else -> "other"
        }

        val map = Arguments.createMap()
        map.putBoolean("online", online)
        map.putString("transport", transport)
        val ssid = if (transport == "wifi") readSsid() else null
        if (ssid == null) map.putNull("ssid") else map.putString("ssid", ssid)
        return map
    }

    private fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED

    /**
     * The connected network's name, or null when it cannot be known.
     *
     * Two sources are tried and the first that yields a REAL name wins, which
     * matters more than it looks. From API 31 the modern route is to pull
     * [android.net.wifi.WifiInfo] off the network capabilities — but the
     * platform redacts location-sensitive fields from a `getNetworkCapabilities`
     * snapshot and hands back the literal string `<unknown ssid>` rather than
     * null, so a naive `?:` chain never reaches the fallback and every read
     * comes back empty on a device that knows perfectly well what it is
     * connected to. Normalising BEFORE choosing is what makes the fallback
     * reachable.
     *
     * Both routes are gated on the same permission, so without it this is null
     * either way — which callers already treat as "no hint available".
     */
    private fun readSsid(): String? {
        if (!hasLocationPermission()) return null
        return try {
            val wifiManager = reactContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as? WifiManager

            val fromCapabilities = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = connectivityManager
                val info = manager?.activeNetwork
                    ?.let { manager.getNetworkCapabilities(it) }
                    ?.transportInfo as? android.net.wifi.WifiInfo
                normalizeSsid(info?.ssid)
            } else {
                null
            }

            fromCapabilities ?: normalizeSsid(wifiManager?.let { legacySsid(it) })
        } catch (error: Throwable) {
            Log.w(TAG, "failed to read ssid", error)
            null
        }
    }

    @Suppress("DEPRECATION")
    private fun legacySsid(wifiManager: WifiManager): String? =
        wifiManager.connectionInfo?.ssid

    companion object {
        private const val TAG = "SamoNetworkStatus"
        internal const val NAME = "SamoNetworkStatus"
        internal const val EVENT = "SamoNetworkStatus"
        private const val UNKNOWN_SSID = "<unknown ssid>"

        /** Strips the quotes the platform wraps SSIDs in and rejects the
         *  redaction placeholder, so callers only ever see a real name. */
        internal fun normalizeSsid(raw: String?): String? {
            val trimmed = raw?.trim()?.removeSurrounding("\"")?.trim()
            if (trimmed.isNullOrEmpty()) return null
            if (trimmed == UNKNOWN_SSID || trimmed == "0x") return null
            return trimmed
        }
    }
}
