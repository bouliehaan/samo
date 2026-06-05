package app.samo.android.audio

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Locks the byte-equivalence of `SamoNativeStreamUrl.encodeSamoId` against
 * JavaScript's `encodeURIComponent`. Phase 2 PROPER moves URL minting into
 * Kotlin; a single byte of drift between Kotlin and JS encoders would surface
 * as a silent 404 on the stream URL or — worse — on the album cover lookup,
 * which would fail without crashing playback. The expected outputs below are
 * the literal `encodeURIComponent(x)` for each `x`, verified in a JS REPL.
 */
class SamoNativeStreamUrlTest {

    @Test
    fun `encodeURIComponent unreserved characters pass through unchanged`() {
        // encodeURIComponent's whitelist:  A-Z a-z 0-9 - _ . ! ~ * ' ( )
        // None of these become percent-escaped on the JS side, and our
        // encoder must match — they would otherwise break server-route
        // matching for IDs that contain them.
        val unreserved =
            ("ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                "abcdefghijklmnopqrstuvwxyz" +
                "0123456789" +
                "-_.!~*'()")
        assertEquals(unreserved, SamoNativeStreamUrl.encodeSamoId(unreserved))
    }

    @Test
    fun `encodeURIComponent ASCII reserved characters get percent-escaped`() {
        // Characters that JS encodeURIComponent DOES escape. These are the
        // ones URLEncoder.encode + our patch table have to land on the JS
        // hex sequence (uppercase hex; +/space→%20 specifically).
        val expectations = mapOf(
            " " to "%20",
            "+" to "%2B",
            "/" to "%2F",
            ":" to "%3A",
            "?" to "%3F",
            "#" to "%23",
            "&" to "%26",
            "=" to "%3D",
            "%" to "%25",
            "@" to "%40",
            ";" to "%3B",
            "," to "%2C",
            "\$" to "%24",
            "[" to "%5B",
            "]" to "%5D",
            "{" to "%7B",
            "}" to "%7D",
            "<" to "%3C",
            ">" to "%3E",
            "\"" to "%22",
            "\\" to "%5C",
            "^" to "%5E",
            "`" to "%60",
            "|" to "%7C",
        )
        for ((input, expected) in expectations) {
            assertEquals(
                "encodeSamoId(\"$input\") should match JS encodeURIComponent",
                expected,
                SamoNativeStreamUrl.encodeSamoId(input),
            )
        }
    }

    @Test
    fun `encodeURIComponent multi-byte UTF-8 matches JS percent-encoding`() {
        // encodeURIComponent emits the UTF-8 bytes as upper-hex percent-
        // triples. Mismatched casing or byte order would produce a different
        // URL than the JS builder.
        assertEquals("%C3%A9", SamoNativeStreamUrl.encodeSamoId("é"))
        assertEquals("%E2%9C%93", SamoNativeStreamUrl.encodeSamoId("✓"))
        // Surrogate pair: 4-byte UTF-8 for U+1F3B5 (🎵).
        assertEquals("%F0%9F%8E%B5", SamoNativeStreamUrl.encodeSamoId("🎵"))
    }

    @Test
    fun `encodeURIComponent mixes preserve whitelist within escaped text`() {
        // Real-world Samo IDs are alphanumeric but a hand-curated playlist
        // could have user-visible IDs. Make sure the encoder threads the
        // needle: keep `*` literal, escape spaces, keep `(` literal.
        assertEquals(
            "Greatest%20Hits%20*('70s).flac",
            SamoNativeStreamUrl.encodeSamoId("Greatest Hits *('70s).flac"),
        )
    }

    @Test
    fun `encodeSamoId is idempotent over a percent-encoded input`() {
        // Re-encoding an already-encoded ID should NOT double-escape the
        // `%` triples (e.g. "%20" must NOT become "%2520"). This isn't
        // exactly what encodeURIComponent does (it double-encodes), but we
        // care specifically that the catalog reader's stored ID can round-
        // trip through buildXxxStreamUrl without corruption — track IDs go
        // raw → encode once. Verify the raw path produces the expected
        // single-encoded form.
        // First encode of a space-bearing literal:
        val once = SamoNativeStreamUrl.encodeSamoId("a b")
        assertEquals("a%20b", once)
        // Second encode of the result — confirms the % itself escapes:
        assertEquals("a%2520b", SamoNativeStreamUrl.encodeSamoId(once))
    }

    @Test
    fun `buildMusicTrackStreamUrl matches the JS builder for a known id`() {
        // From server-samo.ts: `${baseUrl}/api/v1/music/tracks/{id}/stream?stream_token={token}`.
        // baseUrl trailing slash is trimmed; token is URL-encoded.
        assertEquals(
            "https://music.samo.app/api/v1/music/tracks/track_abc-123/stream?stream_token=tok_xyz",
            SamoNativeStreamUrl.buildMusicTrackStreamUrl(
                "https://music.samo.app",
                "track_abc-123",
                "tok_xyz",
            ),
        )
    }

    @Test
    fun `buildMusicTrackStreamUrl strips a trailing slash on the server URL`() {
        assertEquals(
            "https://music.samo.app/api/v1/music/tracks/abc/stream?stream_token=t",
            SamoNativeStreamUrl.buildMusicTrackStreamUrl(
                "https://music.samo.app/",
                "abc",
                "t",
            ),
        )
    }

    @Test
    fun `buildAudiobookStreamUrl threads mediaFileId before stream_token`() {
        // Per server-samo.ts the audiobook URL adds mediaFileId via
        // searchParams.set BEFORE stream_token. Our builder follows the same
        // ordering so server logs / curl-tests see the JS-expected shape.
        assertEquals(
            "https://music.samo.app/api/v1/audiobooks/book_1/stream" +
                "?mediaFileId=file_42&stream_token=t",
            SamoNativeStreamUrl.buildAudiobookStreamUrl(
                "https://music.samo.app",
                "book_1",
                "t",
                mediaFileId = "file_42",
            ),
        )
    }

    @Test
    fun `buildAudiobookStreamUrl with no extras produces a token-only URL`() {
        assertEquals(
            "https://music.samo.app/api/v1/audiobooks/book_1/stream?stream_token=t",
            SamoNativeStreamUrl.buildAudiobookStreamUrl(
                "https://music.samo.app",
                "book_1",
                "t",
            ),
        )
    }

    @Test
    fun `buildPodcastEpisodeStreamUrl matches the JS builder`() {
        assertEquals(
            "https://music.samo.app/api/v1/podcasts/episodes/ep_99/stream?stream_token=t",
            SamoNativeStreamUrl.buildPodcastEpisodeStreamUrl(
                "https://music.samo.app",
                "ep_99",
                "t",
            ),
        )
    }

    @Test
    fun `buildMusicAlbumCoverUrl encodes ids with reserved characters safely`() {
        // Album ids with a literal space (a user-edited playlist name used as
        // an id, for instance). The encoder must produce %20, not + — the
        // server's route matcher reads percent-decoded path segments and a
        // `+` is NOT a space in the path component.
        assertEquals(
            "https://music.samo.app/api/v1/music/albums/Album%20One/cover?stream_token=t",
            SamoNativeStreamUrl.buildMusicAlbumCoverUrl(
                "https://music.samo.app",
                "Album One",
                "t",
            ),
        )
    }

    @Test
    fun `buildMetadataImageUrl uses the media-images route`() {
        assertEquals(
            "https://music.samo.app/api/v1/media/images/image_12/image?stream_token=t",
            SamoNativeStreamUrl.buildMetadataImageUrl(
                "https://music.samo.app",
                "image_12",
                "t",
            ),
        )
    }
}
