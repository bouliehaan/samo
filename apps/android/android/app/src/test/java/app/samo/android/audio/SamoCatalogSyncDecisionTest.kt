package app.samo.android.audio

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks the mirror-completeness decision logic ported from the (deleted)
 * catalog-sync-completeness.ts. The cases mirror its vitest suite: transient
 * shortfalls retry, structural residue doesn't loop, server growth re-arms.
 */
class SamoCatalogSyncDecisionTest {
    private fun manifest(
        albums: Int = 0,
        artists: Int = 0,
        audiobooks: Int = 0,
        playlists: Int = 0,
        podcasts: Int = 0,
        episodes: Int = 0,
    ): JSONObject {
        fun ids(count: Int): JSONArray {
            val array = JSONArray()
            repeat(count) { array.put("id-$it") }
            return array
        }
        return JSONObject().put(
            "ids",
            JSONObject()
                .put("albums", ids(albums))
                .put("artists", ids(artists))
                .put("audiobooks", ids(audiobooks))
                .put("playlists", ids(playlists))
                .put("podcasts", ids(podcasts))
                .put("episodes", ids(episodes))
                .put("tracks", ids(0)),
        )
    }

    @Test
    fun manifestItemCountSumsTheFiveBrowseVariants() {
        val m = manifest(albums = 3, artists = 2, audiobooks = 1, playlists = 4, podcasts = 5, episodes = 99)
        // Episodes and tracks are NOT items.
        assertEquals(15L, SamoCatalogSync.manifestItemCount(m))
    }

    @Test
    fun backfillTriggersWhenMirrorIsShortOfAGrownManifest() {
        assertTrue(SamoCatalogSync.shouldBackfillMirror(localItems = 10, manifestItems = 20, reconciledItems = 0))
    }

    @Test
    fun backfillSkipsWhenMirrorMatchesManifest() {
        assertFalse(SamoCatalogSync.shouldBackfillMirror(localItems = 20, manifestItems = 20, reconciledItems = 0))
    }

    @Test
    fun structuralResidueDoesNotLoopForever() {
        // We already reconciled at size 20; a few unmappable rows leave the
        // mirror at 18. No re-trigger until the server grows past 20.
        assertFalse(SamoCatalogSync.shouldBackfillMirror(localItems = 18, manifestItems = 20, reconciledItems = 20))
    }

    @Test
    fun serverGrowthReArmsTheBackfill() {
        assertTrue(SamoCatalogSync.shouldBackfillMirror(localItems = 18, manifestItems = 25, reconciledItems = 20))
    }

    @Test
    fun reconciledCountAdvancesOnlyOnCleanRuns() {
        assertEquals(20L, SamoCatalogSync.nextReconciledItemCount(hadErrors = false, manifestItems = 20, priorReconciled = 5))
        // A transient failure keeps the prior value so the next sync retries.
        assertEquals(5L, SamoCatalogSync.nextReconciledItemCount(hadErrors = true, manifestItems = 20, priorReconciled = 5))
    }

    @Test
    fun emptyManifestNeverTriggersBackfill() {
        assertFalse(SamoCatalogSync.shouldBackfillMirror(localItems = 0, manifestItems = 0, reconciledItems = 0))
    }
}
