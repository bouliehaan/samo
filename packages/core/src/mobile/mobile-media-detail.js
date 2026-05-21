import { isHiResAudioQuality, isLosslessAudioQuality } from '../audio-quality';
import { annotateSubsonicAlbumsQuality } from './mobile-subsonic-quality';
import { getFetch, requestJson } from '../server/server-http';
import { ServerType } from '../server/server-types';
import { buildAudiobookshelfArtworkUrl, getMobileContentSource, } from './mobile-content-source';
import { MobileHomeItemType } from './mobile-home';
import { buildSubsonicMusicPlayback, } from './mobile-playback';
export var MobileMediaDetailType;
(function (MobileMediaDetailType) {
    MobileMediaDetailType["ALBUM"] = "album";
    MobileMediaDetailType["ARTIST"] = "artist";
    MobileMediaDetailType["AUDIOBOOK"] = "audiobook";
    MobileMediaDetailType["PLAYLIST"] = "playlist";
    MobileMediaDetailType["PODCAST"] = "podcast";
})(MobileMediaDetailType || (MobileMediaDetailType = {}));
const subsonicUrl = (authentication, path, query = {}) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });
    for (const [key, value] of Object.entries(query)) {
        params.set(key, String(value));
    }
    return `${authentication.url}/rest/${path}?${params.toString()}&${authentication.credential}`;
};
const subsonicUrlWithMultiValueQuery = (authentication, path, query = {}) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });
    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            value.forEach((entry) => params.append(key, entry));
            continue;
        }
        params.set(key, String(value));
    }
    return `${authentication.url}/rest/${path}?${params.toString()}&${authentication.credential}`;
};
const subsonicCoverArtUrl = (authentication, coverArt, entityId) => {
    // Fall back to the entity id when coverArt is absent — see the matching
    // helper in mobile-search.ts for the rationale.
    const target = coverArt ?? (entityId != null ? entityId.toString() : undefined);
    if (!target) {
        return undefined;
    }
    return subsonicUrl(authentication, 'getCoverArt.view', { id: target, size: 640 });
};
const assertSubsonicOk = (response, fallback) => {
    if (response?.status === 'ok') {
        return;
    }
    throw new Error(response?.error?.message ?? fallback);
};
const toSubsonicAlbumItem = (authentication, album) => {
    const id = album.id?.toString();
    const title = album.name ?? album.title;
    if (!id || !title) {
        return [];
    }
    return [
        {
            artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt, album.id),
            id,
            source: getMobileContentSource(authentication),
            subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
            title,
            type: MobileHomeItemType.ALBUM,
        },
    ];
};
const getAudiobookshelfTitle = (item, fallback) => {
    return item.media?.metadata?.title ?? item.media?.title ?? item.name ?? fallback;
};
const getAudiobookshelfAuthor = (item) => {
    const metadata = item.media?.metadata;
    return (metadata?.authorName ??
        metadata?.authorNameLF ??
        metadata?.author ??
        metadata?.authors
            ?.map((author) => author.name)
            .filter(Boolean)
            .join(', ') ??
        item.media?.authorName ??
        item.media?.authors
            ?.map((author) => author.name)
            .filter(Boolean)
            .join(', ') ??
        metadata?.narratorName ??
        item.media?.narratorName);
};
const getAudiobookshelfNarrator = (item) => {
    const metadata = item.media?.metadata;
    return (metadata?.narratorName ??
        metadata?.narrators?.filter(Boolean).join(', ') ??
        item.media?.narratorName);
};
const getAudiobookshelfDescription = (item) => {
    const metadata = item.media?.metadata;
    const raw = metadata?.descriptionPlain ?? metadata?.description;
    if (!raw) {
        return undefined;
    }
    const stripped = raw
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return stripped.length > 0 ? stripped : undefined;
};
const getAudiobookshelfSeries = (item) => {
    const series = item.media?.metadata?.series;
    if (typeof series === 'string') {
        return series.trim() || undefined;
    }
    if (Array.isArray(series)) {
        return series
            .map((entry) => entry.sequence
            ? `${entry.name} #${entry.sequence}`
            : entry.name)
            .filter((value) => Boolean(value))
            .join(', ') || undefined;
    }
    return undefined;
};
const formatAudiobookshelfDurationSeconds = (durationSeconds) => {
    if (!durationSeconds || durationSeconds <= 0) {
        return undefined;
    }
    const totalMinutes = Math.round(durationSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) {
        return `${hours} hr ${minutes} min`;
    }
    if (hours > 0) {
        return `${hours} hr`;
    }
    return `${minutes} min`;
};
const buildAudiobookshelfMetadataLines = (item, type) => {
    const metadata = item.media?.metadata;
    const lines = [];
    const author = getAudiobookshelfAuthor(item);
    const narrator = getAudiobookshelfNarrator(item);
    const series = getAudiobookshelfSeries(item);
    const genres = metadata?.genres?.filter(Boolean).slice(0, 3).join(' · ');
    const duration = formatAudiobookshelfDurationSeconds(item.media?.duration);
    const publishedYear = metadata?.publishedYear ? String(metadata.publishedYear) : undefined;
    if (author && type === MobileMediaDetailType.AUDIOBOOK) {
        // Lead the metadata stack with the author. Audiobook detail already
        // has an "AUDIOBOOK" eyebrow up top, so the grey lines should start
        // with the information you actually want under the title.
        lines.push(author);
    }
    if (narrator) {
        lines.push(`Narrated by ${narrator}`);
    }
    if (series) {
        lines.push(series);
    }
    if (duration) {
        lines.push(duration);
    }
    else if (type === MobileMediaDetailType.PODCAST && item.numEpisodes) {
        lines.push(`${item.numEpisodes} episodes`);
    }
    if (publishedYear) {
        lines.push(publishedYear);
    }
    if (genres) {
        lines.push(genres);
    }
    if (metadata?.publisher) {
        lines.push(metadata.publisher);
    }
    if (metadata?.language) {
        lines.push(metadata.language.charAt(0).toUpperCase() + metadata.language.slice(1).toLowerCase());
    }
    return lines;
};
const getAudiobookshelfCoverUrl = (authentication, item) => {
    return buildAudiobookshelfArtworkUrl(authentication, item.id, item.media?.metadata?.imageUrl);
};
const toTimelineSegments = (chapters, duration, ownerId) => {
    const orderedChapters = (chapters ?? [])
        .map((chapter, index) => ({ chapter, index }))
        .filter(({ chapter }) => Number.isFinite(chapter.start) &&
        chapter.start >= 0 &&
        (!duration || chapter.start < duration))
        .sort((left, right) => left.chapter.start - right.chapter.start)
        .filter(({ chapter }, index, ordered) => index === 0 || chapter.start !== ordered[index - 1].chapter.start);
    return orderedChapters.map(({ chapter, index }, orderedIndex) => {
        const nextStart = orderedChapters[orderedIndex + 1]?.chapter.start;
        const durationSeconds = nextStart !== undefined
            ? Math.max(0, nextStart - chapter.start)
            : duration
                ? Math.max(0, duration - chapter.start)
                : undefined;
        return {
            durationSeconds,
            id: `${ownerId}:chapter:${index}`,
            startSeconds: chapter.start,
            title: chapter.title?.trim() || `Chapter ${orderedIndex + 1}`,
        };
    });
};
const toAudiobookChapterTracks = (item, artworkUrl, title) => {
    const duration = item.media?.duration;
    const itemId = item.id;
    if (!itemId) {
        return [];
    }
    const timelineSegments = toTimelineSegments(item.media?.chapters, duration, itemId);
    if (timelineSegments.length === 0) {
        return [];
    }
    return timelineSegments.map((segment, orderedIndex) => {
        return {
            artworkUrl,
            durationSeconds: segment.durationSeconds,
            id: segment.id,
            itemId,
            startSeconds: segment.startSeconds,
            subtitle: title,
            timelineSegments,
            title: segment.title ?? `Chapter ${orderedIndex + 1}`,
            trackNumber: orderedIndex + 1,
        };
    });
};
const sortSubsonicSongs = (songs) => {
    return [...songs].sort((left, right) => {
        const leftDisc = left.discNumber ?? 0;
        const rightDisc = right.discNumber ?? 0;
        if (leftDisc !== rightDisc) {
            return leftDisc - rightDisc;
        }
        return (left.track ?? 0) - (right.track ?? 0);
    });
};
const toTrackItems = (authentication, songs, fallbackArtworkUrl) => {
    return sortSubsonicSongs(songs).flatMap((song) => {
        const id = song.id?.toString();
        const artworkUrl = subsonicCoverArtUrl(authentication, song.coverArt) ?? fallbackArtworkUrl;
        const playback = buildSubsonicMusicPlayback(authentication, song, artworkUrl);
        if (!id || !song.title || !playback) {
            return [];
        }
        return {
            album: song.album,
            albumId: song.albumId?.toString() ?? song.parent?.toString(),
            artist: song.artist,
            artistId: song.artistId?.toString(),
            artworkUrl,
            durationSeconds: song.duration,
            discNumber: song.discNumber,
            id,
            playback,
            subtitle: [song.artist, song.album].filter(Boolean).join(' - '),
            title: song.title,
            trackNumber: song.track,
        };
    });
};
const tracksHaveHiRes = (tracks) => tracks.some((track) => Boolean(track.playback && isHiResAudioQuality(track.playback.quality)));
/**
 * Compute the best (highest) bit-depth / sample-rate present across a
 * detail's tracks — used to label the album hero with one representative
 * format. Uses the lossless predicate (not the stricter hi-res one) so a
 * 16/44.1 lossless album still earns its badge; the asset set has a 16/44.1
 * variant and the user expects every lossless album to carry a marker.
 *
 * Servers (Navidrome / Airsonic-derivatives / older Subsonic) are
 * inconsistent about populating bitDepth and sampleRate for FLAC tracks.
 * Default to CD-quality (16/44.1) when the container check passes but the
 * numbers aren't reported — a confirmed-lossless track deserves a badge
 * even without precise specs.
 */
const trackQualityProfile = (tracks) => {
    let best;
    for (const track of tracks) {
        const quality = track.playback?.quality;
        if (!quality)
            continue;
        if (!isLosslessAudioQuality(quality))
            continue;
        const bitDepth = quality.bitDepth ?? 16;
        const sampleRate = quality.sampleRate ?? 44100;
        if (!best ||
            bitDepth > best.bitDepth ||
            (bitDepth === best.bitDepth && sampleRate > best.sampleRate)) {
            best = { bitDepth, sampleRate };
        }
    }
    return best;
};
const loadSubsonicAlbumDetail = async (authentication, fetcher, id) => {
    const body = await requestJson(fetcher, subsonicUrl(authentication, 'getAlbum.view', { id }));
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load album');
    const album = response?.album;
    if (!album?.id || !album.name) {
        throw new Error('Album detail did not include a playable album.');
    }
    const artworkUrl = subsonicCoverArtUrl(authentication, album.coverArt);
    const recordLabel = album.recordLabels
        ?.map((entry) => entry.name?.trim())
        .filter((value) => Boolean(value))[0];
    const genre = album.genre?.trim() ||
        album.genres
            ?.map((entry) => entry.name?.trim())
            .filter((value) => Boolean(value))[0];
    const metadataLines = [
        album.artist,
        album.year ? String(album.year) : undefined,
        recordLabel ?? genre,
    ].filter((value) => Boolean(value));
    const tracks = toTrackItems(authentication, album.song ?? [], artworkUrl);
    return {
        artworkUrl,
        id: album.id.toString(),
        isHiRes: tracksHaveHiRes(tracks),
        metadataLines: metadataLines.length > 0 ? metadataLines : undefined,
        qualityProfile: trackQualityProfile(tracks),
        source: getMobileContentSource(authentication),
        subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
        title: album.name,
        tracks,
        type: MobileMediaDetailType.ALBUM,
    };
};
const loadSubsonicPlaylistDetail = async (authentication, fetcher, id) => {
    const body = await requestJson(fetcher, subsonicUrl(authentication, 'getPlaylist.view', { id }));
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load playlist');
    const playlist = response?.playlist;
    if (!playlist?.id || !playlist.name) {
        throw new Error('Playlist detail did not include a playable playlist.');
    }
    const artworkUrl = subsonicCoverArtUrl(authentication, playlist.coverArt);
    const tracks = toTrackItems(authentication, playlist.entry ?? [], artworkUrl);
    return {
        artworkUrl,
        id: playlist.id.toString(),
        isHiRes: tracksHaveHiRes(tracks),
        source: getMobileContentSource(authentication),
        subtitle: playlist.songCount ? `${playlist.songCount} songs` : playlist.owner,
        title: playlist.name,
        tracks,
        type: MobileMediaDetailType.PLAYLIST,
    };
};
const TOP_SONGS_LIMIT = 8;
const ARTIST_DETAIL_ALBUM_QUALITY_SCAN_LIMIT = 8;
const ARTIST_DETAIL_APPEARS_ON_QUALITY_SCAN_LIMIT = 4;
const sanitizeBiography = (raw) => {
    if (!raw)
        return undefined;
    // last.fm biographies arrive with embedded <a> tags and a trailing
    // "Read more on Last.fm" link. Strip both so the mobile UI gets clean prose.
    const stripped = raw
        .replace(/<a [^>]*>[^<]*<\/a>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/User-contributed text is available under.*$/i, '')
        .trim();
    return stripped.length > 0 ? stripped : undefined;
};
const subsonicSongToTrack = (authentication, song, fallbackArtwork) => {
    const id = song.id?.toString();
    if (!id || !song.title)
        return null;
    const artworkUrl = subsonicCoverArtUrl(authentication, song.coverArt) ?? fallbackArtwork;
    const playback = buildSubsonicMusicPlayback(authentication, song, artworkUrl);
    return {
        album: song.album,
        albumId: song.albumId?.toString() ?? song.parent?.toString(),
        artist: song.artist,
        artistId: song.artistId?.toString(),
        artworkUrl,
        durationSeconds: song.duration,
        discNumber: song.discNumber,
        id,
        playback: playback ?? undefined,
        subtitle: [song.artist, song.album].filter(Boolean).join(' - '),
        title: song.title,
        trackNumber: song.track,
    };
};
const subsonicAppearsOnFromSongs = (authentication, artistName, artistId, songs) => {
    const normalizedArtist = artistName.trim().toLowerCase();
    const seen = new Set();
    const items = [];
    for (const song of songs) {
        const albumId = (song.albumId ?? song.parent)?.toString();
        const albumTitle = song.album;
        if (!albumId || !albumTitle)
            continue;
        if (seen.has(albumId))
            continue;
        const albumArtist = song.albumArtist?.trim().toLowerCase();
        const songArtist = song.artist?.trim().toLowerCase();
        const songArtistId = song.artistId?.toString();
        // The artist isn't credited on this song at all; their inclusion in the
        // search was probably a title match. Skip.
        if (songArtist && songArtist !== normalizedArtist && !songArtist.includes(normalizedArtist)) {
            continue;
        }
        // If the album artist matches this artist (by id or by name), it's a
        // mainline release, not an appearance. Same if the artistId on the song
        // matches and there's no separate albumArtist field.
        if (albumArtist === normalizedArtist)
            continue;
        if (!albumArtist && songArtistId && songArtistId === artistId)
            continue;
        if (!albumArtist && songArtist === normalizedArtist)
            continue;
        seen.add(albumId);
        items.push({
            artworkUrl: subsonicCoverArtUrl(authentication, song.coverArt),
            id: albumId,
            source: getMobileContentSource(authentication),
            subtitle: song.albumArtist ?? song.artist,
            title: albumTitle,
            type: MobileHomeItemType.ALBUM,
        });
    }
    return items;
};
const loadSubsonicArtistDetail = async (authentication, fetcher, id) => {
    const [artistResult, infoResult] = await Promise.allSettled([
        requestJson(fetcher, subsonicUrl(authentication, 'getArtist.view', { id })),
        requestJson(fetcher, subsonicUrl(authentication, 'getArtistInfo2.view', { id })),
    ]);
    if (artistResult.status === 'rejected') {
        throw artistResult.reason;
    }
    const response = artistResult.value['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load artist');
    const artist = response?.artist;
    if (!artist?.id || !artist.name) {
        throw new Error('Artist detail did not include an artist.');
    }
    // Pull two song sources in parallel:
    //  - getTopSongs: ordered by community plays, drives the Top Tracks list.
    //  - search3: broader haul of any song where this artist is credited,
    //    needed because getTopSongs often omits feature/guest appearances.
    const [topSongsResult, search3Result] = await Promise.all([
        requestJson(fetcher, subsonicUrl(authentication, 'getTopSongs.view', {
            artist: artist.name,
            count: TOP_SONGS_LIMIT * 4,
        })).catch(() => undefined),
        requestJson(fetcher, subsonicUrl(authentication, 'search3.view', {
            albumCount: 0,
            artistCount: 0,
            query: artist.name,
            songCount: 200,
        })).catch(() => undefined),
    ]);
    const topSongsResponse = topSongsResult && topSongsResult['subsonic-response']?.status === 'ok'
        ? topSongsResult['subsonic-response']
        : undefined;
    const topSongs = topSongsResponse?.topSongs?.song ?? [];
    const searchSongs = search3Result && search3Result['subsonic-response']?.status === 'ok'
        ? (search3Result['subsonic-response'].searchResult3?.song ?? [])
        : [];
    const infoResponse = infoResult.status === 'fulfilled'
        ? infoResult.value['subsonic-response']?.artistInfo2
        : undefined;
    const rawAlbumItems = (artist.album ?? []).flatMap((album) => toSubsonicAlbumItem(authentication, album));
    // Keep artist pages snappy: only badge-scan the first visible slice.
    // Opening an individual album still computes the full album quality.
    const albumIds = new Set(rawAlbumItems.map((album) => album.id));
    const rawAppearsOnItems = subsonicAppearsOnFromSongs(authentication, artist.name, artist.id.toString(), [...topSongs, ...searchSongs]).filter((item) => !albumIds.has(item.id));
    const [albumItems, appearsOnItems] = await Promise.all([
        annotateSubsonicAlbumsQuality(authentication, fetcher, rawAlbumItems, ARTIST_DETAIL_ALBUM_QUALITY_SCAN_LIMIT),
        annotateSubsonicAlbumsQuality(authentication, fetcher, rawAppearsOnItems, ARTIST_DETAIL_APPEARS_ON_QUALITY_SCAN_LIMIT),
    ]);
    const topTracks = topSongs
        .slice(0, TOP_SONGS_LIMIT)
        .map((song) => subsonicSongToTrack(authentication, song))
        .filter((track) => Boolean(track));
    const relatedArtists = (infoResponse?.similarArtist ?? []).flatMap((similar) => {
        const similarId = similar.id?.toString();
        if (!similarId || !similar.name)
            return [];
        return [
            {
                artworkUrl: subsonicCoverArtUrl(authentication, similar.coverArt, similar.id),
                id: similarId,
                source: getMobileContentSource(authentication),
                title: similar.name,
                type: MobileHomeItemType.ARTIST,
            },
        ];
    });
    const subtitleParts = [
        artist.albumCount ? `${artist.albumCount} albums` : undefined,
        topTracks.length > 0 ? `${topTracks.length} top tracks` : undefined,
    ].filter(Boolean);
    return {
        appearsOnItems: appearsOnItems.length > 0 ? appearsOnItems : undefined,
        artworkUrl: infoResponse?.largeImageUrl ??
            infoResponse?.mediumImageUrl ??
            artist.artistImageUrl ??
            subsonicCoverArtUrl(authentication, artist.coverArt, artist.id),
        biography: sanitizeBiography(infoResponse?.biography),
        id: artist.id.toString(),
        items: albumItems,
        relatedArtists: relatedArtists.length > 0 ? relatedArtists : undefined,
        source: getMobileContentSource(authentication),
        subtitle: subtitleParts.join(' · ') || undefined,
        title: artist.name,
        topTracks: topTracks.length > 0 ? topTracks : undefined,
        tracks: [],
        type: MobileMediaDetailType.ARTIST,
    };
};
const loadAudiobookshelfDetail = async (authentication, fetcher, id, type) => {
    const item = await requestJson(fetcher, `${authentication.url}/api/items/${id}?expanded=1`, {
        headers: { Authorization: `Bearer ${authentication.credential}` },
        method: 'GET',
    });
    if (!item.id) {
        throw new Error('Audiobookshelf did not return a playable item.');
    }
    const artworkUrl = getAudiobookshelfCoverUrl(authentication, item);
    const title = getAudiobookshelfTitle(item, type === MobileMediaDetailType.PODCAST ? 'Podcast' : 'Untitled audiobook');
    const biography = getAudiobookshelfDescription(item);
    const metadataLines = buildAudiobookshelfMetadataLines(item, type);
    if (type === MobileMediaDetailType.AUDIOBOOK) {
        const chapters = toAudiobookChapterTracks(item, artworkUrl, title);
        return {
            artworkUrl,
            biography,
            id: item.id,
            metadataLines: metadataLines.length > 0 ? metadataLines : undefined,
            source: getMobileContentSource(authentication),
            subtitle: getAudiobookshelfAuthor(item),
            title,
            tracks: chapters.length > 0
                ? chapters
                : [
                    {
                        artworkUrl,
                        durationSeconds: item.media?.duration,
                        id: item.id,
                        itemId: item.id,
                        subtitle: getAudiobookshelfAuthor(item),
                        title,
                        trackNumber: 1,
                    },
                ],
            type,
        };
    }
    const episodes = [...(item.media?.episodes ?? [])].sort((left, right) => (right.publishedAt ?? 0) - (left.publishedAt ?? 0));
    return {
        artworkUrl,
        biography,
        id: item.id,
        metadataLines: metadataLines.length > 0 ? metadataLines : undefined,
        source: getMobileContentSource(authentication),
        subtitle: item.numEpisodes ? `${item.numEpisodes} episodes` : item.media?.subtitle,
        title,
        tracks: episodes.flatMap((episode, index) => {
            if (!episode.id) {
                return [];
            }
            const durationSeconds = episode.duration ?? episode.audioFile?.duration;
            const timelineSegments = toTimelineSegments(episode.chapters ?? episode.audioFile?.chapters, durationSeconds, episode.id);
            return {
                artworkUrl,
                durationSeconds,
                episodeId: episode.id,
                id: episode.id,
                itemId: item.id,
                publishedAt: episode.publishedAt,
                subtitle: episode.subtitle,
                timelineSegments: timelineSegments.length > 1 ? timelineSegments : undefined,
                title: episode.title ?? `Episode ${index + 1}`,
                trackNumber: episode.index ?? index + 1,
            };
        }),
        type,
    };
};
export const getMobileMediaDetailErrorMessage = (error) => {
    return error instanceof Error ? error.message : 'Failed to load media detail';
};
export const loadMobileMediaDetail = async ({ authentication, fetch: fetcher, id, type, }) => {
    const request = getFetch(fetcher);
    if (authentication.type === ServerType.AUDIOBOOKSHELF) {
        if (type === MobileMediaDetailType.AUDIOBOOK || type === MobileMediaDetailType.PODCAST) {
            return loadAudiobookshelfDetail(authentication, request, id, type);
        }
        throw new Error('Opening this Audiobookshelf media type is not wired for Android yet.');
    }
    if (authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC) {
        if (type === MobileMediaDetailType.ALBUM) {
            return loadSubsonicAlbumDetail(authentication, request, id);
        }
        if (type === MobileMediaDetailType.PLAYLIST) {
            return loadSubsonicPlaylistDetail(authentication, request, id);
        }
        if (type === MobileMediaDetailType.ARTIST) {
            return loadSubsonicArtistDetail(authentication, request, id);
        }
    }
    throw new Error('Opening this media type is not wired for Android yet.');
};
const dedupePlayables = (items) => {
    const seen = new Set();
    return items.filter((item) => {
        if (seen.has(item.id)) {
            return false;
        }
        seen.add(item.id);
        return true;
    });
};
/**
 * Build a Song Radio queue. Uses Subsonic's getSimilarSongs2 as the primary
 * source and blends in the seed artist's top tracks when available, so the
 * queue feels grounded in the song instead of just being "loosely similar."
 */
export const loadSongRadioQueue = async ({ authentication, count, fetch: fetcher, seed, }) => {
    if (authentication.type !== ServerType.NAVIDROME &&
        authentication.type !== ServerType.SUBSONIC) {
        return [];
    }
    const request = getFetch(fetcher);
    const desired = Math.max(8, count ?? 24);
    const similarCount = Math.min(50, Math.ceil(desired * 1.5));
    const [similarResult, topSongsResult] = await Promise.allSettled([
        requestJson(request, subsonicUrl(authentication, 'getSimilarSongs2.view', {
            count: similarCount,
            id: seed.songId,
        })),
        seed.artistId
            ? requestJson(request, subsonicUrl(authentication, 'getTopSongs.view', {
                artist: seed.artist ?? '',
                count: 10,
            }))
            : Promise.resolve({}),
    ]);
    const similarSongs = similarResult.status === 'fulfilled'
        ? (similarResult.value['subsonic-response']?.similarSongs2?.song ?? [])
        : [];
    const topSongs = topSongsResult.status === 'fulfilled'
        ? (topSongsResult.value['subsonic-response']?.topSongs?.song ?? [])
        : [];
    const toPlayable = (song) => {
        const artworkUrl = subsonicCoverArtUrl(authentication, song.coverArt);
        return buildSubsonicMusicPlayback(authentication, song, artworkUrl);
    };
    const similarPlayables = similarSongs
        .map(toPlayable)
        .filter((value) => Boolean(value));
    const topPlayables = topSongs
        .map(toPlayable)
        .filter((value) => Boolean(value))
        // Drop the seed song itself — we'll thread it back in at position 0.
        .filter((value) => !value.id.endsWith(`:music:${seed.songId}`));
    // Light blend: alternate same-artist top tracks into the similar feed so
    // the queue isn't strictly "anything goes" but still varied.
    const blended = [];
    const ratio = 3; // similar : top blend ratio
    let topIndex = 0;
    for (let i = 0; i < similarPlayables.length; i += 1) {
        blended.push(similarPlayables[i]);
        if ((i + 1) % ratio === 0 && topIndex < topPlayables.length) {
            blended.push(topPlayables[topIndex]);
            topIndex += 1;
        }
    }
    // Append any remaining top tracks at the end so they're still in rotation.
    for (; topIndex < topPlayables.length; topIndex += 1) {
        blended.push(topPlayables[topIndex]);
    }
    return dedupePlayables(blended).slice(0, desired);
};
/**
 * Resolve the per-file audio download URLs for an Audiobookshelf library
 * item. ABS exposes the raw, original-quality audio files via
 * `/api/items/:itemId/file/:ino`, which is what we want for offline storage
 * — the `/play` endpoint sometimes returns a server-transcoded HLS stream
 * that's lower quality and can't be saved offline as a single file.
 *
 * For single-file audiobooks this returns one entry. For multi-file books
 * the array contains one entry per part, in playback order.
 */
export const loadAudiobookshelfDownloadFiles = async ({ authentication, fetch: fetcher, itemId, }) => {
    if (authentication.type !== ServerType.AUDIOBOOKSHELF) {
        return [];
    }
    const request = getFetch(fetcher);
    const item = await requestJson(request, `${authentication.url}/api/items/${itemId}?expanded=1`, {
        headers: { Authorization: `Bearer ${authentication.credential}` },
        method: 'GET',
    });
    // For audiobooks the `media.tracks` array is the per-file breakdown; each
    // entry carries the ino we need plus the startOffset+duration we need
    // for offline book-time → file mapping. Older ABS responses / podcasts
    // fall back to libraryFiles filtered to audio files.
    const tracks = item.media?.tracks ?? [];
    if (tracks.length > 0) {
        return tracks
            .filter((track) => Boolean(track.ino))
            .map((track, idx) => ({
            downloadUrl: `${authentication.url}/api/items/${itemId}/file/${track.ino}`,
            durationSeconds: track.duration,
            filename: track.metadata?.filename ??
                track.title ??
                `audio-${track.index ?? idx}`,
            index: track.index ?? idx,
            ino: track.ino,
            itemId,
            sizeBytes: track.metadata?.size,
            startOffsetSeconds: track.startOffset ?? 0,
            title: track.title,
        }));
    }
    const libraryFiles = item.libraryFiles ?? [];
    return libraryFiles
        .filter((file) => file.ino &&
        (file.fileType === 'audio' ||
            /\.(mp3|m4a|m4b|aac|flac|ogg|opus|wav)$/i.test(file.metadata?.filename ?? '')))
        .map((file, idx) => ({
        downloadUrl: `${authentication.url}/api/items/${itemId}/file/${file.ino}`,
        filename: file.metadata?.filename ?? `audio-${file.ino}`,
        index: idx,
        ino: file.ino,
        itemId,
        sizeBytes: file.metadata?.size,
        startOffsetSeconds: 0,
    }));
};
/**
 * Resolve raw per-episode download URLs for an Audiobookshelf podcast item.
 *
 * The play endpoint we use for streaming (`/api/items/:itemId/play/:episodeId`)
 * is allowed to hand back an HLS playlist instead of the underlying audio
 * file, which can't be saved as a single offline file. The file endpoint
 * (`/api/items/:itemId/file/:ino`) always returns the source MP3/M4A
 * regardless of how the server's playback layer would deliver it.
 *
 * Returns one entry per episode that has a discoverable audio file ino.
 */
export const loadAudiobookshelfPodcastEpisodeFiles = async ({ authentication, fetch: fetcher, itemId, }) => {
    if (authentication.type !== ServerType.AUDIOBOOKSHELF) {
        return [];
    }
    const request = getFetch(fetcher);
    const item = await requestJson(request, `${authentication.url}/api/items/${itemId}?expanded=1`, {
        headers: { Authorization: `Bearer ${authentication.credential}` },
        method: 'GET',
    });
    const episodes = item.media?.episodes ?? [];
    return episodes
        .filter((episode) => episode.id && episode.audioFile?.ino)
        .map((episode, idx) => ({
        episodeId: episode.id,
        filename: episode.audioFile?.metadata?.filename ?? `episode-${episode.index ?? idx}`,
        fileDownloadUrl: `${authentication.url}/api/items/${itemId}/file/${episode.audioFile.ino}`,
        ino: episode.audioFile.ino,
        itemId,
        sizeBytes: episode.audioFile?.metadata?.size,
        title: episode.title ?? `Episode ${episode.index ?? idx + 1}`,
    }));
};
export const addMobileTracksToPlaylist = async ({ authentication, fetch: fetcher, playlistId, songIds, }) => {
    if (authentication.type !== ServerType.NAVIDROME &&
        authentication.type !== ServerType.SUBSONIC) {
        throw new Error('Adding tracks to playlists is only available for music servers.');
    }
    const filteredSongIds = songIds.filter(Boolean);
    if (filteredSongIds.length === 0) {
        throw new Error('No tracks were selected.');
    }
    const request = getFetch(fetcher);
    const body = await requestJson(request, subsonicUrlWithMultiValueQuery(authentication, 'updatePlaylist.view', {
        playlistId,
        songIdToAdd: filteredSongIds,
    }));
    assertSubsonicOk(body['subsonic-response'], 'Failed to add to playlist');
};
