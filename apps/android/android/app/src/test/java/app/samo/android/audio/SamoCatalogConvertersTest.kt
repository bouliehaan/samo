package app.samo.android.audio

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks playlist artwork resolution in the native catalog-mirror converter.
 *
 * The server composites a 2x2 grid at `/music/playlists/{id}/cover` whenever a
 * playlist carries more than one cover. The JS display resolver
 * (`resolveSamoItemArtworkSourceForDisplay`) prefers `artworkImageId` over
 * `artworkUrl`, so a grid playlist must NOT carry a single first-cover image id
 * here — otherwise the one cover overrides the grid and the tile shows a single
 * album. This is the Kotlin twin of the JS mapper fix (`samoPlaylistHasCoverGrid`).
 */
class SamoCatalogConvertersTest {

    private val serverUrl = "https://music.samo.app"
    private val token = "t"
    private val source = JSONObject().put("id", "src1").put("type", "samo")

    private fun playlistJson(vararg imageIds: String): JSONObject {
        val images = JSONArray()
        for (imageId in imageIds) {
            images.put(JSONObject().put("id", imageId))
        }
        return JSONObject()
            .put("id", "pl1")
            .put("name", "Road Trip")
            .put("trackCount", 12)
            .put("images", images)
    }

    private fun convert(playlist: JSONObject) =
        SamoCatalogConverters.playlistToItem(
            sourceId = "src1",
            serverUrl = serverUrl,
            streamToken = token,
            source = source,
            playlist = playlist,
            syncedAt = 1_000L,
        )!!

    @Test
    fun `multi-cover playlist uses the grid endpoint and drops the single image id`() {
        val binding = convert(playlistJson("cover_a", "cover_b", "cover_c", "cover_d"))

        assertEquals(
            "https://music.samo.app/api/v1/music/playlists/pl1/cover?stream_token=t",
            binding.artworkUrl,
        )
        assertNull(binding.artworkImageId)

        // The JS side reads the payload, so the id must be absent there too.
        val payload = JSONObject(binding.payload)
        assertFalse(payload.has("artworkImageId"))
        assertEquals(binding.artworkUrl, payload.optString("artworkUrl"))
    }

    @Test
    fun `two covers (the grid floor) still use the grid endpoint`() {
        val binding = convert(playlistJson("cover_a", "cover_b"))

        assertTrue(binding.artworkUrl!!.endsWith("/music/playlists/pl1/cover?stream_token=t"))
        assertNull(binding.artworkImageId)
    }

    @Test
    fun `single-cover playlist keeps its image id and resolves the single image`() {
        val binding = convert(playlistJson("cover_a"))

        assertEquals("cover_a", binding.artworkImageId)
        assertTrue(
            "expected a /media/images/ URL, got ${binding.artworkUrl}",
            binding.artworkUrl!!.contains("/media/images/cover_a/image"),
        )
    }

    @Test
    fun `playlist with no covers falls back to the grid endpoint with no image id`() {
        val binding = convert(playlistJson())

        assertTrue(binding.artworkUrl!!.endsWith("/music/playlists/pl1/cover?stream_token=t"))
        assertNull(binding.artworkImageId)
    }

    // -------------------------------------------------------------------
    // hiddenFromRecentlyAdded (explo folder integration): the server
    // excludes these albums from its own /recently-added endpoints, but
    // Android's home "Recently Added" shelf reads the on-device mirror
    // instead of calling that endpoint, so the flag has to survive into the
    // mirrored payload for recentlyAddedFromMirror (JS) to filter on.
    // -------------------------------------------------------------------

    private fun albumJson(hiddenFromRecentlyAdded: Boolean?): JSONObject {
        val album = JSONObject()
            .put("id", "album1")
            .put("title", "Weekly Mix 42")
            .put("addedAt", "2026-07-01T00:00:00Z")
        if (hiddenFromRecentlyAdded != null) {
            album.put("hiddenFromRecentlyAdded", hiddenFromRecentlyAdded)
        }
        return album
    }

    private fun convertAlbum(album: JSONObject) =
        SamoCatalogConverters.albumToItem(
            sourceId = "src1",
            serverUrl = serverUrl,
            streamToken = token,
            source = source,
            album = album,
            syncedAt = 1_000L,
        )!!

    @Test
    fun `explo-hidden album carries the flag into the mirrored payload`() {
        val binding = convertAlbum(albumJson(hiddenFromRecentlyAdded = true))

        val payload = JSONObject(binding.payload)
        assertTrue(payload.optBoolean("hiddenFromRecentlyAdded"))
    }

    @Test
    fun `ordinary album omits the flag entirely (not just false)`() {
        val fromMissingField = JSONObject(convertAlbum(albumJson(hiddenFromRecentlyAdded = null)).payload)
        val fromExplicitFalse = JSONObject(convertAlbum(albumJson(hiddenFromRecentlyAdded = false)).payload)

        assertFalse(fromMissingField.has("hiddenFromRecentlyAdded"))
        assertFalse(fromExplicitFalse.has("hiddenFromRecentlyAdded"))
    }
}
