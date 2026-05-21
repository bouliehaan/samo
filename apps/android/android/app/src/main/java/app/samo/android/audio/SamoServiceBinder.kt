package app.samo.android.audio

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Handler
import android.os.IBinder
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

internal class SamoServiceBinder(
  private val reactContext: ReactApplicationContext,
  private val mainHandler: Handler,
  private val callbacks: Callbacks,
) {
  interface Callbacks {
    fun onServiceConnected(service: SamoPlaybackService)
    fun onServiceDisconnected()
    fun getPreferredOutputDevice(): android.media.AudioDeviceInfo?
    fun onNavigationRequest(direction: Int)
  }

  var boundService: SamoPlaybackService? = null
    private set
  var isBinding = false
    private set
  private val pendingServiceActions = mutableListOf<(SamoPlaybackService) -> Unit>()

  val serviceConnection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
      val service = (binder as? SamoPlaybackService.LocalBinder)?.getService() ?: return
      boundService = service
      isBinding = false
      // Notification's previous/next buttons land on the ForwardingPlayer
      // wrapping ExoPlayer; ForwardingPlayer calls back to the service,
      // which calls this handler. We then bounce up to JS so the React
      // queue can pick the right track. The previous/next physically
      // present in the shade comes from the ForwardingPlayer claiming the
      // commands are always available — see SamoForwardingPlayer.
      service.navigationHandler = { direction ->
        callbacks.onNavigationRequest(direction)
      }
      service.preferredOutputDevice = callbacks.getPreferredOutputDevice()
      service.getCurrentPlayer()?.setPreferredAudioDevice(service.preferredOutputDevice)
      val pending = pendingServiceActions.toList()
      pendingServiceActions.clear()
      pending.forEach { it(service) }
      callbacks.onServiceConnected(service)
    }

    override fun onServiceDisconnected(name: ComponentName?) {
      boundService?.navigationHandler = null
      boundService = null
      callbacks.onServiceDisconnected()
    }
  }

  fun withService(
    onReady: (SamoPlaybackService) -> Unit,
    onError: ((Throwable) -> Unit)? = null,
    startService: Boolean = true,
  ) {
    ensureServiceBound(onReady, onError, startService)
  }

  fun withService(promise: Promise, block: (SamoPlaybackService) -> Unit) {
    withService(
      onReady = block,
      onError = { error -> promise.reject("SAMO_AUDIO_ERROR", error.message, error) },
    )
  }

  /**
   * Same plumbing as withService but without a Promise — for callers that
   * want to opportunistically warm the local playback service (e.g. preparing
   * a mirror player during Chromecast playback so the disconnect path has
   * something to fall back to). onError is invoked if binding itself fails;
   * the typical caller logs and moves on.
   */
  fun ensureServiceBound(
    onReady: (SamoPlaybackService) -> Unit,
    onError: ((Throwable) -> Unit)? = null,
    startService: Boolean = true,
  ) {
    // Confine all reads/writes of boundService, isBinding, and
    // pendingServiceActions to the main thread. ReactMethod calls arrive on
    // RN's module dispatch thread; ServiceConnection callbacks arrive on the
    // main thread. Without this confinement they race and pending commands
    // can silently strand — the user-visible symptom is a tap that does
    // nothing and eventually an ANR while the JS thread waits on a never-
    // resolved promise.
    mainHandler.post {
      val existing = boundService
      if (existing != null) {
        try {
          onReady(existing)
        } catch (error: Exception) {
          onError?.invoke(error)
        }
        return@post
      }

      pendingServiceActions.add { service ->
        try {
          onReady(service)
        } catch (error: Exception) {
          onError?.invoke(error)
        }
      }

      if (isBinding) {
        return@post
      }
      isBinding = true
      val intent = Intent(reactContext, SamoPlaybackService::class.java).apply {
        action = SamoPlaybackService.ACTION_BIND_LOCAL
      }
      try {
        if (startService) {
          ContextCompat.startForegroundService(reactContext, intent)
        }
        val bound = reactContext.bindService(
          intent,
          serviceConnection,
          Context.BIND_AUTO_CREATE
        )
        if (!bound) {
          isBinding = false
          pendingServiceActions.clear()
          onError?.invoke(IllegalStateException("Could not bind audio playback service"))
        }
      } catch (error: Exception) {
        isBinding = false
        pendingServiceActions.clear()
        onError?.invoke(error)
      }
    }
  }

  fun clearOnInvalidate() {
    mainHandler.post {
      pendingServiceActions.clear()
      isBinding = false
    }
  }
}
