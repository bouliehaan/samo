import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, requestJson, type SamoFetch } from '../server/server-http';
import {
    type SamoArtistRef,
    type SamoAudiobook,
    type SamoAudioChapter,
    type SamoBookmark,
    type SamoListeningSession,
    type SamoMusicAlbum,
    type SamoMusicArtist,
    type SamoMusicPlaylist,
    type SamoMusicTrack,
    type SamoPaginatedResponse,
    type SamoPodcast,
    type SamoPodcastEpisode,
    type SamoSyncManifest,
    fetchSamoSyncManifest,
    getSamoAudiobook,
    getSamoMusicAlbum,
    getSamoMusicArtist,
    getSamoMusicPlaylist,
    listSamoMusicAlbumTracks,
    listSamoMusicTracks,
    createSamoMusicPlaylist,
    getSamoPodcastShow,
    listSamoAudiobookBookmarks,
    listSamoAudiobookSessions,
    listSamoMusicArtistAlbums,
    listSamoMusicArtistAppearsOn,
    listSamoMusicArtistTopTracks,
    listSamoMusicPlaylistTracks,
    listSamoPodcastEpisodes,
    resolveSamoAlbumArtworkUrl,
    resolveSamoArtistArtworkUrl,
    pickSamoImageId,
    resolveSamoArtworkImageId,
    resolveSamoAudiobookArtworkUrl,
    resolveSamoPlaylistArtworkUrl,
    resolveSamoPodcastArtworkUrl,
    resolveSamoPodcastEpisodeArtworkUrl,
    samoItemsOf,
    samoPlaylistHasCoverGrid,
} from '../server/server-samo';
import { collectSamoPagesCapped } from '../server/server-samo-pagination';
import { ensureSamoStreamToken } from '../server/server-samo-stream-token';
import { ServerType } from '../server/server-types';
import {
    getMobileContentSource,
    type MobileContentSource,
} from './mobile-content-source';
import {
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileQualityProfile,
    samoAlbumQualityProfile,
} from './mobile-home';
import {
    buildAudiobookTimelineSegments,
    buildSamoAudiobookPlayback,
    buildSamoMusicPlayback,
    buildSamoPodcastEpisodePlayback,
    samoAudiobookFilePlaybacks,
    type MobilePlayableAudio,
    type MobilePlaybackSegment,
    type SamoAudiobookFilePlayback,
} from './mobile-playback';

export enum MobileMediaDetailType {
    ALBUM = 'album',
    ARTIST = 'artist',
    AUDIOBOOK = 'audiobook',
    PLAYLIST = 'playlist',
    PODCAST = 'podcast',
}

export interface AddMobileTracksToPlaylistInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    playlistId: string;
    songIds: string[];
}

export interface MobileMediaDetailContributor {
    id?: string;
    name: string;
    role?: string;
}

export interface MobileMediaDetailBookmark {
    chapterTitle?: string;
    createdAt?: number;
    id: string;
    note?: string;
    positionSeconds?: number;
    title?: string;
}

/**
 * How an audiobook's chapters were derived + whether to trust them. `label` is a
 * short human string for the chapter section; `needsReview` is true when the
 * chapters are weak (one-per-file, an unaligned Audible paste) or the audio
 * registration was low-confidence, so the UI can surface a gentle hint.
 */
export interface MobileChapterQuality {
    source?: string;
    confidence?: number;
    label: string;
    needsReview: boolean;
}

/** Audio-aligned chapters below this confidence are flagged for review. */
export const CHAPTER_REVIEW_CONFIDENCE = 0.6;

/**
 * Maps an audiobook's stored chapter provenance to a display label + review flag.
 * Returns undefined when there are no chapters or the server reported no source
 * (old data), so callers render nothing rather than a misleading badge.
 */
export const deriveChapterQuality = (
    source: string | undefined,
    confidence: number | undefined,
    chapterCount: number,
): MobileChapterQuality | undefined => {
    if (chapterCount === 0 || !source) return undefined;
    switch (source) {
        case 'audio-aligned':
            return {
                source,
                confidence,
                label: 'Audio-aligned',
                needsReview: typeof confidence === 'number' && confidence < CHAPTER_REVIEW_CONFIDENCE,
            };
        case 'audnexus':
            return { source, confidence, label: 'From Audible', needsReview: true };
        case 'cue':
        case 'embedded':
            return { source, confidence, label: 'Embedded chapters', needsReview: false };
        case 'file':
            return { source, confidence, label: 'File-based', needsReview: true };
        default:
            return { source, confidence, label: source, needsReview: false };
    }
};

export interface MobileMediaDetailSession {
    durationSeconds?: number;
    endedAt?: number;
    id: string;
    startedAt?: number;
}

export interface MobileMediaDetailPodcastFeed {
    consecutiveErrors?: number;
    feedUrl?: string;
    lastPollFinishedAt?: number;
    lastPollStartedAt?: number;
    nextPollAt?: number;
    pollEnabled?: boolean;
    pollIntervalSeconds?: number;
}

export interface MobileMediaDetail {
    appearsOnItems?: MobileHomeItem[];
    artworkUrl?: string;
    /** samo metadata `images[].id` for display-time URL rebuild. */
    artworkImageId?: string;
    /**
     * Audiobook-only (samo) — the book's underlying files as the per-file
     * manifest the multi-file playback queue is built from. Each entry knows its
     * book-global start offset so the player can map book-time to (file,
     * file-time) and seek locally. Undefined for non-samo or non-audiobook
     * details.
     */
    audiobookFiles?: SamoAudiobookFilePlayback[];
    /**
     * Audiobook-only — joined "Author Name" string for the hero subtitle.
     */
    authorsSummary?: string;
    biography?: string;
    /**
     * Audiobook-only — bookmarks the current user has saved against this book.
     * Populated when the server type is `samo` (samo native bookmarks). Other
     * server types leave it undefined.
     */
    bookmarks?: MobileMediaDetailBookmark[];
    /**
     * Audiobook-only — chapter list parsed from samo's `audiobook_chapters`
     * data. Empty array when the book has no chapters; undefined for music
     * and podcast details.
     */
    chapters?: MobileMediaDetailBookmark[];
    /**
     * Audiobook-only — how the chapters were derived + whether they should be
     * flagged for review (weak source or low audio-registration confidence), so
     * the UI can mark uncertain chapters instead of presenting every marker as
     * authoritative. Undefined when the server didn't report provenance.
     */
    chapterQuality?: MobileChapterQuality;
    /**
     * Audiobook-only — display string for the audiobook's contributors who
     * are not the author (typically narrators).
     */
    contributors?: MobileMediaDetailContributor[];
    /**
     * Audiobook-only — the WHOLE BOOK's length in seconds, the timeline that
     * `chapters` and `audiobookFiles[].startOffsetSeconds` are expressed on.
     * Distinct from any single track/file duration; play paths thread it onto
     * the queue as `timelineDurationSeconds` so the seek bar spans the book.
     */
    durationSeconds?: number;
    /**
     * Podcast-only — feed source + poll state for the show.
     */
    feed?: MobileMediaDetailPodcastFeed;
    id: string;
    isHiRes?: boolean;
    items?: MobileHomeItem[];
    /**
     * Audiobook-only — recent listening sessions for the current user.
     */
    listeningSessions?: MobileMediaDetailSession[];
    metadataLines?: string[];
    /**
     * Audiobook-only — narrator display string (joined names).
     */
    narratorsSummary?: string;
    /**
     * Representative bit-depth/sample-rate for the whole detail (albums
     * only). Computed by walking detail.tracks at load time; surfaces as
     * the hero badge and the inline "24-bit / 96 kHz" text line.
     */
    qualityProfile?: MobileQualityProfile;
    relatedArtists?: MobileHomeItem[];
    /**
     * Album-only — number of discs when the server knows it. Used to decide
     * whether track lists should show disc headers instead of inferring from
     * partial track payloads.
     */
    discCount?: number;
    /**
     * Audiobook-only — series sequence summary (e.g. "Lyrik Saga, Book 3").
     */
    seriesSummary?: string;
    /**
     * Playlist-only — ownership and editability for rename, cover, and track edits.
     */
    playlistMeta?: {
        description?: string;
        editable: boolean;
        ownerId?: string;
        public?: boolean;
        /**
         * The server-managed explo "Explore" queue. Distinct from `editable`
         * being false: a playlist someone else owns is also uneditable, but
         * only this one is a rotating drop folder whose tracks disappear on
         * the next weekly run — which is what makes "Keep in Library" mean
         * something here and nowhere else.
         */
        system?: boolean;
    };
    source: MobileContentSource;
    subtitle?: string;
    title: string;
    topTracks?: MobileMediaTrack[];
    tracks: MobileMediaTrack[];
    type: MobileMediaDetailType;
    /**
     * Release/publication year for albums (samo `releaseYear`) and audiobooks
     * (samo `book.publishedYear`). Surfaced as the dedicated hero year line; the
     * detail screen filters the same value out of `metadataLines` to avoid
     * showing it twice. Undefined for types/items without a known year.
     */
    year?: number;
}

export interface MobileMediaDetailInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    id: string;
    signal?: AbortSignal;
    type: MobileMediaDetailType;
}

export interface MobileMediaTrack {
    album?: string;
    albumId?: string;
    artist?: string;
    artistId?: string;
    artworkUrl?: string;
    /** samo metadata `images[].id` for display-time URL rebuild. */
    artworkImageId?: string;
    /**
     * Long-form show notes. Podcast episodes only — the feed's own episode
     * description, which the server has always sent and nothing on the client
     * ever carried, so there was no way to read an episode's blurb from the
     * app at all. Music tracks have no equivalent and leave this undefined.
     */
    description?: string;
    durationSeconds?: number;
    discNumber?: number;
    episodeId?: string;
    id: string;
    itemId?: string;
    playback?: MobilePlayableAudio;
    publishedAt?: number;
    startSeconds?: number;
    subtitle?: string;
    timelineSegments?: MobilePlaybackSegment[];
    title: string;
    trackNumber?: number;
}

/**
 * Mirrors the server's playlist write rule (playlists.assertOwner plus the
 * admin override on Update/Delete): an ownerless row is writable by anyone
 * signed in, the owner writes their own, and an admin writes any non-system
 * playlist. The admin clause is what makes server-managed rows editable —
 * filesystem .m3u imports and playlists migrated from older servers are owned
 * by the internal bootstrap account no human can authenticate as, so without it
 * every surface showed them and none could change them.
 */
export const isPlaylistOwnedByUser = (
    authentication: ServerAuthenticationResult,
    ownerId?: string,
    ): boolean => {
    const userId = authentication.userId?.trim();
    if (authentication.type === ServerType.SAMO) {
        if (!ownerId) return true;
        if (userId && ownerId === userId) return true;
        return authentication.isAdmin === true;
    }
    return false;
};

export const getMobileMediaDetailErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Failed to load media detail';
};

// ---------------------------------------------------------------------------
// samo native detail loaders
// ---------------------------------------------------------------------------

const samoChaptersToBookmarks = (
    chapters: SamoAudioChapter[] | undefined,
): MobileMediaDetailBookmark[] => {
    if (!chapters) return [];
    return chapters.flatMap((chapter, index) => {
        const startSeconds = chapter.startSeconds;
        if (startSeconds === undefined) return [];
        return [
            {
                chapterTitle: chapter.title,
                id: chapter.id ?? `chapter-${index}`,
                positionSeconds: startSeconds,
                title: chapter.title ?? `Chapter ${chapter.index ?? index + 1}`,
            },
        ];
    });
};

const samoBookmarksToDetail = (
    bookmarks: SamoBookmark[] | undefined,
): MobileMediaDetailBookmark[] => {
    return (bookmarks ?? []).map((bookmark) => ({
        createdAt: bookmark.createdAt ? Date.parse(bookmark.createdAt) : undefined,
        id: bookmark.id,
        note: bookmark.note,
        positionSeconds: bookmark.positionSeconds,
        title: bookmark.title,
    }));
};

const samoSessionsToDetail = (
    sessions: SamoListeningSession[] | undefined,
): MobileMediaDetailSession[] => {
    return (sessions ?? []).map((session) => ({
        durationSeconds: session.durationSeconds,
        endedAt: session.endedAt ? Date.parse(session.endedAt) : undefined,
        id: session.id,
        startedAt: session.startedAt ? Date.parse(session.startedAt) : undefined,
    }));
};

export const samoTrackToMediaTrack = (
    authentication: ServerAuthenticationResult,
    track: SamoMusicTrack,
    albumArtworkUrl: string | undefined,
    streamToken: string | undefined,
    albumArtworkImageId?: string,
): MobileMediaTrack => {
    const artworkUrl =
        resolveSamoAlbumArtworkUrl(authentication, { images: track.images }, streamToken) ??
        albumArtworkUrl ??
        // A track with no embedded art of its own (e.g. explo drops, whose art
        // is applied to the ALBUM, not the file) resolves to its album cover by
        // id. Without this, tracks built with no album fallback — every playlist
        // row, the library mirror, artist top tracks — carry NO artwork: the
        // player shows a blank cover and playlist rows borrow the playlist's own
        // art, so every explo track renders the same image (the reported bug).
        (track.albumId
            ? resolveSamoAlbumArtworkUrl(authentication, { id: track.albumId }, streamToken)
            : undefined);
    const artworkImageId = pickSamoImageId(track.images) ?? albumArtworkImageId;
    const playback = buildSamoMusicPlayback(
        authentication,
        track,
        artworkUrl,
        streamToken,
        artworkImageId,
    );

    const artist =
        track.displayArtist ??
        track.artistNames?.filter(Boolean).join(', ');

    return {
        album: track.albumTitle,
        albumId: track.albumId,
        artist,
        artistId: track.artistIds?.[0] ?? track.albumArtistIds?.[0],
        artworkUrl,
        artworkImageId,
        discNumber: normalizeSamoDiscNumber(track.discNumber),
        durationSeconds: track.durationSeconds,
        id: track.id,
        playback: playback ?? undefined,
        subtitle: track.displayArtist,
        title: track.title,
        trackNumber: track.trackNumber,
    };
};

const normalizeSamoDiscNumber = (discNumber?: number): number => {
    if (!discNumber || discNumber < 1) {
        return 1;
    }

    return discNumber;
};

const sortSamoTracks = (tracks: SamoMusicTrack[]): SamoMusicTrack[] => {
    return [...tracks].sort((left, right) => {
        const leftDisc = normalizeSamoDiscNumber(left.discNumber);
        const rightDisc = normalizeSamoDiscNumber(right.discNumber);
        if (leftDisc !== rightDisc) {
            return leftDisc - rightDisc;
        }
        return (left.trackNumber ?? 0) - (right.trackNumber ?? 0);
    });
};

const loadSamoAlbumTracks = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    albumId: string,
    album: SamoMusicAlbum,
): Promise<SamoMusicTrack[]> => {
    if (album.tracks && album.tracks.length > 0) {
        return album.tracks;
    }

    try {
        const tracksResponse = await listSamoMusicAlbumTracks(fetcher, authentication, albumId, {
            limit: 500,
        });
        const tracks = samoItemsOf(tracksResponse);
        if (tracks.length > 0) {
            return tracks;
        }
    } catch {
        // Fall back to scanning the global track list below.
    }

    const collected: SamoMusicTrack[] = [];
    const targetCount = album.trackCount ?? Number.POSITIVE_INFINITY;

    for (let offset = 0; offset < 50_000; offset += 500) {
        const tracksResponse = await listSamoMusicTracks(fetcher, authentication, {
            limit: 500,
            offset,
        });
        const batch = samoItemsOf(tracksResponse);
        if (batch.length === 0) {
            break;
        }

        collected.push(...batch.filter((track) => track.albumId === albumId));
        if (collected.length >= targetCount) {
            break;
        }
        if (batch.length < 500) {
            break;
        }
    }

    return collected;
};

/**
 * Enumerate every music track on a samo server as normalized
 * {@link MobileMediaTrack}s. Used by the Android local-cache sync to mirror the
 * whole track table in one pass; album track lists are then derived on-device by
 * grouping on `albumId` rather than fetching each album individually.
 *
 * Paginates the global `listSamoMusicTracks` endpoint 500 at a time and stops on
 * the first short/empty page. The stream token is resolved once up front so the
 * emitted playback URLs are immediately usable; a token failure is non-fatal and
 * simply yields tracks without a pre-signed token.
 */
export const loadSamoLibraryTracks = async (
    authentication: ServerAuthenticationResult,
    fetch?: SamoFetch,
    updatedSince?: number | string,
): Promise<MobileMediaTrack[]> => {
    const fetcher = getFetch(fetch);
    const streamToken = await ensureSamoStreamToken(authentication, fetcher).catch(
        () => undefined,
    );

    const tracks: MobileMediaTrack[] = [];
    for (let offset = 0; offset < 500_000; offset += 500) {
        const response = await listSamoMusicTracks(fetcher, authentication, {
            limit: 500,
            offset,
            updatedSince,
        });
        const batch = samoItemsOf(response);
        if (batch.length === 0) {
            break;
        }

        for (const track of batch) {
            tracks.push(samoTrackToMediaTrack(authentication, track, undefined, streamToken));
        }

        if (batch.length < 500) {
            break;
        }
    }

    return tracks;
};

// loadSamoSyncManifest fetches the deletion-reconciliation manifest (current
// entity IDs + server clock) for an incremental catalog sync. Mobile wrapper
// over fetchSamoSyncManifest that resolves the platform fetch like the other
// loaders here.
export const loadSamoSyncManifest = async (
    authentication: ServerAuthenticationResult,
    fetch?: SamoFetch,
): Promise<SamoSyncManifest> => {
    const fetcher = getFetch(fetch);
    return fetchSamoSyncManifest(fetcher, authentication);
};

/**
 * An album's credits as the hero's ONE supporting line: genres, then label,
 * separated by a middle dot ("Art Rock, Post-Rock · Parlophone").
 *
 * Deliberately one entry, not three. The hero stacks `metadataLines` as
 * centered rows under the cover, and an album already spends rows on the type
 * eyebrow, title, year, artist and format badge — pushing genre and label as
 * their own rows turned the header into a column of text. The release year is
 * NOT included: it has its own, more prominent line above the artist, which is
 * the whole reason `MobileMediaDetail.year` exists.
 *
 * Shared by the network loader and the mirror read path so both transports
 * render a byte-identical line — the same rule the raw-payload mappers follow.
 */
export const buildAlbumMetadataLines = (
    genres: string[] | undefined,
    recordLabel: string | undefined,
): string[] | undefined => {
    // Capped at two genres. The line renders on one row, and servers routinely
    // report four or five near-synonyms ("Alternative Rock, Post-Punk, New
    // Wave, Art Rock") — left whole, they push the label off the end, so the
    // tail genres would silently cost the user the label entirely. Two genres
    // characterise an album; the rest are noise competing for the same row.
    const genreText = genres?.filter(Boolean).slice(0, 2).join(', ');
    const credits = [genreText || undefined, recordLabel?.trim() || undefined].filter(
        (part): part is string => Boolean(part),
    );
    return credits.length > 0 ? [credits.join(' · ')] : undefined;
};

const loadSamoAlbumDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<MobileMediaDetail> => {
    const streamToken = await ensureSamoStreamToken(authentication, fetcher).catch(() => undefined);
    const album = await getSamoMusicAlbum(fetcher, authentication, id);
    const albumTracks = sortSamoTracks(await loadSamoAlbumTracks(authentication, fetcher, id, album));
    let artworkUrl = resolveSamoAlbumArtworkUrl(authentication, album, streamToken);
    if (!artworkUrl) {
        for (const track of albumTracks) {
            artworkUrl = resolveSamoAlbumArtworkUrl(
                authentication,
                { images: track.images },
                streamToken,
            );
            if (artworkUrl) {
                break;
            }
        }
    }
    const artworkImageId = resolveSamoArtworkImageId(album.images, albumTracks);
    const tracks = albumTracks.map((track) =>
        samoTrackToMediaTrack(
            authentication,
            track,
            artworkUrl,
            streamToken,
            artworkImageId,
        ),
    );

    return {
        artworkUrl,
        artworkImageId,
        discCount: album.discCount,
        id: album.id,
        metadataLines: buildAlbumMetadataLines(album.genres, album.recordLabel),
        qualityProfile: samoAlbumQualityProfile(album),
        source: getMobileContentSource(authentication),
        subtitle: album.displayArtist ?? album.albumArtistNames?.filter(Boolean).join(', '),
        title: album.title,
        tracks,
        type: MobileMediaDetailType.ALBUM,
        year: album.releaseYear,
    };
};

const loadSamoArtistDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<MobileMediaDetail> => {
    const streamToken = await ensureSamoStreamToken(authentication, fetcher).catch(() => undefined);
    // Albums are required; the enrichment rails (top tracks / appears-on) are
    // best-effort — a server that doesn't serve them yet (or errors) must still
    // yield a usable artist page, so they degrade to empty instead of throwing.
    const [artist, albumsResponse, topTracksResponse, appearsOnResponse] = await Promise.all([
        getSamoMusicArtist(fetcher, authentication, id),
        listSamoMusicArtistAlbums(fetcher, authentication, id, { limit: 200 }),
        listSamoMusicArtistTopTracks(fetcher, authentication, id, { limit: 5 }).catch(() => undefined),
        listSamoMusicArtistAppearsOn(fetcher, authentication, id, { limit: 20 }).catch(() => undefined),
    ]);
    return mapSamoArtistDetail(
        authentication,
        streamToken,
        artist,
        albumsResponse,
        topTracksResponse,
        appearsOnResponse,
    );
};

/**
 * Pure server-JSON → view-model mapping for an artist detail. Shared by the
 * network loader above and the catalog read path, which hydrates the raw
 * responses the Kotlin sync stored (`$samoRawDetail` envelope) at read time —
 * ONE mapping implementation for both transports.
 */
export const mapSamoArtistDetail = (
    authentication: ServerAuthenticationResult,
    streamToken: string | undefined,
    artist: SamoMusicArtist,
    albumsResponse: SamoMusicAlbum[] | SamoPaginatedResponse<SamoMusicAlbum>,
    topTracksResponse?: SamoMusicTrack[] | SamoPaginatedResponse<SamoMusicTrack>,
    appearsOnResponse?: SamoMusicAlbum[] | SamoPaginatedResponse<SamoMusicAlbum>,
): MobileMediaDetail => {
    const source = getMobileContentSource(authentication);
    const albumToItem = (album: SamoMusicAlbum): MobileHomeItem[] => {
        if (!album.id || !album.title) return [];
        return [
            {
                addedAt: album.addedAt ? Date.parse(album.addedAt) : undefined,
                artworkImageId: pickSamoImageId(album.images),
                artworkUrl: resolveSamoAlbumArtworkUrl(authentication, album, streamToken),
                id: album.id,
                qualityProfile: samoAlbumQualityProfile(album),
                source,
                subtitle: album.releaseYear ? String(album.releaseYear) : undefined,
                title: album.title,
                type: MobileHomeItemType.ALBUM,
                year: album.releaseYear,
            },
        ];
    };

    const items = samoItemsOf(albumsResponse).flatMap(albumToItem);
    const appearsOnItems = appearsOnResponse
        ? samoItemsOf(appearsOnResponse).flatMap(albumToItem)
        : [];
    const topTracks: MobileMediaTrack[] = topTracksResponse
        ? samoItemsOf(topTracksResponse).map((track) =>
              samoTrackToMediaTrack(authentication, track, undefined, streamToken),
          )
        : [];
    const relatedArtists: MobileHomeItem[] = (artist.similarArtists ?? []).flatMap<MobileHomeItem>(
        (ref: SamoArtistRef) => {
            if (!ref.name) return [];
            if (ref.external || !ref.id) {
                // Not in this library: render the tile from the provider image
                // and flag it so a tap routes to search, not a detail fetch
                // (which would 404 on a synthetic id).
                return [
                    {
                        artworkUrl: ref.imageUrl,
                        external: true,
                        id: ref.id || `ext:${ref.name}`,
                        source,
                        title: ref.name,
                        type: MobileHomeItemType.ARTIST,
                    },
                ];
            }
            return [
                {
                    artworkImageId: pickSamoImageId(ref.images),
                    artworkUrl: resolveSamoArtistArtworkUrl(
                        authentication,
                        { id: ref.id, images: ref.images },
                        streamToken,
                    ),
                    id: ref.id,
                    source,
                    title: ref.name,
                    type: MobileHomeItemType.ARTIST,
                },
            ];
        },
    );

    const metadataLines: string[] = [];
    if (artist.albumCount) metadataLines.push(`${artist.albumCount} albums`);
    if (artist.trackCount) metadataLines.push(`${artist.trackCount} tracks`);
    if (artist.country) metadataLines.push(artist.country);

    return {
        appearsOnItems: appearsOnItems.length > 0 ? appearsOnItems : undefined,
        artworkUrl: resolveSamoArtistArtworkUrl(authentication, artist, streamToken),
        artworkImageId: pickSamoImageId(artist.images),
        biography: artist.biography,
        id: artist.id,
        items,
        metadataLines: metadataLines.length > 0 ? metadataLines : undefined,
        relatedArtists: relatedArtists.length > 0 ? relatedArtists : undefined,
        source,
        subtitle: artist.disambiguation,
        title: artist.name,
        topTracks: topTracks.length > 0 ? topTracks : undefined,
        tracks: [],
        type: MobileMediaDetailType.ARTIST,
    };
};

/**
 * Every track of a playlist. A single limit=500 page silently truncated larger
 * playlists — the UI then showed 500 tracks as if that were the whole list.
 */
const listAllSamoPlaylistTracks = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<SamoMusicTrack[]> =>
    // Capped, not complete: this feeds the detail VIEW. Membership edits read
    // through listMobilePlaylistTrackIds, which refuses a partial list because
    // it writes the result back. Do not swap this for the throwing variant
    // without checking that nothing downstream PATCHes it.
    collectSamoPagesCapped(500, 50_000, (offset) =>
        listSamoMusicPlaylistTracks(fetcher, authentication, id, { limit: 500, offset }),
    ).then((collection) => collection.items);

const loadSamoPlaylistDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<MobileMediaDetail> => {
    const streamToken = await ensureSamoStreamToken(authentication, fetcher).catch(() => undefined);
    const [playlist, tracks] = await Promise.all([
        getSamoMusicPlaylist(fetcher, authentication, id),
        listAllSamoPlaylistTracks(authentication, fetcher, id),
    ]);
    return mapSamoPlaylistDetail(authentication, streamToken, playlist, tracks);
};

/** Pure mapping twin of {@link loadSamoPlaylistDetail} — see mapSamoArtistDetail. */
export const mapSamoPlaylistDetail = (
    authentication: ServerAuthenticationResult,
    streamToken: string | undefined,
    playlist: SamoMusicPlaylist,
    tracksResponse: SamoMusicTrack[] | SamoPaginatedResponse<SamoMusicTrack>,
): MobileMediaDetail => {
    const items = samoItemsOf(tracksResponse);
    const tracks = items.map((track) =>
        samoTrackToMediaTrack(authentication, track, undefined, streamToken),
    );

    return {
        artworkUrl: resolveSamoPlaylistArtworkUrl(authentication, playlist, streamToken),
        // A grid playlist (>1 cover) renders the server-composited 2x2 at
        // artworkUrl; a single first-cover imageId here would make the display
        // resolver prefer that one cover and lose the grid.
        artworkImageId: samoPlaylistHasCoverGrid(playlist)
            ? undefined
            : pickSamoImageId(playlist.images),
        id: playlist.id,
        metadataLines: playlist.description ? [playlist.description] : undefined,
        playlistMeta: {
            description: playlist.description?.trim() || undefined,
            // A server-managed system playlist (the explo "Explore" queue) is
            // never client-editable, no matter who owns it: the server
            // re-derives its name/membership every reconcile pass and refuses
            // client mutations with a 403.
            editable:
                !playlist.system && isPlaylistOwnedByUser(authentication, playlist.ownerId),
            ownerId: playlist.ownerId,
            public: playlist.public,
            system: playlist.system === true,
        },
        source: getMobileContentSource(authentication),
        subtitle:
            playlist.ownerName ??
            (playlist.trackCount ? `${playlist.trackCount} tracks` : undefined),
        title: playlist.name,
        tracks,
        type: MobileMediaDetailType.PLAYLIST,
    };
};

const loadSamoAudiobookDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<MobileMediaDetail> => {
    const streamToken = await ensureSamoStreamToken(authentication, fetcher).catch(() => undefined);
    const [audiobook, bookmarksResponse, sessionsResponse] = await Promise.all([
        getSamoAudiobook(fetcher, authentication, id),
        listSamoAudiobookBookmarks(fetcher, authentication, id).catch(() => undefined),
        listSamoAudiobookSessions(fetcher, authentication, id, { limit: 25 }).catch(
            () => undefined,
        ),
    ]);
    return mapSamoAudiobookDetail(
        authentication,
        streamToken,
        audiobook,
        bookmarksResponse,
        sessionsResponse,
    );
};

/** Pure mapping twin of {@link loadSamoAudiobookDetail} — see mapSamoArtistDetail. */
export const mapSamoAudiobookDetail = (
    authentication: ServerAuthenticationResult,
    streamToken: string | undefined,
    audiobook: SamoAudiobook,
    bookmarksResponse?: SamoBookmark[] | SamoPaginatedResponse<SamoBookmark>,
    sessionsResponse?: SamoListeningSession[] | SamoPaginatedResponse<SamoListeningSession>,
): MobileMediaDetail => {
    const artworkUrl = resolveSamoAudiobookArtworkUrl(authentication, audiobook, streamToken);
    const artworkImageId = pickSamoImageId(audiobook.cover ? [audiobook.cover] : undefined);
    const title = audiobook.book?.title ?? 'Untitled audiobook';
    const timelineSegments = buildAudiobookTimelineSegments(
        audiobook.chapters,
        audiobook.durationSeconds,
        audiobook.id,
    );
    const playback = buildSamoAudiobookPlayback(
        authentication,
        audiobook,
        artworkUrl,
        streamToken,
        { timelineSegments },
    );

    const chapters = samoChaptersToBookmarks(audiobook.chapters);

    const tracks: MobileMediaTrack[] = chapters.length > 0
        ? chapters.map((chapter, index) => {
              const startSeconds = chapter.positionSeconds ?? 0;
              const segment = timelineSegments[index];
              return {
                  artworkUrl,
                  durationSeconds: segment?.durationSeconds,
                  id: chapter.id,
                  itemId: audiobook.id,
                  playback: playback ?? undefined,
                  startSeconds,
                  subtitle: title,
                  timelineSegments:
                      timelineSegments.length > 1 ? timelineSegments : undefined,
                  title: chapter.title ?? `Chapter ${index + 1}`,
                  trackNumber: index + 1,
              };
          })
        : playback
        ? [
              {
                  artworkUrl,
                  durationSeconds: audiobook.durationSeconds,
                  id: audiobook.id,
                  itemId: audiobook.id,
                  playback,
                  subtitle: title,
                  title,
                  trackNumber: 1,
              },
          ]
        : [];

    const authorsSummary =
        audiobook.book?.authors?.map((author) => author.name).filter(Boolean).join(', ') ||
        undefined;
    const narratorsSummary =
        audiobook.book?.narrators?.map((person) => person.name).filter(Boolean).join(', ') ||
        undefined;
    const seriesSummary = audiobook.series && audiobook.series.length > 0
        ? audiobook.series
              .map((entry) =>
                  audiobook.book?.seriesSequence
                      ? `${entry.name}, Book ${audiobook.book.seriesSequence}`
                      : entry.name,
              )
              .filter(Boolean)
              .join(' • ')
        : undefined;

    const metadataLines: string[] = [];
    if (authorsSummary) metadataLines.push(authorsSummary);
    if (narratorsSummary) metadataLines.push(`Narrated by ${narratorsSummary}`);
    if (seriesSummary) metadataLines.push(seriesSummary);
    if (audiobook.book?.publisher) metadataLines.push(audiobook.book.publisher);
    if (audiobook.book?.publishedYear)
        metadataLines.push(String(audiobook.book.publishedYear));

    // `publishedYear` may arrive as a number or a "2011"-style string; surface a
    // clean numeric year for the hero line, leaving it undefined when it isn't a
    // parseable year (the raw value still shows via metadataLines above).
    const publishedYearValue = audiobook.book?.publishedYear;
    const year =
        typeof publishedYearValue === 'number'
            ? publishedYearValue
            : publishedYearValue
              ? Number.parseInt(publishedYearValue, 10) || undefined
              : undefined;

    return {
        artworkImageId,
        artworkUrl,
        audiobookFiles: samoAudiobookFilePlaybacks(audiobook),
        authorsSummary,
        bookmarks: samoBookmarksToDetail(samoItemsOf(bookmarksResponse)),
        chapters,
        chapterQuality: deriveChapterQuality(
            audiobook.chapterSource,
            audiobook.chapterConfidence,
            chapters.length,
        ),
        contributors: audiobook.book?.narrators?.map((person) => ({
            id: person.id,
            name: person.name,
            role: 'narrator',
        })),
        durationSeconds: audiobook.durationSeconds,
        id: audiobook.id,
        listeningSessions: samoSessionsToDetail(samoItemsOf(sessionsResponse)),
        metadataLines: metadataLines.length > 0 ? metadataLines : undefined,
        narratorsSummary,
        seriesSummary,
        source: getMobileContentSource(authentication),
        subtitle: authorsSummary,
        title,
        tracks,
        type: MobileMediaDetailType.AUDIOBOOK,
        year,
    };
};

/** Every episode of a show, paginated to exhaustion — same rationale (and
 *  same runaway guard) as {@link listAllSamoPlaylistTracks}. */
const listAllSamoPodcastEpisodes = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    showId: string,
): Promise<SamoPodcastEpisode[]> =>
    // Display only — an episode list is never written back.
    collectSamoPagesCapped(500, 50_000, (offset) =>
        listSamoPodcastEpisodes(fetcher, authentication, showId, { limit: 500, offset }),
    ).then((collection) => collection.items);

const loadSamoPodcastDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<MobileMediaDetail> => {
    const streamToken = await ensureSamoStreamToken(authentication, fetcher).catch(() => undefined);
    const [podcast, episodes] = await Promise.all([
        getSamoPodcastShow(fetcher, authentication, id),
        listAllSamoPodcastEpisodes(authentication, fetcher, id),
    ]);
    return mapSamoPodcastDetail(authentication, streamToken, podcast, episodes);
};

/**
 * ONE podcast episode → the track view model, with a PODCAST playable.
 *
 * Shared by every reader of an episode: the network detail load below and the
 * Android catalog mirror, which stores episodes as `catalog_track` rows. That
 * sharing is the point. The mirror used to hydrate its episode rows through
 * `samoTrackToMediaTrack` — the MUSIC mapper — because both kinds are stored in
 * the same `$samoRawTrack` envelope. A podcast episode run through it comes out
 * as a music track: `source: 'music'`, no artwork (an episode has no
 * `images`/`albumId` to resolve one from, and the music mapper knows nothing of
 * the show's cover), and a stream URL of `/api/v1/music/tracks/<episodeId>` —
 * a route that cannot serve a podcast episode. That is a coverless player
 * spinning on a stream that will never open, for every show the sync had
 * already crawled.
 */
export const samoPodcastEpisodeToMediaTrack = (
    authentication: ServerAuthenticationResult,
    episode: SamoPodcastEpisode,
    showId: string,
    showArtworkUrl: string | undefined,
    streamToken: string | undefined,
): MobileMediaTrack | null => {
    if (!episode.id) return null;
    // An episode carries its own art only when the feed gives it one; otherwise
    // it inherits the show's cover, which is the only artwork most feeds have.
    const artworkUrl =
        resolveSamoPodcastEpisodeArtworkUrl(authentication, episode, streamToken) ??
        showArtworkUrl;
    const playback = buildSamoPodcastEpisodePlayback(
        authentication,
        episode,
        showId,
        artworkUrl,
        streamToken,
    );
    return {
        artworkUrl,
        description: episode.description,
        durationSeconds: episode.durationSeconds ?? episode.duration,
        episodeId: episode.id,
        id: episode.id,
        itemId: showId,
        playback: playback ?? undefined,
        publishedAt: episode.publishedAt ? Date.parse(episode.publishedAt) : undefined,
        subtitle: episode.subtitle,
        title: episode.title ?? episode.name ?? 'Untitled episode',
        trackNumber: episode.episodeNumber,
    };
};

/** Pure mapping twin of {@link loadSamoPodcastDetail} — see mapSamoArtistDetail. */
export const mapSamoPodcastDetail = (
    authentication: ServerAuthenticationResult,
    streamToken: string | undefined,
    podcast: SamoPodcast,
    episodesResponse: SamoPodcastEpisode[] | SamoPaginatedResponse<SamoPodcastEpisode>,
): MobileMediaDetail => {
    const showArtwork = resolveSamoPodcastArtworkUrl(authentication, podcast, streamToken);
    const artworkImageId = pickSamoImageId(podcast.cover ? [podcast.cover] : undefined);
    const showMeta = podcast.podcast;
    const title = showMeta?.title ?? 'Untitled podcast';
    const episodes = samoItemsOf(episodesResponse);

    const tracks: MobileMediaTrack[] = episodes.flatMap((episode) => {
        const track = samoPodcastEpisodeToMediaTrack(
            authentication,
            episode,
            podcast.id,
            showArtwork,
            streamToken,
        );
        return track ? [track] : [];
    });

    const feed = podcast.feed?.poll
        ? {
              consecutiveErrors: podcast.feed.poll.consecutiveErrors,
              feedUrl: showMeta?.feedUrl ?? podcast.feed.feedUrl,
              lastPollFinishedAt: podcast.feed.poll.lastPollFinishedAt
                  ? Date.parse(podcast.feed.poll.lastPollFinishedAt)
                  : undefined,
              lastPollStartedAt: podcast.feed.poll.lastPollStartedAt
                  ? Date.parse(podcast.feed.poll.lastPollStartedAt)
                  : undefined,
              nextPollAt: podcast.feed.poll.nextPollAt
                  ? Date.parse(podcast.feed.poll.nextPollAt)
                  : undefined,
              pollEnabled: podcast.feed.poll.pollEnabled,
              pollIntervalSeconds: podcast.feed.poll.pollIntervalSeconds,
          }
        : showMeta?.feedUrl
        ? { feedUrl: showMeta.feedUrl }
        : undefined;

    const metadataLines: string[] = [];
    if (showMeta?.author) metadataLines.push(showMeta.author);
    if (showMeta?.categories && showMeta.categories.length > 0)
        metadataLines.push(showMeta.categories.join(', '));
    if (showMeta?.episodeCount) metadataLines.push(`${showMeta.episodeCount} episodes`);

    return {
        artworkImageId,
        artworkUrl: showArtwork,
        feed,
        id: podcast.id,
        metadataLines: metadataLines.length > 0 ? metadataLines : undefined,
        source: getMobileContentSource(authentication),
        subtitle: showMeta?.author,
        title,
        tracks,
        type: MobileMediaDetailType.PODCAST,
    };
};

const loadSamoMediaDetail = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
    type: MobileMediaDetailType,
): Promise<MobileMediaDetail> => {
    switch (type) {
        case MobileMediaDetailType.ALBUM:
            return loadSamoAlbumDetail(authentication, fetcher, id);
        case MobileMediaDetailType.ARTIST:
            return loadSamoArtistDetail(authentication, fetcher, id);
        case MobileMediaDetailType.AUDIOBOOK:
            return loadSamoAudiobookDetail(authentication, fetcher, id);
        case MobileMediaDetailType.PLAYLIST:
            return loadSamoPlaylistDetail(authentication, fetcher, id);
        case MobileMediaDetailType.PODCAST:
            return loadSamoPodcastDetail(authentication, fetcher, id);
    }
};

// ---------------------------------------------------------------------------
// Raw detail bundles (Kotlin-synced catalog rows)
// ---------------------------------------------------------------------------

/**
 * The envelope the Android Kotlin catalog sync stores in `catalog_detail`:
 * the RAW server responses for an entity + its children, exactly as the
 * network loaders above would have fetched them. Keeping rows raw means the
 * server-JSON → view-model mapping has ONE implementation (the map* functions
 * here) shared by the network path, the mirror read path, and desktop —
 * instead of a Kotlin re-implementation that would drift.
 */
/**
 * The envelope the Android Kotlin catalog sync stores in `catalog_track`
 * payloads: the RAW server track JSON. Hydrated at read time through
 * {@link samoTrackToMediaTrack} so the track view model — including its
 * `playback` (stream URL, quality, mime) — comes from the ONE canonical
 * mapper. The coexistence-era Kotlin payload omitted `playback` entirely,
 * which sent every mirror-served album tap down the legacy ABS fallback
 * (a POST the samo server answers with 405).
 */
export interface SamoRawTrackEnvelope {
    $samoRawTrack: 1;
    track: unknown;
}

export const isSamoRawTrackEnvelope = (value: unknown): value is SamoRawTrackEnvelope =>
    typeof value === 'object' &&
    value !== null &&
    (value as { $samoRawTrack?: unknown }).$samoRawTrack === 1;

export const mapSamoMediaTrackFromRaw = (
    authentication: ServerAuthenticationResult,
    streamToken: string | undefined,
    envelope: SamoRawTrackEnvelope,
): MobileMediaTrack | null => {
    try {
        return samoTrackToMediaTrack(
            authentication,
            envelope.track as SamoMusicTrack,
            undefined,
            streamToken,
        );
    } catch {
        return null;
    }
};

/**
 * The PODCAST-EPISODE reading of the same envelope.
 *
 * `$samoRawTrack` is a storage envelope, not a type: the Android sync wraps
 * album/playlist tracks AND podcast episodes in it, and only the row's
 * `container_type` says which. So the envelope alone can never pick a mapper —
 * the caller has to, and a podcast container must call this one.
 * {@link mapSamoMediaTrackFromRaw} would read the episode as a music track and
 * build it a `/music/tracks/…` stream URL and no artwork.
 */
export const mapSamoPodcastEpisodeTrackFromRaw = (
    authentication: ServerAuthenticationResult,
    streamToken: string | undefined,
    envelope: SamoRawTrackEnvelope,
    showId: string,
    showArtworkUrl: string | undefined,
): MobileMediaTrack | null => {
    try {
        return samoPodcastEpisodeToMediaTrack(
            authentication,
            envelope.track as SamoPodcastEpisode,
            showId,
            showArtworkUrl,
            streamToken,
        );
    } catch {
        return null;
    }
};

export interface SamoRawDetailBundle {
    $samoRawDetail: 1;
    kind: 'artist' | 'audiobook' | 'playlist' | 'podcast';
    entity: unknown;
    children: Record<string, unknown>;
}

export const isSamoRawDetailBundle = (value: unknown): value is SamoRawDetailBundle =>
    typeof value === 'object' &&
    value !== null &&
    (value as { $samoRawDetail?: unknown }).$samoRawDetail === 1 &&
    typeof (value as { kind?: unknown }).kind === 'string';

/**
 * Hydrate a stored raw bundle into a MobileMediaDetail. `streamToken` should
 * be the caller's cached token (sync read path can't await a mint); URLs
 * built with a stale/absent token are tolerated downstream — the play path
 * re-finalizes tokens before handing anything to the player.
 */
export const mapSamoMediaDetailFromRawBundle = (
    authentication: ServerAuthenticationResult,
    streamToken: string | undefined,
    bundle: SamoRawDetailBundle,
): MobileMediaDetail | null => {
    try {
        switch (bundle.kind) {
            case 'artist':
                return mapSamoArtistDetail(
                    authentication,
                    streamToken,
                    bundle.entity as SamoMusicArtist,
                    (bundle.children.albums ?? []) as SamoPaginatedResponse<SamoMusicAlbum>,
                    bundle.children.topTracks as
                        | SamoPaginatedResponse<SamoMusicTrack>
                        | undefined,
                    bundle.children.appearsOn as
                        | SamoPaginatedResponse<SamoMusicAlbum>
                        | undefined,
                );
            case 'audiobook':
                return mapSamoAudiobookDetail(
                    authentication,
                    streamToken,
                    bundle.entity as SamoAudiobook,
                    bundle.children.bookmarks as
                        | SamoPaginatedResponse<SamoBookmark>
                        | undefined,
                    bundle.children.sessions as
                        | SamoPaginatedResponse<SamoListeningSession>
                        | undefined,
                );
            case 'playlist':
                return mapSamoPlaylistDetail(
                    authentication,
                    streamToken,
                    bundle.entity as SamoMusicPlaylist,
                    (bundle.children.tracks ?? []) as SamoPaginatedResponse<SamoMusicTrack>,
                );
            case 'podcast':
                return mapSamoPodcastDetail(
                    authentication,
                    streamToken,
                    bundle.entity as SamoPodcast,
                    (bundle.children.episodes ?? []) as SamoPaginatedResponse<SamoPodcastEpisode>,
                );
            default:
                return null;
        }
    } catch {
        // A malformed stored bundle must read as a cache miss, never a crash.
        return null;
    }
};

export const loadMobileMediaDetail = async ({
    authentication,
    fetch: fetcher,
    id,
    signal,
    type,
}: MobileMediaDetailInput): Promise<MobileMediaDetail> => {
    const request = getFetch(fetcher);

    if (signal?.aborted) {
        throw new Error('loadMobileMediaDetail aborted');
    }

    if (authentication.type === ServerType.SAMO) {
        return loadSamoMediaDetail(authentication, request, id, type);
    }

    throw new Error('Opening this media type is not wired for Android yet.');
};





export interface SongRadioSeed {
    albumId?: string;
    artist?: string;
    artistId?: string;
    songId: string;
}

export interface CreateMobilePlaylistInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    name: string;
    songIds?: string[];
}

export const createMobilePlaylist = async ({
    authentication,
    fetch: fetcher,
    name,
    songIds,
}: CreateMobilePlaylistInput): Promise<MobileHomeItem> => {
    const trimmedName = name.trim();

    if (!trimmedName) {
        throw new Error('Playlist name is required.');
    }

    const filteredSongIds = songIds?.filter(Boolean) ?? [];
    const request = getFetch(fetcher);
    const source = getMobileContentSource(authentication);

    if (authentication.type === ServerType.SAMO) {
        const streamToken = await ensureSamoStreamToken(authentication, request).catch(
            () => undefined,
        );
        const playlist = await createSamoMusicPlaylist(request, authentication, {
            name: trimmedName,
            trackIds: filteredSongIds.length > 0 ? filteredSongIds : undefined,
        });

        return {
            artworkUrl: resolveSamoPlaylistArtworkUrl(authentication, playlist, streamToken),
            id: playlist.id,
            source,
            subtitle: playlist.trackCount
                ? `${playlist.trackCount} tracks`
                : playlist.ownerName ?? undefined,
            title: playlist.name,
            type: MobileHomeItemType.PLAYLIST,
        };
    }

    throw new Error('Creating playlists is only available for samo servers.');
};

export const addMobileTracksToPlaylist = async ({
    authentication,
    fetch: fetcher,
    playlistId,
    songIds,
}: AddMobileTracksToPlaylistInput): Promise<void> => {
    const filteredSongIds = songIds.filter(Boolean);

    if (filteredSongIds.length === 0) {
        throw new Error('No tracks were selected.');
    }

    const request = getFetch(fetcher);

    if (authentication.type === ServerType.SAMO) {
        // samo's playlist update API replaces the trackIds list wholesale, so
        // load the current track set and append.
        //
        // Exhaustively, and that matters more here than on a read path: the
        // merged list below is PATCHed back as the playlist's entire contents.
        // Reading one limit=500 page did not truncate the VIEW of a larger
        // playlist, it truncated the playlist — adding a song to a 600-track
        // playlist wrote back 501 ids and deleted the other 99.
        const existingIds = (
            await listAllSamoPlaylistTracks(authentication, request, playlistId)
        )
            .map((track) => track.id)
            .filter(Boolean) as string[];
        const merged = [...existingIds];
        const mergedSet = new Set<string>(existingIds);
        for (const id of filteredSongIds) {
            if (!mergedSet.has(id)) {
                mergedSet.add(id);
                merged.push(id);
            }
        }

        await requestJson<unknown>(request, `${authentication.url}/api/v1/music/playlists/${playlistId}`, {
            body: JSON.stringify({ trackIds: merged }),
            headers: {
                Authorization: `Bearer ${authentication.credential}`,
                'Content-Type': 'application/json',
            },
            method: 'PATCH',
        });
        return;
    }

    throw new Error('Adding tracks to playlists is only available for samo servers.');
};
