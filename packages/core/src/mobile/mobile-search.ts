import { ServerType } from "../server/server-types";
import { ensureSamoStreamToken } from "../server/server-samo-stream-token";

import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, type SamoFetch } from '../server/server-http';
import {
    type SamoAudiobook,
    type SamoMusicAlbum,
    type SamoMusicArtist,
    type SamoMusicTrack,
    type SamoPodcast,
    resolveSamoAlbumArtworkUrl,
    resolveSamoArtistArtworkUrl,
    resolveSamoAudiobookArtworkUrl,
    resolveSamoPodcastArtworkUrl,
    pickSamoImageId,
    searchSamoAudiobooks,
    searchSamoMusic,
    searchSamoPodcasts,
    samoItemsOf,
} from '../server/server-samo';
import {
    getMobileContentSource,
    type MobileContentSource,
} from './mobile-content-source';
import {
    buildSamoMusicPlayback,
    type MobilePlayableAudio,
} from './mobile-playback';
import { samoAlbumQualityProfile, type MobileQualityProfile } from './mobile-home';
import { propagateSearchAlbumQualityFromSongs } from './mobile-quality-profile';

export enum MobileSearchItemType {
    ALBUM = 'album',
    ARTIST = 'artist',
    AUDIOBOOK = 'audiobook',
    PLAYLIST = 'playlist',
    PODCAST = 'podcast',
    RADIO = 'radio',
    SONG = 'song',
}

export enum MobileSearchSectionId {
    ALBUMS = 'albums',
    ARTISTS = 'artists',
    AUDIOBOOKS = 'audiobooks',
    PLAYLISTS = 'playlists',
    PODCASTS = 'podcasts',
    RADIO = 'radio',
    SONGS = 'songs',
    /** Cross-type "Best matches" highlight reel, rendered above the per-type sections. */
    TOP = 'top',
}

export interface MobileSearchAcrossServersInput {
    authentication: ServerAuthenticationResult | null;
    fetch?: SamoFetch;
    limit?: number;
    query: string;
    userRecents?: Map<string, number>;
}

export interface MobileSearchInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    limit?: number;
    query: string;
    signal?: AbortSignal;
}

export interface MobileSearchItem {
    album?: string;
    albumId?: string;
    artist?: string;
    artistId?: string;
    artworkUrl?: string;
    artworkImageId?: string;
    id: string;
    isHiRes?: boolean;
    lastPlayedAt?: number;
    playback?: MobilePlayableAudio;
    playCount?: number;
    /**
     * Format profile for album hits (albums only).
     * Songs derive their profile from playback.quality at render time.
     * Playlists, artists, etc. are always undefined.
     */
    qualityProfile?: MobileQualityProfile;
    source?: MobileContentSource;
    subtitle?: string;
    title: string;
    type: MobileSearchItemType;
}

export interface MobileSearchResults {
    errors: MobileSearchSectionError[];
    query: string;
    searchedAt: number;
    sections: MobileSearchSection[];
}

export interface MobileSearchSection {
    id: MobileSearchSectionId;
    items: MobileSearchItem[];
    title: string;
}

export interface MobileSearchSectionError {
    message: string;
    sectionId: MobileSearchSectionId;
}

const DEFAULT_SEARCH_LIMIT = 8;

const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Search failed';
};

export const getMobileSearchErrorMessage = getErrorMessage;

const hasItems = (section: MobileSearchSection) => section.items.length > 0;

// Match-quality tiers, descending. Used to bubble obvious matches (a query that
// IS an artist name) above incidental ones (songs that merely contain the query).
const SCORE_TITLE_EXACT = 100;
const SCORE_TITLE_PREFIX = 80;
const SCORE_TITLE_WORD_PREFIX = 60;
const SCORE_TITLE_SUBSTRING = 40;
const SCORE_SUBTITLE_PREFIX = 30;
const SCORE_SUBTITLE_WORD_PREFIX = 20;
const SCORE_SUBTITLE_SUBSTRING = 15;

// Popularity and personal-recency weights cap the influence either signal can
// have, so a niche exact-title match still beats a popular near-miss.
const POPULARITY_WEIGHT = 6;
const POPULARITY_CAP = 30;
const USER_RECENCY_MAX_BOOST = 28;
// Same window we keep recent items in storage; anything older counts as cold.
const USER_RECENCY_HORIZON_MS = 30 * 24 * 60 * 60 * 1000;

export interface MobileSearchRankingContext {
    userRecents?: Map<string, number>;
}

export const getMobileSearchItemKey = (item: {
    id: string;
    source?: { id: string };
    type: string;
}) => `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;

const scorePopularity = (item: MobileSearchItem) => {
    const playCount = item.playCount ?? 0;
    if (playCount <= 0) return 0;
    // log-scaled so 100k plays doesn't drown out match quality entirely.
    return Math.min(POPULARITY_CAP, Math.log10(playCount + 1) * POPULARITY_WEIGHT);
};

const scoreUserRecency = (
    item: MobileSearchItem,
    userRecents: Map<string, number> | undefined,
    now: number,
) => {
    if (!userRecents) return 0;
    const selectedAt = userRecents.get(getMobileSearchItemKey(item));
    if (!selectedAt) return 0;
    const age = Math.max(0, now - selectedAt);
    if (age >= USER_RECENCY_HORIZON_MS) return 0;
    // Fresh selections lift items hard; the boost decays linearly over the window.
    return Math.round(USER_RECENCY_MAX_BOOST * (1 - age / USER_RECENCY_HORIZON_MS));
};

// Secondary fields (subtitle / artist / album) only ever earn the lower tier,
// so a song that matches solely through the artist it credits can never outrank
// the artist entity whose *title* is that name.
const scoreSecondaryField = (value: string, normalizedQuery: string) => {
    if (!value) return 0;
    if (value.startsWith(normalizedQuery)) return SCORE_SUBTITLE_PREFIX;
    if (value.split(/\s+/).some((word) => word.startsWith(normalizedQuery))) {
        return SCORE_SUBTITLE_WORD_PREFIX;
    }
    if (value.includes(normalizedQuery)) return SCORE_SUBTITLE_SUBSTRING;
    return 0;
};

const scoreMatch = (item: MobileSearchItem, normalizedQuery: string) => {
    if (!normalizedQuery) return 0;
    const title = item.title.toLowerCase();

    if (title === normalizedQuery) return SCORE_TITLE_EXACT;
    if (title.startsWith(normalizedQuery)) return SCORE_TITLE_PREFIX;
    if (title.split(/\s+/).some((word) => word.startsWith(normalizedQuery))) {
        return SCORE_TITLE_WORD_PREFIX;
    }
    if (title.includes(normalizedQuery)) return SCORE_TITLE_SUBSTRING;

    return Math.max(
        scoreSecondaryField(item.subtitle?.toLowerCase() ?? '', normalizedQuery),
        scoreSecondaryField(item.artist?.toLowerCase() ?? '', normalizedQuery),
        scoreSecondaryField(item.album?.toLowerCase() ?? '', normalizedQuery),
    );
};

const scoreSearchItem = (
    item: MobileSearchItem,
    normalizedQuery: string,
    userRecents: Map<string, number> | undefined,
    now: number,
) => {
    const match = scoreMatch(item, normalizedQuery);
    if (match === 0) return 0;
    return match + scorePopularity(item) + scoreUserRecency(item, userRecents, now);
};

const rankSearchSections = (
    query: string,
    sections: MobileSearchSection[],
    context: MobileSearchRankingContext | undefined,
): MobileSearchSection[] => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sections;
    const now = Date.now();
    const userRecents = context?.userRecents;

    const scored = sections.map((section) => {
        const items = section.items
            .map((item) => ({ item, score: scoreSearchItem(item, normalizedQuery, userRecents, now) }))
            .sort((left, right) => right.score - left.score);
        const topScore = items[0]?.score ?? 0;
        return { section: { ...section, items: items.map(({ item }) => item) }, topScore };
    });

    scored.sort((left, right) => right.topScore - left.topScore);
    return scored.map(({ section }) => section);
};

// Number of cross-type hits surfaced in the "Best matches" section.
const BEST_MATCHES_LIMIT = 5;

/**
 * Builds the cross-type "Best matches" section from already-ranked sections:
 * the globally top-scoring items regardless of media type, deduplicated. Only
 * worth showing when the real matches span more than one media type — otherwise
 * it would just duplicate the single section already rendered below it.
 */
const buildBestMatchesSection = (
    rankedSections: MobileSearchSection[],
    query: string,
    context: MobileSearchRankingContext | undefined,
): MobileSearchSection | null => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return null;

    const now = Date.now();
    const userRecents = context?.userRecents;
    const scored = rankedSections
        .filter((section) => section.id !== MobileSearchSectionId.TOP)
        .flatMap((section) =>
            section.items.map((item) => ({
                item,
                score: scoreSearchItem(item, normalizedQuery, userRecents, now),
            })),
        )
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score);

    // Only a worthwhile highlight reel when the real matches span more than one
    // media type; a single-type result would just duplicate the lone section
    // rendered below it. (Scoring is the gate here, not FTS recall — items the
    // scorer can't explain are still kept in their own section above.)
    const matchedTypes = new Set(scored.map((entry) => entry.item.type));
    if (matchedTypes.size < 2) return null;

    const seen = new Set<string>();
    const items: MobileSearchItem[] = [];
    for (const { item } of scored) {
        const key = getMobileSearchItemKey(item);
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(item);
        if (items.length >= BEST_MATCHES_LIMIT) break;
    }

    return { id: MobileSearchSectionId.TOP, items, title: 'Best matches' };
};

const toSearchResults = (
    query: string,
    sections: MobileSearchSection[],
    errors: MobileSearchSectionError[] = [],
    context?: MobileSearchRankingContext,
): MobileSearchResults => {
    const ranked = rankSearchSections(query, sections.filter(hasItems), context);
    const bestMatches = buildBestMatchesSection(ranked, query, context);
    return {
        errors,
        query,
        searchedAt: Date.now(),
        sections: bestMatches ? [bestMatches, ...ranked] : ranked,
    };
};

const SEARCH_SECTION_DEF_BY_TYPE: Record<
    MobileSearchItemType,
    { id: MobileSearchSectionId; title: string }
> = {
    [MobileSearchItemType.SONG]: { id: MobileSearchSectionId.SONGS, title: 'Songs' },
    [MobileSearchItemType.ALBUM]: { id: MobileSearchSectionId.ALBUMS, title: 'Albums' },
    [MobileSearchItemType.ARTIST]: { id: MobileSearchSectionId.ARTISTS, title: 'Artists' },
    [MobileSearchItemType.AUDIOBOOK]: {
        id: MobileSearchSectionId.AUDIOBOOKS,
        title: 'Audiobooks',
    },
    [MobileSearchItemType.PODCAST]: { id: MobileSearchSectionId.PODCASTS, title: 'Podcasts' },
    [MobileSearchItemType.PLAYLIST]: { id: MobileSearchSectionId.PLAYLISTS, title: 'Playlists' },
    [MobileSearchItemType.RADIO]: { id: MobileSearchSectionId.RADIO, title: 'Radio' },
};

/** Groups a flat list of search hits into per-type sections (order set by ranking). */
const groupMobileSearchItems = (items: MobileSearchItem[]): MobileSearchSection[] => {
    const bySection = new Map<MobileSearchSectionId, MobileSearchSection>();
    for (const item of items) {
        const def = SEARCH_SECTION_DEF_BY_TYPE[item.type];
        if (!def) continue;
        const existing = bySection.get(def.id);
        if (existing) {
            existing.items.push(item);
        } else {
            bySection.set(def.id, { id: def.id, items: [item], title: def.title });
        }
    }
    return [...bySection.values()];
};

/**
 * Builds fully ranked {@link MobileSearchResults} from a flat list of hits —
 * the entry point for callers that already have items in hand (e.g. the
 * on-device catalog/FTS search), bypassing the per-server network loaders.
 * Items are deduplicated by key, grouped by type, then handed to the same
 * relevance ranker the network path uses, so sections are ordered by match
 * strength and a cross-type "Best matches" section is surfaced on top.
 */
export const buildMobileSearchResultsFromItems = (
    query: string,
    items: MobileSearchItem[],
    context?: MobileSearchRankingContext,
): MobileSearchResults => {
    const seen = new Set<string>();
    const unique: MobileSearchItem[] = [];
    for (const item of items) {
        const key = getMobileSearchItemKey(item);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
    }
    return toSearchResults(query, groupMobileSearchItems(unique), [], context);
};

const samoAlbumToSearchItem = (
    authentication: ServerAuthenticationResult,
    album: SamoMusicAlbum,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileSearchItem | null => {
    if (!album.id || !album.title) return null;
    return {
        artworkImageId: pickSamoImageId(album.images),
        artworkUrl: resolveSamoAlbumArtworkUrl(authentication, album, streamToken),
        id: album.id,
        qualityProfile: samoAlbumQualityProfile(album),
        isHiRes: album.hiRes || undefined,
        source,
        subtitle: album.displayArtist ?? album.albumArtistNames?.filter(Boolean).join(', '),
        title: album.title,
        type: MobileSearchItemType.ALBUM,
    };
};

const samoArtistToSearchItem = (
    authentication: ServerAuthenticationResult,
    artist: SamoMusicArtist,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileSearchItem | null => {
    if (!artist.id || !artist.name) return null;
    return {
        artworkImageId: pickSamoImageId(artist.images),
        artworkUrl: resolveSamoArtistArtworkUrl(authentication, artist, streamToken),
        id: artist.id,
        source,
        subtitle: artist.albumCount ? `${artist.albumCount} albums` : undefined,
        title: artist.name,
        type: MobileSearchItemType.ARTIST,
    };
};

const samoTrackToSearchItem = (
    authentication: ServerAuthenticationResult,
    track: SamoMusicTrack,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileSearchItem | null => {
    if (!track.id || !track.title) return null;
    const playback = buildSamoMusicPlayback(authentication, track, undefined, streamToken);
    const artist =
        track.displayArtist ?? track.artistNames?.filter(Boolean).join(', ');
    return {
        album: track.albumTitle,
        albumId: track.albumId,
        artist,
        artworkImageId: pickSamoImageId(track.images),
        artworkUrl: resolveSamoAlbumArtworkUrl(
            authentication,
            { images: track.images },
            streamToken,
        ),
        id: track.id,
        lastPlayedAt: track.playback?.lastPlayedAt ? Date.parse(track.playback.lastPlayedAt) : undefined,
        playback: playback ?? undefined,
        playCount: track.playback?.playCount,
        source,
        subtitle: [track.displayArtist, track.albumTitle].filter(Boolean).join(' - ')
            || undefined,
        title: track.title,
        type: MobileSearchItemType.SONG,
    };
};

const samoAudiobookToSearchItem = (
    authentication: ServerAuthenticationResult,
    audiobook: SamoAudiobook,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileSearchItem | null => {
    if (!audiobook.id) return null;
    const title = audiobook.book?.title;
    if (!title) return null;
    const authors = audiobook.book?.authors?.map((author) => author.name).filter(Boolean).join(', ');

    return {
        artworkUrl: resolveSamoAudiobookArtworkUrl(authentication, audiobook, streamToken),
        id: audiobook.id,
        source,
        subtitle: authors,
        title,
        type: MobileSearchItemType.AUDIOBOOK,
    };
};

const samoPodcastToSearchItem = (
    authentication: ServerAuthenticationResult,
    podcast: SamoPodcast,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileSearchItem | null => {
    if (!podcast.id) return null;
    const inner = podcast.podcast;
    const title = inner?.title;
    if (!title) return null;
    return {
        artworkUrl: resolveSamoPodcastArtworkUrl(authentication, podcast, streamToken),
        id: podcast.id,
        source,
        subtitle: inner?.episodeCount ? `${inner.episodeCount} episodes` : inner?.author,
        title,
        type: MobileSearchItemType.PODCAST,
    };
};

const loadSamoSearch = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    query: string,
    limit: number,
): Promise<MobileSearchResults> => {
    const source = getMobileContentSource(authentication);
    const streamToken = await ensureSamoStreamToken(authentication, fetcher).catch(() => undefined);

    const [musicResult, audiobookResult, podcastResult] = await Promise.allSettled([
        searchSamoMusic(fetcher, authentication, query, { limit }),
        searchSamoAudiobooks(fetcher, authentication, query, { limit }),
        searchSamoPodcasts(fetcher, authentication, query, { limit }),
    ]);

    const errors: MobileSearchSectionError[] = [];
    if (musicResult.status === 'rejected') {
        errors.push({
            message: getErrorMessage(musicResult.reason),
            sectionId: MobileSearchSectionId.SONGS,
        });
    }
    if (audiobookResult.status === 'rejected') {
        errors.push({
            message: getErrorMessage(audiobookResult.reason),
            sectionId: MobileSearchSectionId.AUDIOBOOKS,
        });
    }
    if (podcastResult.status === 'rejected') {
        errors.push({
            message: getErrorMessage(podcastResult.reason),
            sectionId: MobileSearchSectionId.PODCASTS,
        });
    }

    const songs =
        musicResult.status === 'fulfilled'
            ? (musicResult.value.tracks ?? []).flatMap((track) => {
                  const item = samoTrackToSearchItem(authentication, track, streamToken, source);
                  return item ? [item] : [];
              })
            : [];
    const albums = propagateSearchAlbumQualityFromSongs(
        musicResult.status === 'fulfilled'
            ? (musicResult.value.albums ?? []).flatMap((album) => {
                  const item = samoAlbumToSearchItem(authentication, album, streamToken, source);
                  return item ? [item] : [];
              })
            : [],
        songs,
    );
    const artists =
        musicResult.status === 'fulfilled'
            ? (musicResult.value.artists ?? []).flatMap((artist) => {
                  const item = samoArtistToSearchItem(authentication, artist, streamToken, source);
                  return item ? [item] : [];
              })
            : [];
    const audiobooks =
        audiobookResult.status === 'fulfilled'
            ? samoItemsOf(audiobookResult.value).flatMap((audiobook) => {
                  const item = samoAudiobookToSearchItem(authentication, audiobook, streamToken, source);
                  return item ? [item] : [];
              })
            : [];
    const podcasts =
        podcastResult.status === 'fulfilled'
            ? samoItemsOf(podcastResult.value).flatMap((podcast) => {
                  const item = samoPodcastToSearchItem(authentication, podcast, streamToken, source);
                  return item ? [item] : [];
              })
            : [];

    return toSearchResults(
        query,
        [
            { id: MobileSearchSectionId.SONGS, items: songs, title: 'Songs' },
            { id: MobileSearchSectionId.ALBUMS, items: albums, title: 'Albums' },
            { id: MobileSearchSectionId.ARTISTS, items: artists, title: 'Artists' },
            { id: MobileSearchSectionId.AUDIOBOOKS, items: audiobooks, title: 'Audiobooks' },
            { id: MobileSearchSectionId.PODCASTS, items: podcasts, title: 'Podcasts' },
        ],
        errors,
    );
};

export const searchMobileContent = async ({
    authentication,
    fetch: fetcher,
    limit = DEFAULT_SEARCH_LIMIT,
    query,
    signal,
}: MobileSearchInput): Promise<MobileSearchResults> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return toSearchResults('', []);
    }

    if (signal?.aborted) {
        return toSearchResults(trimmedQuery, []);
    }

    const request = getFetch(fetcher);

    if (authentication.type === ServerType.SAMO) {
        return loadSamoSearch(authentication, request, trimmedQuery, limit);
    }

    throw new Error('Search is not wired for this server type');
};



export const searchMobileContentAcrossServers = async ({
    authentication,
    fetch: fetcher,
    limit = DEFAULT_SEARCH_LIMIT,
    query,
    userRecents,
}: MobileSearchAcrossServersInput): Promise<MobileSearchResults> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || !authentication) {
        return toSearchResults(trimmedQuery, []);
    }

    const request = getFetch(fetcher);
    try {
        const searchResult = await searchMobileContent({
            authentication,
            fetch: request,
            limit,
            query: trimmedQuery,
        });

        return toSearchResults(
            trimmedQuery,
            searchResult.sections,
            searchResult.errors,
            { userRecents },
        );
    } catch (error) {
        throw new Error(`${authentication.title}: ${getErrorMessage(error)}`);
    }
};
