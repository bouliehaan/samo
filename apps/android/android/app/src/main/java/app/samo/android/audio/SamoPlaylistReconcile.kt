package app.samo.android.audio

/**
 * The pure decision behind [SamoAudioEngine.reconcileExoPlaylistToQueue]: how
 * ExoPlayer's loaded playlist must change to match an edited Up Next queue,
 * without a Player in sight so it can be unit-tested.
 *
 * Three things can be true of the loaded playlist and the mirror at once, and
 * every native reader of the queue — `onMediaItemTransition` (adopts
 * `items[player index]`), `getStatusMap` (reports the player index as the
 * queue index) and `playQueueIndex` (seeks the player by queue index) — relies
 * on this invariant: WHEN THE PLAYER HOLDS MORE THAN ONE ITEM, ITS PLAYLIST IS
 * THE MIRROR, INDEX FOR INDEX. An append never threatened it (nothing before
 * the tail moves); a Play Next insert shifts every index after the current
 * item, so an edit the player does not receive leaves it playing one track
 * while the engine attributes another.
 */
internal object SamoPlaylistReconcile {
  sealed class Plan {
    /** Leave the player alone. */
    data class Skip(val reason: String) : Plan()

    /**
     * The player holds the queue as its playlist: replace everything around
     * the current item so the two match again. [currentIndex] is the current
     * item's index in the new queue (and, once applied, in the player).
     */
    data class Rewrite(
      val currentIndex: Int,
      val before: List<HashMap<String, Any?>>,
      val after: List<HashMap<String, Any?>>,
    ) : Plan()

    /**
     * The queue can no longer be a native playlist (an audiobook or a station
     * is in it now): shrink the player to the current item, and let the mirror
     * advance from [currentIndex] at STATE_ENDED, the way any queue with a book
     * in it plays from the start. [currentIndex] is a QUEUE index — the player
     * is left holding one item, at player index 0.
     */
    data class Collapse(val currentIndex: Int) : Plan()
  }

  /** Discrete whole files only: what the gapless ExoPlayer timeline can hold. */
  fun isPlaylistItem(item: Map<String, Any?>): Boolean {
    val source = item["source"] as? String
    return source == "music" || source == "podcast"
  }

  /**
   * @param playerMediaIds the media ids of the player's loaded playlist, in order
   * @param playerIndex the player's current item index
   * @param newQueue the edited mirror queue, null when JS sent an empty one
   */
  fun plan(
    playerMediaIds: List<String>,
    playerIndex: Int,
    newQueue: SamoNativePlaybackQueue?,
  ): Plan {
    if (playerMediaIds.size <= 1) {
      // Single-item mode: the mirror already owns advance, nothing to align.
      return Plan.Skip("single-item player")
    }
    if (playerIndex !in playerMediaIds.indices) {
      return Plan.Skip("player index out of range")
    }
    if (newQueue == null || newQueue.items.size < 2) {
      // JS reduced the queue to the playing item (or to something it will not
      // mirror). A playlist left loaded would carry on into rows the user just
      // removed, so the player keeps only what it is playing.
      return Plan.Collapse(0)
    }

    val currentId = playerMediaIds[playerIndex]
    // The queue's own index is the hint, the id is the check: a queue can hold
    // the same track twice (Play Next on the playing song is the everyday way),
    // and the first copy is not necessarily the one the player is on. Only
    // when the hint names another track is the first occurrence used.
    val hinted = newQueue.index
    val newCurrentIndex =
      if (hinted in newQueue.items.indices && itemId(newQueue.items[hinted]) == currentId) {
        hinted
      } else {
        newQueue.items.indexOfFirst { itemId(it) == currentId }
      }
    if (newCurrentIndex < 0) {
      // The playing track is no longer in the queue (it was removed). Leave it
      // playing rather than hard-cutting; the next natural advance lands on
      // whatever follows in the player's existing list.
      return Plan.Skip("current item not in queue")
    }
    if (newQueue.index != newCurrentIndex) {
      // The incoming queue does NOT consider the currently-playing item its
      // current one — this is a context switch (a play() for a different
      // track is in flight), not an Up-Next edit. Editing the live playlist
      // here would race the pending play(). play() rebuilds everything
      // atomically.
      return Plan.Skip("context switch")
    }

    if (!newQueue.items.all { isPlaylistItem(it) }) {
      return Plan.Collapse(newCurrentIndex)
    }

    return Plan.Rewrite(
      currentIndex = newCurrentIndex,
      before = newQueue.items.take(newCurrentIndex),
      after = newQueue.items.drop(newCurrentIndex + 1),
    )
  }

  private fun itemId(item: Map<String, Any?>): String? = item["id"] as? String
}
