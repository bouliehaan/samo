package app.samo.android.audio

import app.samo.android.audio.SamoAuthMirror.Connection
import app.samo.android.audio.SamoAuthMirror.Sessions
import app.samo.android.audio.SamoSessionCredentials.Claim
import app.samo.android.audio.SamoSessionCredentials.Resolution
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Locks which credential a stored record sends with.
 *
 * Disconnecting revokes the device's token on the server, so any record still
 * holding the token it was stamped with presents a dead one after the user
 * signs back in: a download that 401s forever, a progress write that never
 * lands. Each case below is a way the record's copy could win when the
 * session the device holds now should, or a way a signed-out device could
 * still send something.
 */
class SamoSessionCredentialsTest {
    private val home = "http://192.168.1.20:8991"
    private val away = "https://samo.example.net"

    private fun samo(url: String, credential: String, key: String? = "samo:srv-1") =
        Connection(type = "samo", url = url, credential = credential, ndCredential = null, connectionKey = key)

    private fun known(vararg connections: Connection) = Sessions.Known(connections.toList())

    @Test
    fun `a record stamped before a reconnect sends the token the device holds now`() {
        val claim = Claim(connectionKey = "samo:srv-1", serverUrl = home, credential = "revoked")
        assertEquals(
            Resolution.Current(home, "fresh"),
            SamoSessionCredentials.resolve(claim, known(samo(home, "fresh"))),
        )
    }

    @Test
    fun `the connection key follows the server to its other address`() {
        val claim = Claim(connectionKey = "samo:srv-1", serverUrl = home, credential = "revoked")
        assertEquals(
            Resolution.Current(away, "fresh"),
            SamoSessionCredentials.resolve(claim, known(samo(away, "fresh"))),
        )
    }

    @Test
    fun `the key wins over the address`() {
        // Two servers; the record names one by key and was stamped at the
        // other's address. The key is the identity; the address is history.
        val claim = Claim(connectionKey = "samo:srv-2", serverUrl = home)
        val result = SamoSessionCredentials.resolve(
            claim,
            known(samo(home, "one", key = "samo:srv-1"), samo(away, "two", key = "samo:srv-2")),
        )
        assertEquals(Resolution.Current(away, "two"), result)
    }

    @Test
    fun `a record keyed by address finds a server now keyed by its identity`() {
        val claim = Claim(connectionKey = "samo:$home/")
        assertEquals(
            Resolution.Current(home, "fresh"),
            SamoSessionCredentials.resolve(claim, known(samo(home, "fresh", key = "samo:srv-1"))),
        )
    }

    @Test
    fun `a record with no key is matched by address, trailing slash or not`() {
        val claim = Claim(serverUrl = "$home/", credential = "revoked")
        assertEquals(
            Resolution.Current(home, "fresh"),
            SamoSessionCredentials.resolve(claim, known(samo(home, "fresh"))),
        )
    }

    @Test
    fun `the same token at a new address is the same session`() {
        val claim = Claim(serverUrl = home, credential = "live")
        assertEquals(
            Resolution.Current(away, "live"),
            SamoSessionCredentials.resolve(claim, known(samo(away, "live", key = null))),
        )
    }

    @Test
    fun `a record stamped with no session is placed by the URL it points at`() {
        val claim = Claim(resourceUrl = "$home/api/v1/music/tracks/t1/stream?stream_token=old")
        assertEquals(
            Resolution.Current(home, "fresh"),
            SamoSessionCredentials.resolve(claim, known(samo(home, "fresh", key = null))),
        )
    }

    @Test
    fun `a URL is only under a server at a whole address`() {
        // :8991 must not claim a resource on :89910.
        val claim = Claim(resourceUrl = "${home}0/api/v1/music/tracks/t1/stream")
        assertEquals(
            Resolution.SignedOut,
            SamoSessionCredentials.resolve(claim, known(samo(home, "fresh", key = null))),
        )
    }

    @Test
    fun `signed out, there is nothing to send with`() {
        // However complete the record's copy looks: it belongs to a session
        // the user ended, revoked if the server heard and live if it did not.
        val claim = Claim(connectionKey = "samo:srv-1", serverUrl = home, credential = "revoked")
        assertEquals(Resolution.SignedOut, SamoSessionCredentials.resolve(claim, known()))
    }

    @Test
    fun `signed in to a different server, there is nothing to send with`() {
        val claim = Claim(connectionKey = "samo:srv-1", serverUrl = home, credential = "revoked")
        assertEquals(
            Resolution.SignedOut,
            SamoSessionCredentials.resolve(claim, known(samo(away, "other", key = "samo:srv-9"))),
        )
    }

    @Test
    fun `an unreadable mirror falls back to the record's own copy`() {
        val claim = Claim(connectionKey = "samo:srv-1", serverUrl = home, credential = "stamped")
        assertEquals(
            Resolution.Pinned(home, "stamped"),
            SamoSessionCredentials.resolve(claim, Sessions.Unreadable),
        )
    }

    @Test
    fun `an unreadable mirror and no copy leaves nothing to send`() {
        val claim = Claim(connectionKey = "samo:srv-1", serverUrl = home)
        assertEquals(Resolution.SignedOut, SamoSessionCredentials.resolve(claim, Sessions.Unreadable))
    }

    @Test
    fun `blank fields are not an identity`() {
        val claim = Claim(connectionKey = " ", serverUrl = "", credential = "", resourceUrl = "")
        assertEquals(
            Resolution.SignedOut,
            SamoSessionCredentials.resolve(claim, known(samo(home, "fresh"))),
        )
    }

    // -- The mirror file: what a missing, empty or broken one means. --

    @Test
    fun `the mirror parses its Samo sessions and nothing else`() {
        val sessions = SamoAuthMirror.parse(
            """
            [
              {"type":"samo","url":"$home","credential":"fresh","connectionKey":"samo:srv-1"},
              {"type":"navidrome","url":"http://nd","credential":"x"},
              {"type":"samo","url":"$away","credential":""},
              {"type":"samo","credential":"no-address"}
            ]
            """.trimIndent(),
        )
        assertEquals(known(samo(home, "fresh")), sessions)
    }

    @Test
    fun `an empty mirror is signed out, not unknown`() {
        assertEquals(known(), SamoAuthMirror.parse("[]"))
    }

    @Test
    fun `a broken mirror is unknown, not signed out`() {
        assertEquals(Sessions.Unreadable, SamoAuthMirror.parse("{not json"))
        assertEquals(Sessions.Unreadable, SamoAuthMirror.parse(""))
    }
}
