package app.samo.android.audio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks the mirror-queue decision in [buildNativePlaybackQueue]. The regression
 * this guards: a backgrounded "podcast -> radio" (also music/audiobook -> radio,
 * or radio mid-queue) queue must keep the radio item in the native mirror so the
 * Kotlin auto-advance can start it while the JS thread is frozen by Doze. The
 * JS gate (playback-queue-mirror.ts) was fixed for this case; the old Kotlin
 * parser still threw the whole queue away on any radio item, so the radio never
 * started until the phone was unlocked.
 */
class SamoNativePlaybackQueueTest {
  private fun item(source: String, id: String): HashMap<String, Any?> =
    hashMapOf("source" to source, "id" to id, "url" to "https://samo.example/$id")

  @Test
  fun keepsRadioSittingLaterInQueue() {
    val queue = buildNativePlaybackQueue(
      listOf(item("podcast", "p1"), item("radio", "r1")),
      0,
      "podcast",
    )
    assertNotNull("podcast -> radio must mirror so native can advance into radio", queue)
    assertEquals(2, queue!!.items.size)
    assertEquals("radio", queue.items[1]["source"])
    assertTrue("native advance must see a next item", queue.hasNext())
  }

  @Test
  fun keepsRadioInTheMiddleOfTheQueue() {
    val queue = buildNativePlaybackQueue(
      listOf(item("music", "m1"), item("radio", "r1"), item("podcast", "p1")),
      0,
      "music",
    )
    assertNotNull(queue)
    assertEquals(3, queue!!.items.size)
    assertEquals("radio", queue.items[1]["source"])
    assertEquals("podcast", queue.items[2]["source"])
  }

  @Test
  fun keepsRadioAfterAMultiFileAudiobook() {
    val queue = buildNativePlaybackQueue(
      listOf(item("audiobook", "b1f1"), item("audiobook", "b1f2"), item("radio", "r1")),
      0,
      "audiobook",
    )
    assertNotNull(queue)
    assertEquals(3, queue!!.items.size)
    assertEquals("radio", queue.items[2]["source"])
  }

  @Test
  fun refusesWhenRadioIsTheCurrentItem() {
    // Radio is live/endless — when it's the playing item there's nothing to
    // advance, so no mirror (matches the JS gate's radio-as-current branch).
    val queue = buildNativePlaybackQueue(
      listOf(item("radio", "r1"), item("music", "m1")),
      0,
      "radio",
    )
    assertNull(queue)
  }

  @Test
  fun refusesSingleItemQueue() {
    assertNull(buildNativePlaybackQueue(listOf(item("music", "m1")), 0, "music"))
  }

  @Test
  fun clampsOutOfRangeIndex() {
    val queue = buildNativePlaybackQueue(
      listOf(item("music", "m1"), item("music", "m2")),
      9,
      "music",
    )
    assertNotNull(queue)
    assertEquals(1, queue!!.index)
  }
}
