package app.samo.android.audio

import app.samo.android.audio.SamoPlaylistReconcile.Plan
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks the alignment contract between ExoPlayer's loaded playlist and the
 * mirror queue after an Up Next edit. The regression this guards: Play Next
 * inserts shift every index after the current item, and an edit the player
 * did not receive (a book in the queue, or a duplicate id misread as a context
 * switch) left the engine attributing one track while another played.
 */
class SamoPlaylistReconcileTest {
  private fun item(source: String, id: String): HashMap<String, Any?> =
    hashMapOf("source" to source, "id" to id, "url" to "https://samo.example/$id")

  private fun music(vararg ids: String) = ids.map { item("music", it) }

  private fun queue(items: List<HashMap<String, Any?>>, index: Int) =
    SamoNativePlaybackQueue(items.toMutableList(), index)

  private fun ids(items: List<HashMap<String, Any?>>) = items.map { it["id"] as String }

  @Test
  fun playNextInsertRewritesTheTailAroundTheCurrentItem() {
    // Player: a b c, playing b. Play Next x → a b x c.
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b", "c"),
      playerIndex = 1,
      newQueue = queue(music("a", "b", "x", "c"), 1),
    )
    assertTrue(plan is Plan.Rewrite)
    plan as Plan.Rewrite
    assertEquals(1, plan.currentIndex)
    assertEquals(listOf("a"), ids(plan.before))
    assertEquals(listOf("x", "c"), ids(plan.after))
  }

  @Test
  fun playLastAppendRewritesTheTail() {
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b", "c"),
      playerIndex = 2,
      newQueue = queue(music("a", "b", "c", "x", "y"), 2),
    )
    assertTrue(plan is Plan.Rewrite)
    plan as Plan.Rewrite
    assertEquals(2, plan.currentIndex)
    assertEquals(listOf("a", "b"), ids(plan.before))
    assertEquals(listOf("x", "y"), ids(plan.after))
  }

  @Test
  fun aCollectionLandsAsAnOrderedBlockRightAfterTheCurrentItem() {
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b", "c"),
      playerIndex = 0,
      newQueue = queue(music("a", "p1", "p2", "p3", "b", "c"), 0),
    )
    plan as Plan.Rewrite
    assertEquals(listOf("p1", "p2", "p3", "b", "c"), ids(plan.after))
    assertTrue(plan.before.isEmpty())
  }

  @Test
  fun playNextOfThePlayingSongIsAnEditNotAContextSwitch() {
    // a b c playing b; Play Next b → a b b c, index 1. Both copies share an
    // id; the hint (index 1) names the playing copy, so this is an edit.
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b", "c"),
      playerIndex = 1,
      newQueue = queue(music("a", "b", "b", "c"), 1),
    )
    plan as Plan.Rewrite
    assertEquals(1, plan.currentIndex)
    assertEquals(listOf("b", "c"), ids(plan.after))
  }

  @Test
  fun aDuplicateEarlierInHistoryDoesNotMasqueradeAsTheCurrentItem() {
    // b x b c, playing the SECOND b (index 2). Play Next d → b x b d c.
    // indexOfFirst("b") would say 0 ≠ 2 and skip the edit as a context
    // switch, leaving the player on b x b c: when b ended the player moved to
    // c while the mirror said d.
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("b", "x", "b", "c"),
      playerIndex = 2,
      newQueue = queue(music("b", "x", "b", "d", "c"), 2),
    )
    plan as Plan.Rewrite
    assertEquals(2, plan.currentIndex)
    assertEquals(listOf("b", "x"), ids(plan.before))
    assertEquals(listOf("d", "c"), ids(plan.after))
  }

  @Test
  fun aRealContextSwitchIsStillSkipped() {
    // The queue's current item is a different track: a play() is in flight.
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b", "c"),
      playerIndex = 1,
      newQueue = queue(music("x", "y", "z"), 0),
    )
    assertEquals(Plan.Skip("current item not in queue"), plan)

    val shifted = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b", "c"),
      playerIndex = 1,
      newQueue = queue(music("a", "b", "c"), 2),
    )
    assertEquals(Plan.Skip("context switch"), shifted)
  }

  @Test
  fun anAudiobookInsertedNextCollapsesThePlayerToTheCurrentItem() {
    // A music playlist is loaded; Play Next a two-file book. The timeline
    // cannot hold book files, and an un-applied insert would misalign every
    // index after the song — so the player keeps only the song and the mirror
    // advances from queue index 1 at STATE_ENDED.
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b", "c"),
      playerIndex = 1,
      newQueue = queue(
        music("a", "b") + listOf(item("audiobook", "bk:f1"), item("audiobook", "bk:f2")) + music("c"),
        1,
      ),
    )
    assertEquals(Plan.Collapse(1), plan)
  }

  @Test
  fun aStationQueuedLastCollapsesTheSameWay() {
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b"),
      playerIndex = 0,
      newQueue = queue(music("a", "b") + listOf(item("radio", "r1")), 0),
    )
    assertEquals(Plan.Collapse(0), plan)
  }

  @Test
  fun podcastEpisodesStayOnTheTimeline() {
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b"),
      playerIndex = 0,
      newQueue = queue(music("a") + listOf(item("podcast", "ep1")) + music("b"), 0),
    )
    plan as Plan.Rewrite
    assertEquals(listOf("ep1", "b"), ids(plan.after))
  }

  @Test
  fun aSingleItemPlayerIsLeftToTheMirror() {
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a"),
      playerIndex = 0,
      newQueue = queue(music("a", "x"), 0),
    )
    assertEquals(Plan.Skip("single-item player"), plan)
  }

  @Test
  fun aQueueShrunkToThePlayingItemCollapsesThePlayer() {
    // The player would otherwise carry on into rows the user just removed.
    val plan = SamoPlaylistReconcile.plan(
      playerMediaIds = listOf("a", "b", "c"),
      playerIndex = 0,
      newQueue = null,
    )
    assertEquals(Plan.Collapse(0), plan)
  }
}
