package app.samo.android

import android.view.Window
import android.view.WindowManager
import java.lang.ref.WeakReference

/**
 * Keeps the screen on while samo is playing a program, so a television treats
 * it the way it treats live TV.
 *
 * Playback holds only a CPU wake lock (ExoPlayer's WAKE_MODE_NETWORK), and
 * Android does not count that as anything being on screen. So the TV ran its
 * idle timers over the music: the screensaver came on at screen_off_timeout
 * after the last remote press, and at sleep_timeout the box went to sleep,
 * HDMI dropped and the TV switched off. Video apps avoid this the same way:
 * the visible window carries FLAG_KEEP_SCREEN_ON while something plays.
 *
 * JS decides when a program is on, because only JS sees the `loading` gap
 * while a queue step resolves its next item. This object applies that state
 * to whichever window exists. A recreated activity picks the state up in
 * onCreate; a flag set once on the old window would be lost with it.
 *
 * Main thread only.
 */
object SamoScreenAwake {
  private var held = false
  private var window: WeakReference<Window>? = null

  fun attach(target: Window) {
    window = WeakReference(target)
    apply(target)
  }

  fun detach(target: Window) {
    if (window?.get() === target) window = null
  }

  fun setHeld(value: Boolean) {
    held = value
    window?.get()?.let(::apply)
  }

  private fun apply(target: Window) {
    if (held) {
      target.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    } else {
      target.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
  }
}
