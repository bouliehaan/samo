package app.samo.android.audio

import org.json.JSONArray
import org.json.JSONObject

/**
 * Pure-data conversion layer: server-shaped Samo JSON → catalog-row column
 * values + a MobileHomeItem / MobileMediaTrack-shaped `payload` JSON the JS
 * readers re-hydrate from. The JS side does the same thing in
 * `mobile-home.ts` (samoXxxToHomeItem); the row shapes here match the
 * `bindItem` / `bindTrack` columns in `services/catalog/catalog-repository.ts`
 * exactly so JS-written and Kotlin-written rows are indistinguishable to
 * downstream readers.
 *
 * Covers ALBUM / ARTIST / AUDIOBOOK / PLAYLIST / PODCAST items plus
 * music-track rows grouped under the `album` container. Detail payloads are
 * stored as raw `$samoRawDetail` envelopes by the orchestrator (no conversion
 * needed). catalog_search is JS-owned (platform SQLite has no fts5) — no
 * search projections live here.
 */
internal object SamoCatalogConverters {

    /** Row-shaped binding the writer hands straight to the prepared statement. */
    data class ItemBinding(
        val sourceId: String,
        val type: String,
        val id: String,
        val title: String,
        val subtitle: String?,
        val sortName: String,
        val addedAt: Long?,
        val lastPlayedAt: Long?,
        val playCount: Long?,
        val durationSeconds: Long?,
        val containerId: String?,
        val artworkUrl: String?,
        val artworkImageId: String?,
        val qualityProfile: String?,
        val isHiRes: Long,
        val payload: String,
        val syncedAt: Long,
    )

    data class TrackBinding(
        val sourceId: String,
        val containerType: String,
        val containerId: String,
        val trackId: String,
        val position: Long,
        val discNo: Long?,
        val trackNo: Long?,
        val title: String,
        val subtitle: String?,
        val artist: String?,
        val artistId: String?,
        val album: String?,
        val albumId: String?,
        val durationSeconds: Long?,
        val artworkImageId: String?,
        val payload: String,
        val syncedAt: Long,
    )

    // -----------------------------------------------------------------------
    // Top-level converters. Each returns null when the server payload is
    // missing the load-bearing identity fields (id / title / name) — same
    // null-guarding the JS samoXxxToHomeItem variants do.
    // -----------------------------------------------------------------------

    fun albumToItem(
        sourceId: String,
        serverUrl: String,
        streamToken: String?,
        source: JSONObject,
        album: JSONObject,
        syncedAt: Long,
    ): ItemBinding? {
        val id = album.optString("id").nullIfBlank() ?: return null
        val title = album.optString("title").nullIfBlank() ?: return null

        val displayArtist =
            album.optString("displayArtist").nullIfBlank()
                ?: formatSamoArtists(
                    samoArtistRefsFromParallelArrays(
                        album.optJSONArray("albumArtistIds"),
                        album.optJSONArray("albumArtistNames"),
                    ),
                )
                ?: album.optInt("releaseYear").takeIf { it > 0 }?.toString()
        val playback = album.optJSONObject("playback")
        val artworkImageId = pickSamoImageId(album.optJSONArray("images"))
        val artworkUrl =
            resolveSamoImageUrl(serverUrl, album.optJSONArray("images"), streamToken)
                ?: SamoNativeStreamUrl.buildMusicAlbumCoverUrl(serverUrl, id, streamToken.orEmpty())
        val quality = samoAlbumQualityProfile(album)
        val hiRes = album.optBoolean("hiRes")

        val payload = JSONObject()
            .putNotNull("addedAt", toEpochMs(album.optString("addedAt").nullIfBlank()))
            .putNotNull("artworkImageId", artworkImageId)
            .putNotNull("artworkUrl", artworkUrl)
            .put("id", id)
            .putNotNull("lastPlayedAt", playback?.let { toEpochMs(it.optString("lastPlayedAt").nullIfBlank()) })
            .putNotNull("playCount", playback?.optLongOrNull("playCount"))
            .putNotNull("qualityProfile", quality)
            .put("source", source)
            .putNotNull("subtitle", displayArtist)
            .put("title", title)
            .put("type", "album")
            .also { if (hiRes) it.put("isHiRes", true) }

        return ItemBinding(
            sourceId = sourceId,
            type = "album",
            id = id,
            title = title,
            subtitle = displayArtist,
            sortName = sortName(title),
            addedAt = toEpochMs(album.optString("addedAt").nullIfBlank()),
            lastPlayedAt = playback?.let { toEpochMs(it.optString("lastPlayedAt").nullIfBlank()) },
            playCount = playback?.optLongOrNull("playCount"),
            durationSeconds = album.optLongOrNull("durationSeconds"),
            containerId = null,
            artworkUrl = artworkUrl,
            artworkImageId = artworkImageId,
            qualityProfile = qualityProfileBadgeKey(quality),
            isHiRes = if (hiRes) 1L else 0L,
            payload = payload.toString(),
            syncedAt = syncedAt,
        )
    }

    fun artistToItem(
        sourceId: String,
        serverUrl: String,
        streamToken: String?,
        source: JSONObject,
        artist: JSONObject,
        syncedAt: Long,
    ): ItemBinding? {
        val id = artist.optString("id").nullIfBlank() ?: return null
        val name = artist.optString("name").nullIfBlank() ?: return null
        val playback = artist.optJSONObject("playback")
        val artworkImageId = pickSamoImageId(artist.optJSONArray("images"))
        val artworkUrl =
            resolveSamoImageUrl(serverUrl, artist.optJSONArray("images"), streamToken)
                ?: SamoNativeStreamUrl.buildStreamUrl(
                    serverUrl,
                    "/music/artists/${encode(id)}/cover",
                    streamToken.orEmpty(),
                )
        val albumCount = artist.optInt("albumCount")
        val subtitle = if (albumCount > 0) "$albumCount albums" else null

        val payload = JSONObject()
            .putNotNull("addedAt", toEpochMs(artist.optString("addedAt").nullIfBlank()))
            .putNotNull("artworkImageId", artworkImageId)
            .putNotNull("artworkUrl", artworkUrl)
            .put("id", id)
            .putNotNull("lastPlayedAt", playback?.let { toEpochMs(it.optString("lastPlayedAt").nullIfBlank()) })
            .putNotNull("playCount", playback?.optLongOrNull("playCount"))
            .put("source", source)
            .putNotNull("subtitle", subtitle)
            .put("title", name)
            .put("type", "artist")

        return ItemBinding(
            sourceId = sourceId,
            type = "artist",
            id = id,
            title = name,
            subtitle = subtitle,
            sortName = sortName(name),
            addedAt = toEpochMs(artist.optString("addedAt").nullIfBlank()),
            lastPlayedAt = playback?.let { toEpochMs(it.optString("lastPlayedAt").nullIfBlank()) },
            playCount = playback?.optLongOrNull("playCount"),
            durationSeconds = null,
            containerId = null,
            artworkUrl = artworkUrl,
            artworkImageId = artworkImageId,
            qualityProfile = null,
            isHiRes = 0L,
            payload = payload.toString(),
            syncedAt = syncedAt,
        )
    }

    fun playlistToItem(
        sourceId: String,
        serverUrl: String,
        streamToken: String?,
        source: JSONObject,
        playlist: JSONObject,
        syncedAt: Long,
    ): ItemBinding? {
        val id = playlist.optString("id").nullIfBlank() ?: return null
        val name = playlist.optString("name").nullIfBlank() ?: return null
        val playback = playlist.optJSONObject("playback")
        val trackCount = playlist.optInt("trackCount")
        val ownerName = playlist.optString("ownerName").nullIfBlank()
        val subtitle = when {
            trackCount > 0 -> "$trackCount tracks"
            else -> ownerName
        }
        val artworkImageId = pickSamoImageId(playlist.optJSONArray("images"))
        val artworkUrl =
            resolveSamoImageUrl(serverUrl, playlist.optJSONArray("images"), streamToken)
                ?: SamoNativeStreamUrl.buildStreamUrl(
                    serverUrl,
                    "/music/playlists/${encode(id)}/cover",
                    streamToken.orEmpty(),
                )

        val payload = JSONObject()
            .putNotNull("artworkImageId", artworkImageId)
            .putNotNull("artworkUrl", artworkUrl)
            .put("id", id)
            .putNotNull("lastPlayedAt", playback?.let { toEpochMs(it.optString("lastPlayedAt").nullIfBlank()) })
            .putNotNull("playCount", playback?.optLongOrNull("playCount"))
            .put("source", source)
            .putNotNull("subtitle", subtitle)
            .put("title", name)
            .put("type", "playlist")

        return ItemBinding(
            sourceId = sourceId,
            type = "playlist",
            id = id,
            title = name,
            subtitle = subtitle,
            sortName = sortName(name),
            addedAt = null,
            lastPlayedAt = playback?.let { toEpochMs(it.optString("lastPlayedAt").nullIfBlank()) },
            playCount = playback?.optLongOrNull("playCount"),
            durationSeconds = null,
            containerId = null,
            artworkUrl = artworkUrl,
            artworkImageId = artworkImageId,
            qualityProfile = null,
            isHiRes = 0L,
            payload = payload.toString(),
            syncedAt = syncedAt,
        )
    }

    fun audiobookToItem(
        sourceId: String,
        serverUrl: String,
        streamToken: String?,
        source: JSONObject,
        audiobook: JSONObject,
        syncedAt: Long,
    ): ItemBinding? {
        val id = audiobook.optString("id").nullIfBlank() ?: return null
        val book = audiobook.optJSONObject("book") ?: return null
        val title = book.optString("title").nullIfBlank() ?: return null

        val authors = formatSamoContributors(book.optJSONArray("authors"))
            ?: formatSamoContributors(audiobook.optJSONArray("contributors"))

        val series = buildSeriesSummary(audiobook.optJSONArray("series"), book.optString("seriesSequence").nullIfBlank())

        val cover = audiobook.optJSONObject("cover")
        val artworkUrl =
            resolveSamoImageUrl(serverUrl, cover, streamToken)
                ?: SamoNativeStreamUrl.buildAudiobookCoverUrl(serverUrl, id, streamToken.orEmpty())
        val artworkImageId = cover?.optString("id")?.nullIfBlank()

        val progress = audiobook.optJSONObject("progress")
        val completionState = samoCompletionState(progress)
        val durationSeconds = audiobook.optLongOrNull("durationSeconds")
        val progressSeconds = progress?.optLongOrNull("progressSeconds")
        val subtitle = authors ?: series

        val payload = JSONObject()
            .putNotNull("addedAt", toEpochMs(audiobook.optString("addedAt").nullIfBlank()))
            .putNotNull("artworkImageId", artworkImageId)
            .putNotNull("artworkUrl", artworkUrl)
            .putNotNull("completionState", completionState)
            .putNotNull("contributorsSummary", authors)
            .putNotNull("durationSeconds", durationSeconds)
            .put("id", id)
            .putNotNull("progressSeconds", progressSeconds)
            .putNotNull("seriesSummary", series)
            .put("source", source)
            .putNotNull("subtitle", subtitle)
            .put("title", title)
            .put("type", "audiobook")

        return ItemBinding(
            sourceId = sourceId,
            type = "audiobook",
            id = id,
            title = title,
            subtitle = subtitle,
            sortName = sortName(title),
            addedAt = toEpochMs(audiobook.optString("addedAt").nullIfBlank()),
            lastPlayedAt = null,
            playCount = null,
            durationSeconds = durationSeconds,
            containerId = null,
            artworkUrl = artworkUrl,
            artworkImageId = artworkImageId,
            qualityProfile = null,
            isHiRes = 0L,
            payload = payload.toString(),
            syncedAt = syncedAt,
        )
    }

    fun podcastToItem(
        sourceId: String,
        serverUrl: String,
        streamToken: String?,
        source: JSONObject,
        podcast: JSONObject,
        syncedAt: Long,
    ): ItemBinding? {
        val id = podcast.optString("id").nullIfBlank() ?: return null
        val title = podcast.optString("title").nullIfBlank() ?: return null
        val author = podcast.optString("author").nullIfBlank()
        val cover = podcast.optJSONObject("cover")
        val artworkUrl =
            resolveSamoImageUrl(serverUrl, cover, streamToken)
                ?: SamoNativeStreamUrl.buildPodcastShowCoverUrl(serverUrl, id, streamToken.orEmpty())
        val artworkImageId = cover?.optString("id")?.nullIfBlank()

        val payload = JSONObject()
            .putNotNull("addedAt", toEpochMs(podcast.optString("addedAt").nullIfBlank()))
            .putNotNull("artworkImageId", artworkImageId)
            .putNotNull("artworkUrl", artworkUrl)
            .put("id", id)
            .put("source", source)
            .putNotNull("subtitle", author)
            .put("title", title)
            .put("type", "podcast")

        return ItemBinding(
            sourceId = sourceId,
            type = "podcast",
            id = id,
            title = title,
            subtitle = author,
            sortName = sortName(title),
            addedAt = toEpochMs(podcast.optString("addedAt").nullIfBlank()),
            lastPlayedAt = null,
            playCount = null,
            durationSeconds = null,
            containerId = null,
            artworkUrl = artworkUrl,
            artworkImageId = artworkImageId,
            qualityProfile = null,
            isHiRes = 0L,
            payload = payload.toString(),
            syncedAt = syncedAt,
        )
    }

    /**
     * Music track → catalog_track row under the `album` container. Position
     * uses the JS-side stable `(disc, track)` scheme so a delta upsert doesn't
     * reorder the rest of the album.
     */
    fun musicTrackToAlbumTrack(
        sourceId: String,
        serverUrl: String,
        streamToken: String?,
        source: JSONObject,
        track: JSONObject,
        syncedAt: Long,
    ): TrackBinding? {
        val id = track.optString("id").nullIfBlank() ?: return null
        val title = track.optString("title").nullIfBlank() ?: return null
        val albumId = track.optString("albumId").nullIfBlank() ?: return null

        val artists = formatSamoArtists(
            samoArtistRefsFromParallelArrays(
                track.optJSONArray("albumArtistIds"),
                track.optJSONArray("albumArtistNames"),
            ),
        )
        val albumTitle = track.optString("albumTitle").nullIfBlank()
        val durationSeconds = track.optLongOrNull("durationSeconds")
        val discNo = track.optLongOrNull("discNumber") ?: 1L
        val trackNo = track.optLongOrNull("trackNumber") ?: 0L
        val artworkImageId = pickSamoImageId(track.optJSONArray("images"))
        val primaryArtistId = track.optJSONArray("albumArtistIds")
            ?.let { if (it.length() > 0) it.optString(0).nullIfBlank() else null }

        // Album-track position: (disc, track) packed so it sorts the way the
        // album screen expects, identical to `albumTrackPosition` in
        // catalog-repository.ts.
        val position = discNo * 100_000L + trackNo

        // Payload = the RAW server track JSON in a `$samoRawTrack` envelope.
        // The JS reader hydrates it through the ONE canonical core mapper
        // (samoTrackToMediaTrack), which builds the full view model including
        // `playback` (stream URL, quality, mime). The previous slim payload
        // omitted playback — a coexistence-era assumption that sent every
        // mirror-served album tap down the legacy ABS fallback (405).
        val payload = JSONObject()
            .put("\u0024samoRawTrack", 1)
            .put("track", track)

        return TrackBinding(
            sourceId = sourceId,
            containerType = "album",
            containerId = albumId,
            trackId = id,
            position = position,
            discNo = discNo,
            trackNo = trackNo,
            title = title,
            subtitle = artists,
            artist = artists,
            artistId = primaryArtistId,
            album = albumTitle,
            albumId = albumId,
            durationSeconds = durationSeconds,
            artworkImageId = artworkImageId,
            payload = payload.toString(),
            syncedAt = syncedAt,
        )
    }

    // -----------------------------------------------------------------------
    // Helpers (ports of the JS-side helpers in mobile-home.ts +
    // server-samo.ts). Pure functions; no I/O, no Context.
    // -----------------------------------------------------------------------

    /** RFC3339 → epoch ms. Matches JS `Date.parse(value)`. Returns null on
     *  parse failure (e.g. empty string, malformed timestamp). */
    fun toEpochMs(value: String?): Long? {
        if (value.isNullOrBlank()) return null
        return try {
            // ISO_OFFSET_DATE_TIME handles `2026-06-05T00:00:00Z` and
            // `2026-06-05T00:00:00+00:00`; java.time.Instant.parse handles
            // the former. Try both for fidelity with Date.parse.
            val instant = try {
                java.time.Instant.parse(value)
            } catch (_: Throwable) {
                java.time.OffsetDateTime.parse(value).toInstant()
            }
            instant.toEpochMilli()
        } catch (_: Throwable) {
            null
        }
    }

    /** sort_name column: trimmed lower-cased title (matches JS toSortName). */
    fun sortName(title: String): String = title.trim().lowercase()

    /** Format the artist refs into a display string, returning null when empty. */
    fun formatSamoArtists(artists: List<JSONObject>?): String? {
        if (artists.isNullOrEmpty()) return null
        val names = artists.mapNotNull { it.optString("name").nullIfBlank() }
        return if (names.isEmpty()) null else names.joinToString(", ")
    }

    /** Audiobook author/contributor formatter. Prefers contributors tagged
     *  role=author; falls back to all-names. Returns null for empty input. */
    fun formatSamoContributors(contributors: JSONArray?): String? {
        if (contributors == null || contributors.length() == 0) return null
        val authors = mutableListOf<String>()
        val all = mutableListOf<String>()
        for (i in 0 until contributors.length()) {
            val person = contributors.optJSONObject(i) ?: continue
            val name = person.optString("name").nullIfBlank() ?: continue
            all.add(name)
            val role = person.optString("role").nullIfBlank()
            if (role == null || role.equals("author", ignoreCase = true)) {
                authors.add(name)
            }
        }
        if (authors.isNotEmpty()) return authors.joinToString(", ")
        return if (all.isEmpty()) null else all.joinToString(", ")
    }

    /** Parallel albumArtistIds/Names arrays → list of `{id, name}` refs. */
    fun samoArtistRefsFromParallelArrays(
        ids: JSONArray?,
        names: JSONArray?,
    ): List<JSONObject>? {
        if (ids == null && names == null) return null
        val length = maxOf(ids?.length() ?: 0, names?.length() ?: 0)
        if (length == 0) return null
        return (0 until length).map { i ->
            JSONObject().apply {
                ids?.optString(i)?.nullIfBlank()?.let { put("id", it) }
                names?.optString(i)?.nullIfBlank()?.let { put("name", it) }
            }
        }
    }

    /** Audiobook completion bucket from `progress`. */
    fun samoCompletionState(progress: JSONObject?): String? {
        if (progress == null) return null
        if (progress.optBoolean("completed")) return "completed"
        val seconds = progress.optDouble("progressSeconds", 0.0)
        return if (seconds > 0.0) "in-progress" else "unplayed"
    }

    /**
     * Album quality: server-aggregated maxBitDepth + maxSampleRate first;
     * else primaryAudioFile; else null (per-track scanning is a JS-only
     * concern that needs detail data we don't have at list time).
     */
    fun samoAlbumQualityProfile(album: JSONObject): JSONObject? {
        val maxBit = album.optIntOrNull("maxBitDepth")
        val maxRate = album.optIntOrNull("maxSampleRate")
        if (maxBit != null && maxRate != null && maxBit > 0 && maxRate > 0) {
            return JSONObject().put("bitDepth", maxBit).put("sampleRate", maxRate)
        }
        val primary = album.optJSONObject("primaryAudioFile")
        if (primary != null) {
            val bit = primary.optIntOrNull("bitDepth")
            val rate = primary.optIntOrNull("sampleRate")
            if (bit != null && rate != null && bit > 0 && rate > 0) {
                return JSONObject().put("bitDepth", bit).put("sampleRate", rate)
            }
        }
        return null
    }

    /** Mirror of getQualityBadgeKey for the indexed `quality_profile` column. */
    fun qualityProfileBadgeKey(profile: JSONObject?): String? {
        if (profile == null) return null
        val bit = profile.optInt("bitDepth")
        val rate = profile.optInt("sampleRate")
        if (bit <= 0 || rate <= 0) return null
        return "${bit}_${rate}"
    }

    /** Pick the first usable `images[*].id`. JS picks the first record with
     *  a non-empty id/url/sourceUrl; we mirror that. */
    fun pickSamoImageId(images: JSONArray?): String? {
        if (images == null) return null
        for (i in 0 until images.length()) {
            val image = images.optJSONObject(i) ?: continue
            val id = image.optString("id").nullIfBlank()
            if (id != null) return id
        }
        return null
    }

    /**
     * Resolve an artwork URL from a Samo `images[]` array. Absolute URLs pass
     * through; ids route through `/api/v1/media/images/{id}/image`.
     */
    fun resolveSamoImageUrl(serverUrl: String, images: JSONArray?, streamToken: String?): String? {
        if (images == null || images.length() == 0) return null
        // Pick the first record with at least one usable field.
        for (i in 0 until images.length()) {
            val image = images.optJSONObject(i) ?: continue
            val absoluteUrl = image.optString("url").nullIfBlank()
            if (absoluteUrl != null && isAbsoluteUrl(absoluteUrl)) {
                return appendStreamTokenIfApiUrl(serverUrl, absoluteUrl, streamToken)
            }
            val sourceUrl = image.optString("sourceUrl").nullIfBlank()
            if (sourceUrl != null && isAbsoluteUrl(sourceUrl)) {
                return appendStreamTokenIfApiUrl(serverUrl, sourceUrl, streamToken)
            }
            val id = image.optString("id").nullIfBlank()
            if (id != null) {
                return SamoNativeStreamUrl.buildMetadataImageUrl(serverUrl, id, streamToken.orEmpty())
            }
        }
        return null
    }

    /** Resolve from a single image object (used for audiobook/podcast covers). */
    fun resolveSamoImageUrl(serverUrl: String, image: JSONObject?, streamToken: String?): String? {
        if (image == null) return null
        return resolveSamoImageUrl(serverUrl, JSONArray().put(image), streamToken)
    }

    private fun appendStreamTokenIfApiUrl(serverUrl: String, url: String, streamToken: String?): String {
        if (streamToken.isNullOrBlank()) return url
        return try {
            val parsed = java.net.URL(url)
            // Rewrite to the configured server host when the URL points at
            // /api/v1/… (server-shipped absolute URLs may use the loopback
            // hostname from scan time). Match JS appendSamoStreamTokenToUrl.
            val base = java.net.URL(serverUrl)
            val effectiveHostPath =
                if (parsed.path.contains("/api/v1/")) "${base.protocol}://${base.authority}${parsed.path}"
                else url

            val builder = StringBuilder(effectiveHostPath)
            // Strip any existing stream_token query, then append the new one.
            val existingQuery = parsed.query
                ?.split("&")
                ?.filter { it.isNotBlank() && !it.startsWith("stream_token=") }
                ?.joinToString("&")
                .orEmpty()
            val sep = if (builder.contains('?')) '&' else '?'
            // builder already contains the URL up to (but not including)
            // query — strip what we appended for the host-rewrite case.
            val finalBuilder = StringBuilder()
            // Reconstruct: protocol/authority/path (without query) +
            // existingQuery + stream_token
            finalBuilder.append(parsed.protocol).append("://")
            if (parsed.path.contains("/api/v1/")) {
                finalBuilder.append(base.authority)
            } else {
                finalBuilder.append(parsed.authority)
            }
            finalBuilder.append(parsed.path)
            if (existingQuery.isNotEmpty()) {
                finalBuilder.append('?').append(existingQuery)
                finalBuilder.append('&')
            } else {
                finalBuilder.append('?')
            }
            finalBuilder.append("stream_token=")
                .append(java.net.URLEncoder.encode(streamToken, Charsets.UTF_8.name()))
            finalBuilder.toString()
        } catch (_: Throwable) {
            url
        }
    }

    private fun isAbsoluteUrl(value: String?): Boolean =
        value != null && (value.startsWith("https://", ignoreCase = true) || value.startsWith("http://", ignoreCase = true))

    private fun buildSeriesSummary(series: JSONArray?, seriesSequence: String?): String? {
        if (series == null || series.length() == 0) return null
        val entries = (0 until series.length()).mapNotNull { i ->
            val entry = series.optJSONObject(i) ?: return@mapNotNull null
            val name = entry.optString("name").nullIfBlank() ?: return@mapNotNull null
            if (seriesSequence != null) "$name #$seriesSequence" else name
        }
        return if (entries.isEmpty()) null else entries.joinToString(", ")
    }

    private fun encode(id: String): String = SamoNativeStreamUrl.encodeSamoId(id)
}

// -----------------------------------------------------------------------
// JSON helpers (kotlin-stdlib extensions). File-private so they don't
// collide with same-named helpers in SamoDownloads.kt's own file scope.
// -----------------------------------------------------------------------

private fun String?.nullIfBlank(): String? = if (this.isNullOrBlank() || this == "null") null else this

private fun JSONObject.optLongOrNull(key: String): Long? {
    if (!has(key) || isNull(key)) return null
    return try {
        getLong(key)
    } catch (_: Throwable) {
        try {
            getDouble(key).toLong()
        } catch (_: Throwable) {
            null
        }
    }
}

private fun JSONObject.optIntOrNull(key: String): Int? = optLongOrNull(key)?.toInt()

private fun JSONObject.putNotNull(key: String, value: Any?): JSONObject {
    if (value == null) return this
    when (value) {
        is String -> if (value.isNotBlank()) put(key, value)
        else -> put(key, value)
    }
    return this
}
