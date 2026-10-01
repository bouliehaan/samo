package app.samo.android.audio

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * A stream token belongs on Samo's own media URLs only. Catalog images can name
 * someone else's host (a feed's artwork, a podcast CDN), and a token appended
 * there is a credential in that host's logs.
 */
class SamoCatalogImageUrlTest {

    private val serverUrl = "https://music.samo.app"

    private fun resolve(url: String): String? =
        SamoCatalogConverters.resolveSamoImageUrl(
            serverUrl,
            JSONArray().put(JSONObject().put("url", url)),
            "smt_secret",
        )

    @Test
    fun `third-party artwork gets no stream token`() {
        val feedArt = "https://cdn.example-podcasts.com/show/art.jpg?size=600"
        assertEquals(feedArt, resolve(feedArt))
    }

    @Test
    fun `samo artwork on the server's origin gets the token`() {
        assertEquals(
            "https://music.samo.app/api/v1/media/images/image_1/image?stream_token=smt_secret",
            resolve("https://music.samo.app/api/v1/media/images/image_1/image"),
        )
    }

    @Test
    fun `samo artwork under a scan-time host is re-homed before the token goes on`() {
        assertEquals(
            "https://music.samo.app/api/v1/music/albums/a1/cover?stream_token=smt_secret",
            resolve("http://127.0.0.1:6969/api/v1/music/albums/a1/cover?stream_token=stale"),
        )
    }
}
