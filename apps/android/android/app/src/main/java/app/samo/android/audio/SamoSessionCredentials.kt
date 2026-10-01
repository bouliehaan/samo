package app.samo.android.audio

import android.content.Context
import com.facebook.react.bridge.ReadableMap

/**
 * The credential a stored record sends with, decided at the moment it is used.
 *
 * A good deal of native state outlives the session it was created under: a
 * queued download, a journaled progress write, the queue item a track plays
 * from, a direct stream's proxy fallback. Each used to keep a copy of the
 * bearer token it was made with and present that copy for as long as it
 * lived. That only ever worked because no token ever died. Disconnecting now
 * revokes the device's token on the server, so after disconnect and sign-in
 * again every one of those copies is a dead token shown to a server that has
 * since issued a new one: a download that 401s forever, a position that
 * never syncs.
 *
 * So no record sends its copy. It says which server it belongs to — its
 * [Claim] — and this resolves that against the sessions the device holds NOW
 * ([SamoAuthMirror]):
 *
 *  1. by connection key, when the record carries one. It is the key every
 *     local row for a server is filed under, and the one identity that
 *     survives both a new address and a new token.
 *  2. by address, for records that predate keys.
 *  3. by the credential the record was stamped with: the same session, now
 *     reached at another address (the LAN at home, the remote endpoint away).
 *
 * No match means the device is signed out of that server, and then there is
 * nothing to send with. The record's copy belongs to a session the user
 * ended: revoked if the server heard about it, still live if it did not, and
 * in neither case a token this device should present again. The copy is used
 * only when the mirror cannot be read at all, the one state in which the
 * device cannot tell which sessions it holds.
 */
internal object SamoSessionCredentials {
    private const val SAMO_TYPE = "samo"

    /** What a stored record remembers about the session it was made under. */
    data class Claim(
        /** The key the record's server is filed under: a download's
         *  `collection.sourceId`, a queue item's `contentSourceId`. */
        val connectionKey: String? = null,
        /** The server address the record was stamped with. */
        val serverUrl: String? = null,
        /** The bearer the record was stamped with. */
        val credential: String? = null,
        /** A Samo URL the record points at. The address of last resort, for
         *  records stamped with no session at all. */
        val resourceUrl: String? = null,
    )

    sealed interface Resolution {
        /** Somewhere to send, and a bearer to send with. */
        sealed interface Usable : Resolution {
            val serverUrl: String
            val credential: String
        }

        /** The session the device holds now for the record's server. */
        data class Current(
            override val serverUrl: String,
            override val credential: String,
        ) : Usable

        /** The mirror cannot be read; the record's own copy is all there is. */
        data class Pinned(
            override val serverUrl: String,
            override val credential: String,
        ) : Usable

        /** The device holds no session for the record's server. Send nothing. */
        object SignedOut : Resolution
    }

    fun resolve(context: Context, claim: Claim): Resolution =
        resolve(claim, SamoAuthMirror.sessions(context))

    fun resolve(claim: Claim, sessions: SamoAuthMirror.Sessions): Resolution =
        when (sessions) {
            is SamoAuthMirror.Sessions.Known ->
                match(claim, sessions.connections)
                    ?.let { Resolution.Current(it.url, it.credential) }
                    ?: Resolution.SignedOut
            SamoAuthMirror.Sessions.Unreadable -> {
                val serverUrl = claim.serverUrl?.takeIf { it.isNotBlank() }
                val credential = claim.credential?.takeIf { it.isNotBlank() }
                if (serverUrl != null && credential != null) {
                    Resolution.Pinned(serverUrl, credential)
                } else {
                    Resolution.SignedOut
                }
            }
        }

    private fun match(
        claim: Claim,
        connections: List<SamoAuthMirror.Connection>,
    ): SamoAuthMirror.Connection? {
        if (connections.isEmpty()) return null

        // Every key the connection could legitimately be filed under: the one
        // JS pinned, and the address-derived form. A record written while the
        // server was known by its address still finds it once it is known by
        // its identity, the same candidate set JS resolves a source against.
        normalizeKey(claim.connectionKey)?.let { key ->
            connections.firstOrNull { connection ->
                key == normalizeKey(connection.key) ||
                    key == normalizeKey("${connection.type}:${connection.url}")
            }?.let { return it }
        }

        normalizeAddress(claim.serverUrl)?.let { address ->
            connections.firstOrNull { normalizeAddress(it.url) == address }?.let { return it }
        }

        claim.resourceUrl?.takeIf { it.isNotBlank() }?.let { resource ->
            connections.firstOrNull { isUnder(resource, it.url) }?.let { return it }
        }

        claim.credential?.takeIf { it.isNotBlank() }?.let { credential ->
            connections.firstOrNull { it.credential == credential }?.let { return it }
        }

        return null
    }

    /** `normalizeBaseUrl` in core: surrounding space and trailing slashes are not identity. */
    private fun normalizeAddress(url: String?): String? =
        url?.trim()?.trimEnd('/')?.takeIf { it.isNotEmpty() }

    /** `normalizeServerContentSourceId` in core: the part after the type is an
     *  address or an identity, normalized as an address either way. */
    private fun normalizeKey(key: String?): String? {
        val trimmed = key?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val separator = trimmed.indexOf(':')
        if (separator <= 0) return trimmed
        return trimmed.substring(0, separator + 1) + trimmed.substring(separator + 1).trimEnd('/')
    }

    /** True when [resource] lives on the server at [base] — the whole
     *  address, not a prefix of it: `:8080` is not under `:80`. */
    private fun isUnder(resource: String, base: String): Boolean {
        val address = normalizeAddress(base) ?: return false
        if (!resource.startsWith(address)) return false
        val next = resource.getOrNull(address.length) ?: return true
        return next == '/' || next == '?' || next == '#'
    }

    /**
     * The sessions the device holds just changed: a sign-in, a sign-out, the
     * server moving to its other address. Whatever was holding off for want
     * of a session gets another look, and stream tokens minted from sessions
     * that are gone go with them.
     */
    fun onSessionsChanged(context: Context, sessions: SamoAuthMirror.Sessions) {
        if (sessions is SamoAuthMirror.Sessions.Known) {
            SamoStreamTokenCache.retainBearers(sessions.connections.map { it.credential }.toSet())
        }
        // Signed out of everything: nothing has a session to try again with.
        if (sessions is SamoAuthMirror.Sessions.Known && sessions.connections.isEmpty()) return
        SamoDownloads.resumeWaitingForSignIn(context)
        SamoProgressSync.replayPendingWrites(sessions)
    }
}

/** The claim a native queue item makes: the key JS filed its server under,
 *  and the session JS stamped it with. */
internal fun Map<String, Any?>.samoCredentialClaim(): SamoSessionCredentials.Claim =
    SamoSessionCredentials.Claim(
        connectionKey = this["contentSourceId"] as? String,
        serverUrl = this["serverUrl"] as? String,
        credential = this["serverBearerToken"] as? String,
        resourceUrl = this["url"] as? String,
    )

internal fun ReadableMap.samoCredentialClaim(): SamoSessionCredentials.Claim =
    SamoSessionCredentials.Claim(
        connectionKey = getOptionalString("contentSourceId"),
        serverUrl = getOptionalString("serverUrl"),
        credential = getOptionalString("serverBearerToken"),
        resourceUrl = getOptionalString("url"),
    )
