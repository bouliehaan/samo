package app.samo.android.ime

import android.os.Build
import android.util.Log
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsAnimationControlListener
import android.view.WindowInsetsAnimationController
import android.view.animation.LinearInterpolator
import androidx.annotation.RequiresApi
import androidx.core.graphics.Insets
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Frame-accurate control of the soft keyboard, so the IME can be dragged up and
 * down by a finger instead of playing its own canned animation after the fact.
 *
 * This exists because there is NO other way. React Native exposes only
 * focus/blur, which asks the system to run its own show/hide animation on its
 * own clock. `react-native-keyboard-controller` reports where the IME is but
 * cannot put it anywhere. The only API on Android that actually hands over the
 * IME's position is `WindowInsetsController.controlWindowInsetsAnimation`, which
 * gives back a `WindowInsetsAnimationController` whose `setInsetsAndAlpha` moves
 * the keyboard to an exact pixel offset, once per frame, for as long as we hold
 * it. That is the whole point of this file.
 *
 * Requires API 30 (Android 11). Below that, `isSupported` is false and callers
 * fall back to ordinary focus.
 *
 * Sequence:
 *   start()        request control; resolves once the controller is READY, which
 *                  is asynchronous — the IME may take a frame or two to hand it
 *                  over, so callers must tolerate the first frames doing nothing.
 *   setFraction(f) 0 = fully hidden, 1 = fully shown. Called per frame.
 *   finish(shown)  release control, letting the IME settle to shown/hidden.
 *
 * Anything that focuses or dismisses the keyboard by the normal route while a
 * control session is live will cause the request to be cancelled — the system
 * refuses to hand over control of an IME that is already animating.
 */
class SamoImeControlModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    /** Non-null only between a READY start() and finish(). */
    private var controller: WindowInsetsAnimationController? = null

    /** Set while a request is in flight so a second start() cannot stack. */
    private var isRequesting = false

    /**
     * Set when finish() ran while a request was still in flight — the gesture was
     * over before the system got round to handing control over.
     *
     * Control is granted ASYNCHRONOUSLY and slowly (~740ms measured), while a
     * flick can be done inside 50ms. finish() then found no controller and
     * returned having done nothing, and onReady arrived long afterwards to hand
     * us a session for a gesture that no longer existed — held, undriven, and
     * never released. A held IME belongs to us and stops answering focus, so the
     * next search opened silently with no keyboard. Whoever arrives last honours
     * the intent: if the finish got here first, onReady releases immediately.
     */
    private var finishOnReady: Boolean? = null

    /** Cached so finish() can report the right end state even if the IME is
     *  already at one extreme. */
    private var hiddenBottom = 0
    private var shownBottom = 0

    @ReactMethod
    fun isSupported(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
    }

    @ReactMethod
    fun start(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            promise.resolve(false)
            return
        }
        if (controller != null) {
            // Already driving. Not an error — a second crossing inside one gesture
            // just keeps the live session.
            promise.resolve(true)
            return
        }
        // DELIBERATELY does not bail on `isRequesting`. A request that never
        // produced any callback — the system supersedes them freely — would
        // otherwise wedge this module for the rest of the process: every later
        // start() would early-return false and the keyboard would never move
        // again. Re-requesting is safe; the stale listener is inert because its
        // settle-guard has already fired or will resolve into nothing.
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        Log.d(NAME, "start() requested")
        isRequesting = true
        // A fresh request supersedes any finish that was waiting on the old one.
        finishOnReady = null
        activity.runOnUiThread {
            val decor: View? = activity.window?.decorView
            if (decor == null) {
                isRequesting = false
                promise.resolve(false)
                return@runOnUiThread
            }
            startOnUiThread(decor, promise)
        }
    }

    @RequiresApi(Build.VERSION_CODES.R)
    private fun startOnUiThread(decor: View, promise: Promise) {
        val insetsController = decor.windowInsetsController
        if (insetsController == null) {
            isRequesting = false
            promise.resolve(false)
            return
        }
        // The keyboard must be focusable before the system will animate it in;
        // control alone does not create an IME target.
        insetsController.controlWindowInsetsAnimation(
            WindowInsets.Type.ime(),
            // No duration/interpolator of our own: the finger IS the clock. A
            // non-null duration here would hand the animation back to the system.
            -1L,
            LinearInterpolator(),
            null,
            object : WindowInsetsAnimationControlListener {
                /** The system may call more than one of these across a superseded
                 *  request; a Promise may only be settled once. */
                private var settled = false

                private fun settle(granted: Boolean) {
                    if (settled) {
                        return
                    }
                    settled = true
                    promise.resolve(granted)
                }

                override fun onReady(
                    readyController: WindowInsetsAnimationController,
                    types: Int,
                ) {
                    Log.d(NAME, "onReady")
                    isRequesting = false
                    hiddenBottom = readyController.hiddenStateInsets.bottom
                    shownBottom = readyController.shownStateInsets.bottom
                    val pendingFinish = finishOnReady
                    if (pendingFinish != null) {
                        // The gesture ended before this arrived. Take the session
                        // and give it straight back at the end state the release
                        // asked for — never park it here for nobody to drive.
                        Log.d(NAME, "onReady after finish(shown=" + pendingFinish + ")")
                        finishOnReady = null
                        controller = null
                        releaseController(readyController, pendingFinish)
                        settle(false)
                        return
                    }
                    controller = readyController
                    settle(true)
                }

                override fun onFinished(finishedController: WindowInsetsAnimationController) {
                    Log.d(NAME, "onFinished mine=" + (controller === finishedController))
                    if (controller === finishedController) {
                        controller = null
                    }
                    isRequesting = false
                    // Nothing left for a waiting finish() to be handed.
                    finishOnReady = null
                    settle(false)
                }

                override fun onCancelled(
                    cancelledController: WindowInsetsAnimationController?,
                ) {
                    // The system took the IME back — most often because something
                    // else focused or dismissed it mid-session. Only clear the
                    // shared handle if it is OURS; a superseded request must not
                    // null out a newer, live controller.
                    Log.d(NAME, "onCANCELLED mine=" + (controller === cancelledController))
                    if (cancelledController == null || controller === cancelledController) {
                        controller = null
                    }
                    isRequesting = false
                    finishOnReady = null
                    settle(false)
                }
            },
        )
    }

    /**
     * Put the keyboard at `fraction` of its travel, right now. 0 hidden, 1 shown.
     * Values outside that are clamped rather than rejected, so a rubber-banding
     * gesture can overshoot without having to special-case its own maths.
     */
    @ReactMethod
    fun setFraction(fraction: Double) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return
        }
        val active = controller ?: return
        val clamped = fraction.coerceIn(0.0, 1.0)
        val bottom = (hiddenBottom + (shownBottom - hiddenBottom) * clamped).toInt()
        reactContext.currentActivity?.runOnUiThread {
            // Re-read: the session can end between the JS call and this frame.
            val live = controller ?: return@runOnUiThread
            live.setInsetsAndAlpha(
                Insets.of(0, 0, 0, bottom).toPlatformInsets(),
                1f,
                clamped.toFloat(),
            )
        }
    }

    /**
     * Release the IME, settling it to `shown`. The system animates the remaining
     * distance from wherever the finger left it, which is what makes a released
     * gesture continue instead of snapping.
     */
    @ReactMethod
    fun finish(shown: Boolean) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return
        }
        val activity = reactContext.currentActivity ?: return
        activity.runOnUiThread {
            val live = controller
            controller = null
            Log.d(
                NAME,
                "finish(shown=" + shown + ") hadSession=" + (live != null) +
                    " requesting=" + isRequesting,
            )
            if (live == null) {
                if (isRequesting) {
                    // Control was asked for and has not landed yet. Leave word for
                    // onReady rather than dropping this on the floor: without it
                    // the grant arrives after the gesture is over and is held for
                    // good (see `finishOnReady`).
                    finishOnReady = shown
                    return@runOnUiThread
                }
                // Never had control and none is coming, so there is nothing to
                // finish and NOTHING to assert. Falling through to show()/hide()
                // here made a callsite that merely wanted to tidy up issue a real
                // app-level IME request — a stray hide() at rest, which then
                // suppressed the ordinary focus() that the fling path relies on to
                // raise the keyboard.
                return@runOnUiThread
            }
            isRequesting = false
            releaseController(live, shown)
        }
    }

    /**
     * Hand a session back, settling the IME to `shown`.
     *
     * `finish()` ends the SESSION; it does not by itself make the end state
     * stick. Without an explicit request the IME reverts to whatever it was
     * before control was taken — so a drag that carried the keyboard all the way
     * up would drop it again the instant the finger lifted.
     *
     * Both call sites are already inside an API-30 guard — `finish()` returns
     * early below R, and `onReady` only exists inside the annotated request.
     */
    @RequiresApi(Build.VERSION_CODES.R)
    private fun releaseController(live: WindowInsetsAnimationController, shown: Boolean) {
        live.finish(shown)
        val insetsController =
            reactContext.currentActivity?.window?.decorView?.windowInsetsController
        if (shown) {
            insetsController?.show(WindowInsets.Type.ime())
        } else {
            insetsController?.hide(WindowInsets.Type.ime())
        }
    }

    companion object {
        const val NAME = "SamoImeControl"
    }
}
