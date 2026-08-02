package app.samo.android.audio

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks the stored-detail projection (SamoCatalogSync.slimDetailBundle).
 *
 * The shapes here are taken from a real 167MB catalog whose `catalog_detail`
 * table had grown to 78MB across 2,241 rows: podcast episode arrays stored
 * inline in the bundle AND fanned out into catalog_track, and an
 * `embeddedTags` blob on every audio file whose `metadata_block_picture` key
 * is the file's cover art as base64 — ~59KB per file, the same cover repeated
 * once per episode.
 */
class SamoCatalogDetailProjectionTest {
    /** An audio file carrying the base64-cover-art tag dump. */
    private fun audioFile(id: String): JSONObject =
        JSONObject()
            .put("id", id)
            .put("mimeType", "audio/opus")
            .put(
                "embeddedTags",
                JSONObject()
                    .put("title", JSONArray().put("Alexander vs. Hitler"))
                    .put(
                        "metadata_block_picture",
                        JSONArray().put("AAAAAwAAAAppbWFnZS9qcGVn".repeat(64)),
                    ),
            )

    private fun podcastBundle(episodeCount: Int): JSONObject {
        val episodes = JSONArray()
        repeat(episodeCount) { index ->
            episodes.put(
                JSONObject()
                    .put("id", "ep-$index")
                    .put("title", "Episode $index")
                    .put("audioFiles", JSONArray().put(audioFile("file-$index"))),
            )
        }
        return JSONObject()
            .put("\$samoRawDetail", 1)
            .put("kind", "podcast")
            .put("entity", JSONObject().put("id", "show-1").put("title", "A Show"))
            .put("children", JSONObject().put("episodes", episodes))
    }

    @Test
    fun `podcast episodes are dropped from the stored bundle`() {
        val slim = SamoCatalogSync.slimDetailBundle("podcast", podcastBundle(3))

        assertFalse(
            "episodes are fanned out into catalog_track; storing them inline too is a second unread copy",
            slim.getJSONObject("children").has("episodes"),
        )
        // The envelope the JS read path type-guards on must survive.
        assertEquals(1, slim.getInt("\$samoRawDetail"))
        assertEquals("podcast", slim.getString("kind"))
        assertEquals("A Show", slim.getJSONObject("entity").getString("title"))
    }

    @Test
    fun `playlist tracks are dropped from the stored bundle`() {
        val bundle = JSONObject()
            .put("\$samoRawDetail", 1)
            .put("kind", "playlist")
            .put("entity", JSONObject().put("id", "pl-1"))
            .put("children", JSONObject().put("tracks", JSONArray().put(JSONObject().put("id", "t1"))))

        val slim = SamoCatalogSync.slimDetailBundle("playlist", bundle)

        assertFalse(slim.getJSONObject("children").has("tracks"))
    }

    @Test
    fun `artist children are kept — the read path maps them from the bundle`() {
        val bundle = JSONObject()
            .put("\$samoRawDetail", 1)
            .put("kind", "artist")
            .put("entity", JSONObject().put("id", "ar-1").put("biography", "words"))
            .put(
                "children",
                JSONObject()
                    .put("albums", JSONArray().put(JSONObject().put("id", "al-1")))
                    .put("topTracks", JSONArray().put(JSONObject().put("id", "tt-1")))
                    .put("appearsOn", JSONArray().put(JSONObject().put("id", "ao-1"))),
            )

        val slim = SamoCatalogSync.slimDetailBundle("artist", bundle)

        // Artists have no fan-out — mapSamoArtistDetail reads these directly.
        val children = slim.getJSONObject("children")
        assertEquals(1, children.getJSONArray("albums").length())
        assertEquals(1, children.getJSONArray("topTracks").length())
        assertEquals(1, children.getJSONArray("appearsOn").length())
        assertEquals("words", slim.getJSONObject("entity").getString("biography"))
    }

    @Test
    fun `embeddedTags are stripped from audio files at any depth`() {
        val bundle = JSONObject()
            .put("\$samoRawDetail", 1)
            .put("kind", "audiobook")
            .put(
                "entity",
                JSONObject()
                    .put("id", "book-1")
                    .put("audioFiles", JSONArray().put(audioFile("f1")).put(audioFile("f2"))),
            )
            .put(
                "children",
                JSONObject().put(
                    "sessions",
                    JSONArray().put(
                        JSONObject().put("media", JSONObject().put("audioFiles", JSONArray().put(audioFile("f3")))),
                    ),
                ),
            )

        val slim = SamoCatalogSync.slimDetailBundle("audiobook", bundle)

        val files = slim.getJSONObject("entity").getJSONArray("audioFiles")
        for (i in 0 until files.length()) {
            assertFalse(
                "embeddedTags is never read anywhere in the repo",
                files.getJSONObject(i).has("embeddedTags"),
            )
            // Everything the playback path DOES read must survive.
            assertNotNull(files.getJSONObject(i).getString("id"))
            assertEquals("audio/opus", files.getJSONObject(i).getString("mimeType"))
        }

        val nested = slim.getJSONObject("children")
            .getJSONArray("sessions")
            .getJSONObject(0)
            .getJSONObject("media")
            .getJSONArray("audioFiles")
            .getJSONObject(0)
        assertFalse("nested audio files are stripped too", nested.has("embeddedTags"))
    }

    @Test
    fun `projection collapses the payload that made podcast rows megabytes`() {
        val full = podcastBundle(109).toString().length
        val slim = SamoCatalogSync.slimDetailBundle("podcast", podcastBundle(109)).toString().length

        assertTrue(
            "expected a large reduction, got $full → $slim bytes",
            slim < full / 100,
        )
    }

    @Test
    fun `stripping tolerates bundles with no audio files`() {
        val bundle = JSONObject()
            .put("\$samoRawDetail", 1)
            .put("kind", "artist")
            .put("entity", JSONObject().put("id", "ar-1"))
            .put("children", JSONObject())

        // Must not throw on a bundle that has nothing to strip.
        val slim = SamoCatalogSync.slimDetailBundle("artist", bundle)
        assertEquals("ar-1", slim.getJSONObject("entity").getString("id"))
    }
}
