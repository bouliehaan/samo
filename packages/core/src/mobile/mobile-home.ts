import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, type SamoFetch } from '../server/server-http';
import {
    type SamoAudiobook,
    type SamoInternetRadioStation,
    type SamoMusicAlbum,
    type SamoMusicArtist,
    type SamoMusicPlaylist,
    type SamoMusicTrack,
    type SamoPaginatedResponse,
    type SamoPodcast,
    type SamoPodcastEpisode,
    type SamoProgrammedRadioStation,
    findSamoExploPlaylist,
    getSamoMusicBrowse,
    listSamoCatalogRecentlyAdded,
    type SamoRecentlyAddedEntry,
    listSamoAudiobooks,
    listSamoInternetRadioStations,
    listSamoMusicAlbums,
    listSamoMusicArtists,
    listSamoMusicPlaylists,
    listSamoAllPodcastEpisodes,
    listSamoPodcasts,
    listSamoProgrammedRadioStations,
    pickSamoImageId,
    pickSamoCatalogImageId,
    resolveSamoAlbumArtworkUrl,
    resolveSamoArtistArtworkUrl,
    resolveSamoAudiobookArtworkUrl,
    resolveSamoPlaylistArtworkUrl,
    resolveSamoPodcastArtworkUrl,
    resolveSamoPodcastEpisodeArtworkUrl,
    resolveSamoStationArtworkUrl,
    samoItemsOf,
    samoPlaylistHasCoverGrid,
} from '../server/server-samo';
import { ensureSamoStreamToken, getCachedSamoStreamToken } from '../server/server-samo-stream-token';
import { ServerType } from '../server/server-types';
import {
    getMobileContentSource,
    type MobileContentSource,
} from './mobile-content-source';
import {
    buildSamoInternetRadioPlayback,
    buildSamoPodcastEpisodePlayback,
    type MobilePlayableAudio,
} from './mobile-playback';
import {
    formatRadioNowPlayingLine,
    formatRadioStreamFormat,
    formatRadioTagsLine,
} from './mobile-radio-metadata';

/** Cached formatter – avoids re-creating Intl.DateTimeFormat per episode. */
const episodeDateFormat = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

export enum MobileHomeItemType {
    ALBUM = 'album',
    ARTIST = 'artist',
    AUDIOBOOK = 'audiobook',
    PLAYLIST = 'playlist',
    PODCAST = 'podcast',
    PODCAST_EPISODE = 'podcast-episode',
    RADIO = 'radio',
}

export enum MobileHomeSectionId {
    AUDIOBOOKS = 'audiobooks',
    DISCOVER = 'discover',
    /** Everything on this device. Client-built, never returned by a server —
     *  it exists so an offline Home can lead with what is actually playable. */
    DOWNLOADED = 'downloaded',
    EXPLO = 'explo',
    FAVORITE_ALBUMS = 'favorite-albums',
    FAVORITE_ARTISTS = 'favorite-artists',
    PLAYLISTS = 'playlists',
    PODCAST_FEED = 'podcast-feed',
    PODCASTS = 'podcasts',
    RADIO = 'radio',
    RECENTLY_ADDED = 'recently-added',
}

export interface MobileHomeContent {
    errors: MobileHomeSectionError[];
    loadedAt: number;
    sections: MobileHomeSection[];
    serverTitle: string;
}

export interface MobileHomeContentForServersInput {
    authentication: ServerAuthenticationResult | null;
    fetch?: SamoFetch;
    limit?: number;
    signal?: AbortSignal;
}

export interface MobileHomeContentInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    limit?: number;
    signal?: AbortSignal;
}

export interface MobileHomeItem {
    /** Show notes, when the item is a podcast episode. Carried on the item so
     *  Episode Information works from the feed, not just from a show's page. */
    description?: string;
    /** Episode publish time (ms), for the same reason as `description`. */
    publishedAt?: number;
    /**
     * Server-reported "added at" timestamp in epoch milliseconds. Used to
     * sort the cross-source "Recently Added" hero row chronologically rather
     * than round-robining categories — so a newly-added audiobook can land
     * above a music album added two weeks ago. Undefined when the source
     * didn't report a timestamp (eg favorites/starred lists, which we never
     * surface in the Recently Added row anyway).
     */
    addedAt?: number;
    /** Epoch ms from server playback overlay (Samo). */
    lastPlayedAt?: number;
    playCount?: number;
    artworkUrl?: string;
    /**
     * Samo-only — `images[].id` from catalog metadata (`cover_*` / `image_*`).
     * Lets tiles rebuild the image URL at display time without persisting
     * expiring stream tokens in list payloads.
     */
    artworkImageId?: string;
    /**
     * Lightweight summary text for audiobook authors / podcast hosts. Samo's
     * audiobook items carry rich contributor records; we surface the joined
     * display string here so tiles can render "Author — Narrator" without
     * needing a detail fetch. Undefined for non-spoken-word items.
     */
    contributorsSummary?: string;
    /**
     * Lifecycle bucket for spoken-word items (audiobooks, podcast episodes).
     * Derived from samo's playback state (progressSeconds vs duration plus
     * the explicit `completed` flag). Music tracks don't carry this — they
     * have play counts instead. Used to drive the "Continue listening" row.
     */
    completionState?: 'completed' | 'in-progress' | 'unplayed';
    /**
     * Total duration in seconds for items whose primary identity is "a thing
     * that plays" — audiobooks, podcast episodes, tracks. Lets the Continue
     * row compute a progress bar without re-fetching detail.
     */
    durationSeconds?: number;
  /**
   * Parent container id for leaf items (e.g. podcast show id on episode tiles).
   */
    containerId?: string;
    /**
     * Similar-artist tile for an artist NOT in this library: there's no detail
     * to open, so the client routes a tap to a search for `title` instead. The
     * `id` is synthetic (`ext:<name>`) and must never be used for a detail fetch.
     */
    external?: boolean;
    /**
     * Set by the explo folder integration - the album is fully sourced from
     * an unmanaged auto-tagged drop folder. Consumers that build a "Recently
     * Added" style shelf from raw mirror/list data (rather than one of the
     * server's own filtered /recently-added endpoints) must filter this out
     * themselves - the server can't do it for them there.
     */
    hiddenFromRecentlyAdded?: boolean;
    id: string;
    isHiRes?: boolean;
    /**
     * Internet radio: current StreamTitle reported by the ICY metadata probe.
     * Programmed radio: the currently-airing program slot. Stays undefined
     * for music/audiobook/podcast items.
     */
    nowPlayingText?: string;
    playback?: MobilePlayableAudio;
    /**
     * Resume position in seconds for spoken-word items. Used to draw the
     * progress bar on Continue tiles and as the default `offsetSeconds` when
     * starting playback.
     */
    progressSeconds?: number;
    /**
     * The album / track's representative format — bit depth and sample rate
     * of the highest-quality song in the collection (or the song itself).
     * Populated from the album's representative track quality; remains
     * undefined for playlists (always mixed format), artists, audiobooks,
     * podcasts. The UI uses this to pick the matching format-specific
     * badge asset; absent profile = no badge.
     */
    qualityProfile?: MobileQualityProfile;
    /**
     * Audiobook series sequence (e.g. "Book 3 of Lyrik Saga"). Optional —
     * undefined when the audiobook isn't part of a series.
     */
    seriesSummary?: string;
    source?: MobileContentSource;
    subtitle?: string;
    title: string;
    type: MobileHomeItemType;
}

/**
 * @deprecated Use `QualityBadgeProfile` from `@samo/core/audio-quality`.
 * Kept as a type alias so existing Android imports keep working unchanged.
 */
export type MobileQualityProfile =
    import('../audio-quality/quality-badge-key').QualityBadgeProfile;

export interface MobileHomeSection {
    id: MobileHomeSectionId;
    items: MobileHomeItem[];
    title: string;
}

export interface MobileHomeSectionError {
    message: string;
    sectionId: MobileHomeSectionId;
}

const DEFAULT_HOME_LIMIT = 12;

const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Request failed';
};

export const getMobileHomeContentErrorMessage = getErrorMessage;

const hasItems = (section: MobileHomeSection) => section.items.length > 0;

const formatSamoArtists = (
    artists: Array<{ name?: string }> | undefined,
): string | undefined => {
    if (!artists || artists.length === 0) return undefined;
    const names = artists.flatMap((artist) => (artist.name ? [artist.name] : []));
    return names.length > 0 ? names.join(', ') : undefined;
};

const formatSamoContributors = (
    contributors: Array<{ name?: string; role?: string }> | undefined,
): string | undefined => {
    if (!contributors || contributors.length === 0) return undefined;
    const authors = contributors
        .filter((person) => !person.role || person.role.toLowerCase() === 'author')
        .map((person) => person.name)
        .filter(Boolean) as string[];
    if (authors.length > 0) return authors.join(', ');
    const names = contributors.map((person) => person.name).filter(Boolean) as string[];
    return names.length > 0 ? names.join(', ') : undefined;
};

const toEpochMs = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const samoCompletionState = (
    playback: { completed?: boolean; progressSeconds?: number } | undefined,
): MobileHomeItem['completionState'] => {
    if (!playback) return undefined;
    if (playback.completed) return 'completed';
    if ((playback.progressSeconds ?? 0) > 0) return 'in-progress';
    return 'unplayed';
};

const samoQualityProfile = (
    audioFile: { bitDepth?: number; sampleRate?: number } | undefined,
): MobileQualityProfile | undefined => {
    if (!audioFile) return undefined;
    const { bitDepth, sampleRate } = audioFile;
    if (typeof bitDepth !== 'number' || typeof sampleRate !== 'number') return undefined;
    if (bitDepth <= 0 || sampleRate <= 0) return undefined;
    return { bitDepth, sampleRate };
};

/**
 * Album quality for list/search/home tiles. Uses server-aggregated
 * maxBitDepth/maxSampleRate when present, then primaryAudioFile or embedded
 * tracks on detail payloads.
 */
export const samoAlbumQualityProfile = (
    album: Pick<
        SamoMusicAlbum,
        'maxBitDepth' | 'maxSampleRate' | 'primaryAudioFile' | 'tracks'
    >,
): MobileQualityProfile | undefined => {
    const fromAggregate = samoQualityProfile(
        album.maxBitDepth && album.maxSampleRate
            ? { bitDepth: album.maxBitDepth, sampleRate: album.maxSampleRate }
            : undefined,
    );
    if (fromAggregate) return fromAggregate;

    const fromPrimary = samoQualityProfile(album.primaryAudioFile);
    if (fromPrimary) return fromPrimary;

    let best: MobileQualityProfile | undefined;
    for (const track of album.tracks ?? []) {
        const file = track.primaryAudioFile ?? track.audioFiles?.[0];
        const profile = samoQualityProfile(file);
        if (
            profile
            && (
                !best
                || profile.bitDepth > best.bitDepth
                || (profile.bitDepth === best.bitDepth && profile.sampleRate > best.sampleRate)
            )
        ) {
            best = profile;
        }
    }
    return best;
};

const samoArtistRefsFromParallelArrays = (
    ids: string[] | undefined,
    names: string[] | undefined,
): Array<{ id?: string; name?: string }> | undefined => {
    if (!ids && !names) return undefined;
    const length = Math.max(ids?.length ?? 0, names?.length ?? 0);
    if (length === 0) return undefined;
    const refs: Array<{ id?: string; name?: string }> = [];
    for (let i = 0; i < length; i += 1) {
        refs.push({ id: ids?.[i], name: names?.[i] });
    }
    return refs;
};

const resolveSamoStreamToken = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<string | undefined> => {
    const cached = getCachedSamoStreamToken(authentication);
    if (cached) {
        return cached;
    }

    return ensureSamoStreamToken(authentication, fetcher).catch(() => undefined);
};

const samoAlbumToHomeItem = (
    authentication: ServerAuthenticationResult,
    album: SamoMusicAlbum,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!album.id || !album.title) return null;
    const subtitle =
        album.displayArtist
        ?? formatSamoArtists(samoArtistRefsFromParallelArrays(album.albumArtistIds, album.albumArtistNames))
        ?? (album.releaseYear ? String(album.releaseYear) : undefined);

    return {
        addedAt: toEpochMs(album.addedAt),
        artworkImageId: pickSamoImageId(album.images),
        artworkUrl: resolveSamoAlbumArtworkUrl(authentication, album, streamToken),
        hiddenFromRecentlyAdded: album.hiddenFromRecentlyAdded || undefined,
        id: album.id,
        lastPlayedAt: toEpochMs(album.playback?.lastPlayedAt),
        playCount: album.playback?.playCount,
        qualityProfile: samoAlbumQualityProfile(album),
        source,
        subtitle,
        title: album.title,
        type: MobileHomeItemType.ALBUM,
    };
};

const samoArtistToHomeItem = (
    authentication: ServerAuthenticationResult,
    artist: SamoMusicArtist,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!artist.id || !artist.name) return null;

    return {
        addedAt: toEpochMs(artist.addedAt),
        artworkImageId: pickSamoImageId(artist.images),
        artworkUrl: resolveSamoArtistArtworkUrl(authentication, artist, streamToken),
        id: artist.id,
        lastPlayedAt: toEpochMs(artist.playback?.lastPlayedAt),
        playCount: artist.playback?.playCount,
        source,
        subtitle: artist.albumCount ? `${artist.albumCount} albums` : undefined,
        title: artist.name,
        type: MobileHomeItemType.ARTIST,
    };
};

const samoPlaylistToHomeItem = (
    authentication: ServerAuthenticationResult,
    playlist: SamoMusicPlaylist,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!playlist.id || !playlist.name) return null;

    return {
        // A grid playlist (>1 cover) renders the server-composited 2x2 at
        // artworkUrl; emitting a single first-cover imageId here would make the
        // display resolver prefer that one cover and lose the grid.
        artworkImageId: samoPlaylistHasCoverGrid(playlist)
            ? undefined
            : pickSamoImageId(playlist.images),
        artworkUrl: resolveSamoPlaylistArtworkUrl(authentication, playlist, streamToken),
        id: playlist.id,
        lastPlayedAt: toEpochMs(playlist.playback?.lastPlayedAt),
        playCount: playlist.playback?.playCount,
        source,
        subtitle: playlist.trackCount
            ? `${playlist.trackCount} tracks`
            : playlist.ownerName ?? undefined,
        title: playlist.name,
        type: MobileHomeItemType.PLAYLIST,
    };
};

const samoTrackToHomeItem = (
    authentication: ServerAuthenticationResult,
    track: SamoMusicTrack,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!track.id || !track.title || !track.albumId) return null;

    const subtitle =
        formatSamoArtists(
            samoArtistRefsFromParallelArrays(track.albumArtistIds, track.albumArtistNames),
        ) ?? (track.releaseYear ? String(track.releaseYear) : undefined);

    return {
        addedAt: toEpochMs(track.addedAt),
        artworkImageId: pickSamoImageId(track.images),
        artworkUrl: resolveSamoTrackArtworkUrl(authentication, track, streamToken),
        durationSeconds: track.durationSeconds,
        id: track.albumId,
        playCount: track.playback?.playCount,
        qualityProfile: samoQualityProfile(track.primaryAudioFile ?? track.audioFiles?.[0]),
        source,
        subtitle,
        title: track.albumTitle ?? track.title,
        type: MobileHomeItemType.ALBUM, // tracks tile as album-style in the recently-added row
    };
};

/**
 * Track artwork comes straight from the track's metadata `images[]`.
 */
const resolveSamoTrackArtworkUrl = (
    authentication: ServerAuthenticationResult,
    track: Pick<SamoMusicTrack, 'images'>,
    streamToken: string | undefined,
): string | undefined => {
    return resolveSamoAlbumArtworkUrl(authentication, { images: track.images }, streamToken);
};

const samoAudiobookToHomeItem = (
    authentication: ServerAuthenticationResult,
    audiobook: SamoAudiobook,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!audiobook.id) return null;
    const title = audiobook.book?.title;
    if (!title) return null;

    const authors = formatSamoContributors(audiobook.book?.authors)
        ?? formatSamoContributors(audiobook.contributors);
    const series = audiobook.series && audiobook.series.length > 0
        ? audiobook.series
              .map((entry) =>
                  audiobook.book?.seriesSequence
                      ? `${entry.name} #${audiobook.book.seriesSequence}`
                      : entry.name,
              )
              .filter(Boolean)
              .join(', ')
        : undefined;

    return {
        addedAt: toEpochMs(audiobook.addedAt),
        artworkUrl: resolveSamoAudiobookArtworkUrl(authentication, audiobook, streamToken),
        completionState: samoCompletionState(audiobook.progress),
        contributorsSummary: authors,
        durationSeconds: audiobook.durationSeconds,
        id: audiobook.id,
        progressSeconds: audiobook.progress?.progressSeconds,
        seriesSummary: series,
        source,
        subtitle: authors ?? series,
        title,
        type: MobileHomeItemType.AUDIOBOOK,
    };
};

const SAMO_PODCAST_FEED_DISPLAY_LIMIT = 24;
const SAMO_PODCAST_FEED_POOL_LIMIT = 300;
const SAMO_PODCAST_FEED_RECENT_RELEASE_MS = 90 * 24 * 60 * 60 * 1000;
const SAMO_PODCAST_FEED_RELAXED_RELEASE_MS = 365 * 24 * 60 * 60 * 1000;
const SAMO_PODCAST_FEED_IMPORT_BURST_MS = 21 * 24 * 60 * 60 * 1000;
const SAMO_PODCAST_FEED_MIN_PUBLISH_BEFORE_ADD_MS = 14 * 24 * 60 * 60 * 1000;
const SAMO_PODCAST_FEED_MAX_PER_SHOW = 2;
const SAMO_PODCAST_FEED_MIN_ITEMS = 6;

const episodePublishedMs = (episode: SamoPodcastEpisode): number | undefined => {
    const publishedMs = toEpochMs(episode.publishedAt);
    return publishedMs !== undefined && publishedMs > 0 ? publishedMs : undefined;
};

const episodeAddedMs = (episode: SamoPodcastEpisode): number | undefined => {
    const addedMs = toEpochMs(episode.addedAt);
    return addedMs !== undefined && addedMs > 0 ? addedMs : undefined;
};

/** Bulk library imports: recently added but published long ago. */
export const isSamoPodcastEpisodeCatalogBackfill = (
    episode: SamoPodcastEpisode,
    nowMs = Date.now(),
): boolean => {
    const publishedMs = episodePublishedMs(episode);
    if (!publishedMs) {
        return true;
    }

    const addedMs = episodeAddedMs(episode);
    if (
        addedMs &&
        nowMs - addedMs < SAMO_PODCAST_FEED_IMPORT_BURST_MS &&
        publishedMs < addedMs - SAMO_PODCAST_FEED_MIN_PUBLISH_BEFORE_ADD_MS
    ) {
        return true;
    }

    return false;
};

const isSamoPodcastEpisodeWithinReleaseWindow = (
    episode: SamoPodcastEpisode,
    maxAgeMs: number,
    nowMs: number,
) => {
    const publishedMs = episodePublishedMs(episode);
    if (!publishedMs) {
        return false;
    }
    return nowMs - publishedMs <= maxAgeMs;
};

const capPodcastEpisodesPerShow = (
    episodes: SamoPodcastEpisode[],
    limit: number,
    maxPerShow: number,
): SamoPodcastEpisode[] => {
    const showCounts = new Map<string, number>();
    const picked: SamoPodcastEpisode[] = [];

    for (const episode of episodes) {
        const showId = episode.podcastId;
        if (!showId) {
            continue;
        }
        const count = showCounts.get(showId) ?? 0;
        if (count >= maxPerShow) {
            continue;
        }
        showCounts.set(showId, count + 1);
        picked.push(episode);
        if (picked.length >= limit) {
            break;
        }
    }

    return picked;
};

/**
 * Curate a cross-show release feed: recent publish dates, not bulk-import
 * backfill, and at most a couple of episodes per show so one library dump
 * cannot dominate the row.
 */
export const buildMobilePodcastFeedEpisodes = (
    episodes: SamoPodcastEpisode[],
    limit = SAMO_PODCAST_FEED_DISPLAY_LIMIT,
    nowMs = Date.now(),
): SamoPodcastEpisode[] => {
    const sorted = [...episodes].sort(
        (left, right) => (episodePublishedMs(right) ?? 0) - (episodePublishedMs(left) ?? 0),
    );

    const build = (maxReleaseAgeMs: number, filterBackfill: boolean) => {
        const candidates = sorted.filter((episode) => {
            if (filterBackfill && isSamoPodcastEpisodeCatalogBackfill(episode, nowMs)) {
                return false;
            }
            return isSamoPodcastEpisodeWithinReleaseWindow(episode, maxReleaseAgeMs, nowMs);
        });
        return capPodcastEpisodesPerShow(candidates, limit, SAMO_PODCAST_FEED_MAX_PER_SHOW);
    };

    let picked = build(SAMO_PODCAST_FEED_RECENT_RELEASE_MS, true);
    if (picked.length < SAMO_PODCAST_FEED_MIN_ITEMS) {
        picked = build(SAMO_PODCAST_FEED_RELAXED_RELEASE_MS, true);
    }
    if (picked.length < SAMO_PODCAST_FEED_MIN_ITEMS) {
        picked = capPodcastEpisodesPerShow(
            sorted.filter((episode) => !isSamoPodcastEpisodeCatalogBackfill(episode, nowMs)),
            limit,
            SAMO_PODCAST_FEED_MAX_PER_SHOW,
        );
    }

    return picked;
};

const samoPodcastEpisodeToHomeItem = (
    authentication: ServerAuthenticationResult,
    episode: SamoPodcastEpisode,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!episode.id || !episode.podcastId) {
        return null;
    }

    const title = episode.title ?? episode.name;
    if (!title) {
        return null;
    }

    const publishedMs = toEpochMs(episode.publishedAt);
    const artworkUrl = resolveSamoPodcastEpisodeArtworkUrl(
        authentication,
        episode,
        streamToken,
    );
    const showTitle = episode.podcastTitle?.trim();
    const playback = buildSamoPodcastEpisodePlayback(
        authentication,
        episode,
        episode.podcastId,
        artworkUrl,
        streamToken,
    );
    const releaseLabel = publishedMs
        ? episodeDateFormat.format(publishedMs)
        : undefined;
    const subtitle = [showTitle, releaseLabel].filter(Boolean).join(' · ');

    const episodeProgress = episode.progress ?? episode.playback;

    return {
        addedAt: publishedMs,
        artworkImageId: pickSamoImageId(episode.images),
        artworkUrl,
        completionState: samoCompletionState(episodeProgress),
        containerId: episode.podcastId,
        description: episode.description ?? undefined,
        durationSeconds: episode.durationSeconds ?? episode.duration,
        id: episode.id,
        playback: playback ?? undefined,
        progressSeconds: episodeProgress?.progressSeconds,
        publishedAt: publishedMs,
        source,
        subtitle: subtitle || showTitle,
        title,
        type: MobileHomeItemType.PODCAST_EPISODE,
    };
};

const loadSamoPodcastFeedHomeItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    streamToken: string | undefined,
    source: MobileContentSource,
): Promise<MobileHomeItem[]> => {
    const [body, podcastsBody] = await Promise.all([
        listSamoAllPodcastEpisodes(fetcher, authentication, {
            limit: SAMO_PODCAST_FEED_POOL_LIMIT,
        }),
        listSamoPodcasts(fetcher, authentication, { limit: 500 }).catch(() => undefined),
    ]);
    const showTitlesById = new Map<string, string>();
    if (podcastsBody) {
        for (const podcast of samoItemsOf(podcastsBody)) {
            const name = podcast.podcast?.title?.trim();
            if (podcast.id && name) {
                showTitlesById.set(podcast.id, name);
            }
        }
    }
    const episodes = buildMobilePodcastFeedEpisodes(samoItemsOf(body)).map((episode) => {
        const podcastTitle =
            episode.podcastTitle?.trim() ||
            (episode.podcastId ? showTitlesById.get(episode.podcastId) : undefined);
        return podcastTitle ? { ...episode, podcastTitle } : episode;
    });

    return episodes.flatMap((episode) => {
        const item = samoPodcastEpisodeToHomeItem(authentication, episode, streamToken, source);
        return item ? [item] : [];
    });
};

const samoPodcastToHomeItem = (
    authentication: ServerAuthenticationResult,
    podcast: SamoPodcast,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!podcast.id) return null;
    const inner = podcast.podcast || (podcast as any).metadata;
    const title = inner?.title || (podcast as any).title;
    if (!title) return null;

    return {
        addedAt: toEpochMs(podcast.addedAt),
        artworkUrl: resolveSamoPodcastArtworkUrl(authentication, podcast, streamToken),
        contributorsSummary: inner?.author || (podcast as any).author,
        id: podcast.id,
        source,
        subtitle: inner?.episodeCount ? `${inner.episodeCount} episodes` : (inner?.author || (podcast as any).author),
        title,
        type: MobileHomeItemType.PODCAST,
    };
};

const samoInternetRadioToHomeItem = (
    authentication: ServerAuthenticationResult,
    station: SamoInternetRadioStation,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    const streamUrl = station.publicStreamUrl ?? station.streamUrl;

    if (!station.id || !station.name || !streamUrl) return null;
    const artworkUrl = resolveSamoStationArtworkUrl(authentication, station, streamToken);
    const playback = buildSamoInternetRadioPlayback(authentication, station, artworkUrl);
    const nowPlayingText = formatRadioNowPlayingLine(station.nowPlaying);
    const formatLine = formatRadioStreamFormat(station);
    const tagsLine = formatRadioTagsLine(station.tags);
    const tileSubtitle =
        nowPlayingText ??
        formatLine ??
        tagsLine ??
        (station.description?.trim() ? station.description.trim() : undefined) ??
        'Internet radio';

    return {
        artworkImageId: pickSamoCatalogImageId(station.coverId),
        artworkUrl,
        id: station.id,
        nowPlayingText,
        playback: playback ?? undefined,
        source,
        subtitle: tileSubtitle,
        title: station.name,
        type: MobileHomeItemType.RADIO,
    };
};

const samoProgrammedRadioToHomeItem = (
    authentication: ServerAuthenticationResult,
    station: SamoProgrammedRadioStation,
    streamToken: string | undefined,
    source: MobileContentSource,
): MobileHomeItem | null => {
    if (!station.id || !station.name || !station.streamUrl) return null;
    const artworkUrl = resolveSamoAlbumArtworkUrl(
        authentication,
        { images: station.images },
        streamToken,
    );
    const artworkImageId = pickSamoImageId(station.images);
    const nowPlayingText = formatRadioNowPlayingLine(station.nowPlaying);
    const tileSubtitle =
        nowPlayingText ?? station.description?.trim() ?? 'Programmed radio';
    return {
        artworkImageId,
        artworkUrl,
        id: station.id,
        nowPlayingText,
        playback: {
            artworkImageId,
            artworkUrl,
            contentSourceId: getMobileContentSource(authentication).id,
            id: `samo:radio-programmed:${station.id}`,
            isLive: true,
            quality: {
                container: null,
                deliveryKind: 'android-direct',
                losslessRequired: false,
                serverTranscodeRequested: false,
            },
            source: 'radio',
            title: station.name,
            url: station.streamUrl,
        },
        source,
        subtitle: tileSubtitle,
        title: station.name,
        type: MobileHomeItemType.RADIO,
    };
};

const settledOrEmpty = <T>(result: PromiseSettledResult<T[]>): T[] =>
    result.status === 'fulfilled' ? result.value : [];

const sortHomeItemsByAddedAt = (items: MobileHomeItem[]): MobileHomeItem[] => {
    return [...items].sort((left, right) => {
        const leftAdded = left.addedAt ?? -Infinity;
        const rightAdded = right.addedAt ?? -Infinity;
        if (leftAdded !== rightAdded) {
            return rightAdded - leftAdded;
        }
        return left.title.localeCompare(right.title);
    });
};

export const sortMobileHomeItemsByPlayCount = (items: MobileHomeItem[]): MobileHomeItem[] =>
    items
        .map((item, index) => ({ index, item }))
        .sort((left, right) => {
            const leftCount = left.item.playCount ?? 0;
            const rightCount = right.item.playCount ?? 0;
            if (rightCount !== leftCount) {
                return rightCount - leftCount;
            }
            const leftPlayed = left.item.lastPlayedAt ?? 0;
            const rightPlayed = right.item.lastPlayedAt ?? 0;
            if (rightPlayed !== leftPlayed) {
                return rightPlayed - leftPlayed;
            }
            const leftAdded = left.item.addedAt ?? 0;
            const rightAdded = right.item.addedAt ?? 0;
            if (rightAdded !== leftAdded) {
                return rightAdded - leftAdded;
            }
            return left.index - right.index;
        })
        .map(({ item }) => item);

const sortHomeItemsByLastPlayed = (items: MobileHomeItem[]): MobileHomeItem[] =>
    [...items].sort((left, right) => {
        const leftPlayed = left.lastPlayedAt ?? 0;
        const rightPlayed = right.lastPlayedAt ?? 0;
        if (rightPlayed !== leftPlayed) {
            return rightPlayed - leftPlayed;
        }
        return left.title.localeCompare(right.title);
    });

const SAMO_DISCOVERY_POOL_LIMIT = 120;
const SAMO_DISCOVERY_DISPLAY_LIMIT = 18;

const shuffleMobileHomeItems = <T>(items: T[]): T[] => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
};

const isUnplayedDiscoveryItem = (item: MobileHomeItem) => (item.playCount ?? 0) === 0;

const sampleDiscoverySpread = (pool: MobileHomeItem[], want: number): MobileHomeItem[] => {
    if (want <= 0 || pool.length === 0) {
        return [];
    }
    if (pool.length <= want) {
        return [...pool];
    }

    const out: MobileHomeItem[] = [];
    for (let index = 0; index < want; index += 1) {
        const at = want > 1 ? Math.round((index * (pool.length - 1)) / (want - 1)) : 0;
        out.push(pool[at]!);
    }
    return out;
};

export const buildMobileDiscoveryQueue = (
    items: MobileHomeItem[],
    limit: number,
): MobileHomeItem[] => {
    const unplayed = items.filter(isUnplayedDiscoveryItem);
    if (unplayed.length === 0) {
        return [];
    }

    const sorted = [...unplayed].sort(
        (left, right) => (right.addedAt ?? 0) - (left.addedAt ?? 0),
    );

    const recentWant = Math.min(limit, Math.ceil(limit * 0.7));
    const olderWant = Math.max(0, limit - recentWant);
    const split = Math.max(1, Math.floor(sorted.length * 0.7));
    const recentPool = sorted.slice(0, split);
    const olderPool = sorted.slice(split);

    const seen = new Set<string>();
    const picked = [
        ...sampleDiscoverySpread(recentPool, recentWant),
        ...sampleDiscoverySpread(olderPool, olderWant),
    ].filter((item) => {
        const key = `${item.source?.id ?? ''}:${item.type}:${item.id}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });

    return shuffleMobileHomeItems(picked).slice(0, limit);
};

const loadSamoDiscoveryHomeItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    streamToken: string | undefined,
    source: MobileContentSource,
): Promise<MobileHomeItem[]> => {
    const body = await getSamoMusicBrowse(fetcher, authentication, 'discovery', {
        limit: SAMO_DISCOVERY_POOL_LIMIT,
    });
    const pool = samoItemsOf(body.tracks as SamoPaginatedResponse<SamoMusicTrack>).flatMap(
        (track) => {
            const item = samoTrackToHomeItem(authentication, track, streamToken, source);
            return item ? [item] : [];
        },
    );
    return buildMobileDiscoveryQueue(pool, SAMO_DISCOVERY_DISPLAY_LIMIT);
};

export const loadMobilePodcastFeedForServers = async ({
    authentication,
    fetch: fetcher,
}: {
    authentication: ServerAuthenticationResult | null;
    fetch?: SamoFetch;
}): Promise<MobileHomeItem[]> => {
    const request = getFetch(fetcher);
    const items: MobileHomeItem[] = [];

    if (authentication && authentication.type === ServerType.SAMO) {
        try {
            const source = getMobileContentSource(authentication);
            const streamToken = await resolveSamoStreamToken(authentication, request);
            const feedItems = await loadSamoPodcastFeedHomeItems(
                authentication,
                request,
                streamToken,
                source,
            );
            items.push(...feedItems);
        } catch {
            // Podcast feed is best-effort.
        }
    }

    return items
        .sort((left, right) => (right.addedAt ?? 0) - (left.addedAt ?? 0))
        .slice(0, SAMO_PODCAST_FEED_DISPLAY_LIMIT);
};

/**
 * Radio stations (internet + programmed) for the Home Radio section. Radio is
 * the one browse type the on-device mirror does not hold (the sync manifest
 * carries no radio ids to reconcile against), so clients fetch it live along
 * with the other server-curated sections (discover, podcast feed).
 */
export const loadMobileRadioForServers = async ({
    authentication,
    fetch: fetcher,
}: {
    authentication: ServerAuthenticationResult | null;
    fetch?: SamoFetch;
}): Promise<MobileHomeItem[]> => {
    const request = getFetch(fetcher);

    if (!authentication || authentication.type !== ServerType.SAMO) {
        return [];
    }

    const items: MobileHomeItem[] = [];
    try {
        const source = getMobileContentSource(authentication);
        const streamToken = await resolveSamoStreamToken(authentication, request);
        const [internetResult, programmedResult] = await Promise.allSettled([
            listSamoInternetRadioStations(request, authentication, { limit: 100 }),
            listSamoProgrammedRadioStations(request, authentication, { limit: 100 }),
        ]);
        if (programmedResult.status === 'fulfilled') {
            for (const station of samoItemsOf(programmedResult.value)) {
                const item = samoProgrammedRadioToHomeItem(
                    authentication,
                    station,
                    streamToken,
                    source,
                );
                if (item) items.push(item);
            }
        }
        if (internetResult.status === 'fulfilled') {
            for (const station of samoItemsOf(internetResult.value)) {
                const item = samoInternetRadioToHomeItem(
                    authentication,
                    station,
                    streamToken,
                    source,
                );
                if (item) items.push(item);
            }
        }
    } catch {
        // Radio is best-effort; the rest of Home should still render.
    }

    return items;
};

/**
 * The server-managed Explo playlist for the Home "New from Explo" card, or
 * an empty array when it doesn't exist yet / has no tracks / the feature
 * isn't configured on this server. Like radio, the on-device mirror has no
 * way to identify which playlist (if any) is the system-managed one — the
 * `system` flag isn't part of the mirrored item shape — so this is fetched
 * live alongside the other server-curated sections rather than read from the
 * mirror.
 */
export const loadMobileExploForServers = async ({
    authentication,
    fetch: fetcher,
}: {
    authentication: ServerAuthenticationResult | null;
    fetch?: SamoFetch;
}): Promise<MobileHomeItem[]> => {
    const request = getFetch(fetcher);

    if (!authentication || authentication.type !== ServerType.SAMO) {
        return [];
    }

    try {
        const source = getMobileContentSource(authentication);
        const streamToken = await resolveSamoStreamToken(authentication, request);
        const playlist = await findSamoExploPlaylist(request, authentication);
        // No card at all until the server has actually dropped tracks into
        // it — an empty Explo playlist reads the same as "not set up yet"
        // from the listener's point of view.
        if (!playlist || !playlist.trackCount) return [];
        const item = samoPlaylistToHomeItem(authentication, playlist, streamToken, source);
        return item ? [item] : [];
    } catch {
        // Explo is best-effort; the rest of Home should still render.
        return [];
    }
};

export const loadMobileDiscoveryForServers = async ({
    authentication,
    fetch: fetcher,
}: {
    authentication: ServerAuthenticationResult | null;
    fetch?: SamoFetch;
}): Promise<MobileHomeItem[]> => {
    const request = getFetch(fetcher);
    const items: MobileHomeItem[] = [];

    if (authentication && authentication.type === ServerType.SAMO) {
        try {
            const source = getMobileContentSource(authentication);
            const streamToken = await resolveSamoStreamToken(authentication, request);
            const discoveryItems = await loadSamoDiscoveryHomeItems(
                authentication,
                request,
                streamToken,
                source,
            );
            items.push(...discoveryItems);
        } catch {
            // Discovery is best-effort; other home sections should still load.
        }
    }

    return items;
};

const loadSamoRecentlyAddedHomeItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    streamToken: string | undefined,
    source: MobileContentSource,
    limit: number,
): Promise<MobileHomeItem[]> => {
    const [catalogResult, browseAlbumsResult, audiobooksResult, podcastsResult] =
        await Promise.allSettled([
            listSamoCatalogRecentlyAdded(fetcher, authentication, { limit: limit * 2 }),
            getSamoMusicBrowse(fetcher, authentication, 'recently-added', { limit: limit * 2 }),
            listSamoAudiobooks(fetcher, authentication, { limit: 300 }),
            listSamoPodcasts(fetcher, authentication, { limit: 300 }),
        ]);

    const albumById = new Map<string, MobileHomeItem>();
    if (browseAlbumsResult.status === 'fulfilled') {
        for (const album of samoItemsOf(
            browseAlbumsResult.value.albums as SamoPaginatedResponse<SamoMusicAlbum>,
        )) {
            const item = samoAlbumToHomeItem(authentication, album, streamToken, source);
            if (item) {
                albumById.set(album.id, item);
            }
        }
    }

    const audiobookById = new Map<string, MobileHomeItem>();
    if (audiobooksResult.status === 'fulfilled') {
        for (const audiobook of samoItemsOf(audiobooksResult.value)) {
            const item = samoAudiobookToHomeItem(authentication, audiobook, streamToken, source);
            if (item) {
                audiobookById.set(audiobook.id, item);
            }
        }
    }

    const podcastById = new Map<string, MobileHomeItem>();
    if (podcastsResult.status === 'fulfilled') {
        for (const podcast of samoItemsOf(podcastsResult.value)) {
            const item = samoPodcastToHomeItem(authentication, podcast, streamToken, source);
            if (item) {
                podcastById.set(podcast.id, item);
            }
        }
    }

    if (catalogResult.status !== 'fulfilled') {
        return sortHomeItemsByAddedAt([
            ...albumById.values(),
            ...audiobookById.values(),
            ...podcastById.values(),
        ]).slice(0, limit);
    }

    const resolveCatalogEntry = (entry: SamoRecentlyAddedEntry): MobileHomeItem | null => {
        switch (entry.kind) {
            case 'audiobook':
                return audiobookById.get(entry.id) ?? null;
            case 'music-album':
                return albumById.get(entry.id) ?? null;
            case 'podcast':
                return podcastById.get(entry.id) ?? null;
            default:
                return null;
        }
    };

    const ordered: MobileHomeItem[] = [];
    const seen = new Set<string>();

    for (const entry of catalogResult.value.items) {
        const item = resolveCatalogEntry(entry);
        if (!item) {
            continue;
        }
        const key = `${item.type}:${item.id}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        ordered.push({
            ...item,
            addedAt: toEpochMs(entry.addedAt) ?? item.addedAt,
        });
        if (ordered.length >= limit) {
            break;
        }
    }

    if (ordered.length >= limit) {
        return ordered;
    }

    for (const item of sortHomeItemsByAddedAt([
        ...albumById.values(),
        ...audiobookById.values(),
        ...podcastById.values(),
    ])) {
        const key = `${item.type}:${item.id}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        ordered.push(item);
        if (ordered.length >= limit) {
            break;
        }
    }

    return ordered;
};

const loadSamoHomeContent = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    limit: number,
    signal?: AbortSignal,
): Promise<MobileHomeContent> => {
    const source = getMobileContentSource(authentication);
    const streamToken = await resolveSamoStreamToken(authentication, fetcher);
    const playCountListQuery = {
        direction: 'desc' as const,
        limit,
        sort: 'playCount' as const,
    };

    // -----------------------------------------------------------------------
    // Tier 1 — above-the-fold: what the user sees first (~3 concurrent calls)
    // -----------------------------------------------------------------------
    const [
        recentlyAddedResult,
        topAlbumsResult,
        topArtistsResult,
    ] = await Promise.allSettled([
        loadSamoRecentlyAddedHomeItems(authentication, fetcher, streamToken, source, limit),
        listSamoMusicAlbums(fetcher, authentication, playCountListQuery).then((body) =>
            samoItemsOf(body).flatMap((album) => {
                const item = samoAlbumToHomeItem(authentication, album, streamToken, source);
                return item ? [item] : [];
            }),
        ),
        listSamoMusicArtists(fetcher, authentication, playCountListQuery).then((body) =>
            samoItemsOf(body).flatMap((artist) => {
                const item = samoArtistToHomeItem(authentication, artist, streamToken, source);
                return item ? [item] : [];
            }),
        ),
    ]);

    // Bail early if the caller cancelled (e.g. user switched servers).
    if (signal?.aborted) {
        throw new Error('loadSamoHomeContent aborted');
    }

    // -----------------------------------------------------------------------
    // Tier 2 — mid-screen sections (~4 concurrent calls)
    // -----------------------------------------------------------------------
    const [
        playlistsResult,
        exploResult,
        audiobooksResult,
        discoveryResult,
    ] = await Promise.allSettled([
        listSamoMusicPlaylists(fetcher, authentication, { limit: 200 }).then((body) =>
            sortHomeItemsByLastPlayed(
                samoItemsOf(body).flatMap((playlist) => {
                    const item = samoPlaylistToHomeItem(authentication, playlist, streamToken, source);
                    return item ? [item] : [];
                }),
            ).slice(0, limit),
        ),
        findSamoExploPlaylist(fetcher, authentication).then((playlist) => {
            // No section at all until the server has actually dropped tracks
            // into it — an empty Explo playlist is indistinguishable from "not
            // set up yet" from the listener's point of view.
            if (!playlist || !playlist.trackCount) return [];
            const item = samoPlaylistToHomeItem(authentication, playlist, streamToken, source);
            return item ? [item] : [];
        }),
        listSamoAudiobooks(fetcher, authentication, { limit }).then((body) =>
            samoItemsOf(body).flatMap((audiobook) => {
                const item = samoAudiobookToHomeItem(authentication, audiobook, streamToken, source);
                return item ? [item] : [];
            }),
        ),
        loadSamoDiscoveryHomeItems(authentication, fetcher, streamToken, source),
    ]);

    if (signal?.aborted) {
        throw new Error('loadSamoHomeContent aborted');
    }

    // -----------------------------------------------------------------------
    // Tier 3 — off-screen content (~4 concurrent calls)
    // -----------------------------------------------------------------------
    const [
        podcastFeedResult,
        podcastsResult,
        internetRadioResult,
        programmedRadioResult,
    ] = await Promise.allSettled([
        loadSamoPodcastFeedHomeItems(authentication, fetcher, streamToken, source),
        listSamoPodcasts(fetcher, authentication, { limit }).then((body) =>
            samoItemsOf(body).flatMap((podcast) => {
                const item = samoPodcastToHomeItem(authentication, podcast, streamToken, source);
                return item ? [item] : [];
            }),
        ),
        listSamoInternetRadioStations(fetcher, authentication, { limit }).then((body) =>
            samoItemsOf(body).flatMap((station) => {
                const item = samoInternetRadioToHomeItem(
                    authentication,
                    station,
                    streamToken,
                    source,
                );
                return item ? [item] : [];
            }),
        ),
        listSamoProgrammedRadioStations(fetcher, authentication, { limit }).then((body) =>
            samoItemsOf(body).flatMap((station) => {
                const item = samoProgrammedRadioToHomeItem(
                    authentication,
                    station,
                    streamToken,
                    source,
                );
                return item ? [item] : [];
            }),
        ),
    ]);

    const errors: MobileHomeSectionError[] = [];
    const pushError = (
        result: PromiseSettledResult<unknown>,
        sectionId: MobileHomeSectionId,
    ) => {
        if (result.status === 'rejected') {
            errors.push({
                message: getErrorMessage(result.reason),
                sectionId,
            });
        }
    };
    pushError(recentlyAddedResult, MobileHomeSectionId.RECENTLY_ADDED);
    pushError(topArtistsResult, MobileHomeSectionId.FAVORITE_ARTISTS);
    pushError(topAlbumsResult, MobileHomeSectionId.FAVORITE_ALBUMS);
    pushError(discoveryResult, MobileHomeSectionId.DISCOVER);
    pushError(podcastFeedResult, MobileHomeSectionId.PODCAST_FEED);
    pushError(playlistsResult, MobileHomeSectionId.PLAYLISTS);
    pushError(exploResult, MobileHomeSectionId.EXPLO);
    pushError(audiobooksResult, MobileHomeSectionId.AUDIOBOOKS);
    pushError(podcastsResult, MobileHomeSectionId.PODCASTS);
    pushError(internetRadioResult, MobileHomeSectionId.RADIO);
    pushError(programmedRadioResult, MobileHomeSectionId.RADIO);

    const radioItems = [
        ...settledOrEmpty(programmedRadioResult),
        ...settledOrEmpty(internetRadioResult),
    ];

    const sections: MobileHomeSection[] = [
        {
            id: MobileHomeSectionId.RECENTLY_ADDED,
            items: settledOrEmpty(recentlyAddedResult),
            title: 'Recently Added',
        },
        {
            id: MobileHomeSectionId.FAVORITE_ALBUMS,
            items: sortMobileHomeItemsByPlayCount(settledOrEmpty(topAlbumsResult)).slice(0, limit),
            title: 'Favorite Albums',
        },
        {
            id: MobileHomeSectionId.FAVORITE_ARTISTS,
            items: sortMobileHomeItemsByPlayCount(settledOrEmpty(topArtistsResult)).slice(0, limit),
            title: 'Favorite Artists',
        },
        {
            id: MobileHomeSectionId.DISCOVER,
            items: settledOrEmpty(discoveryResult),
            title: 'Discover',
        },
        {
            id: MobileHomeSectionId.PODCAST_FEED,
            items: settledOrEmpty(podcastFeedResult),
            title: 'Podcast Feed',
        },
        {
            id: MobileHomeSectionId.AUDIOBOOKS,
            items: settledOrEmpty(audiobooksResult),
            title: 'Audiobooks',
        },
        {
            id: MobileHomeSectionId.PODCASTS,
            items: settledOrEmpty(podcastsResult),
            title: 'Podcasts',
        },
        {
            id: MobileHomeSectionId.PLAYLISTS,
            items: settledOrEmpty(playlistsResult),
            title: 'Playlists',
        },
        {
            id: MobileHomeSectionId.EXPLO,
            items: settledOrEmpty(exploResult),
            title: 'New from Explore',
        },
        {
            id: MobileHomeSectionId.RADIO,
            items: radioItems,
            title: 'Radio',
        },
    ].filter(hasItems);

    return {
        errors,
        loadedAt: Date.now(),
        sections,
        serverTitle: authentication.title,
    };
};

const SAMO_FULL_COLLECTION_LIMIT = 500;
const SAMO_FULL_COLLECTION_MAX_PAGES = 40;

const loadSamoFullCollectionPaged = async <T>(
    page: (input: { limit: number; offset: number }) => Promise<SamoPaginatedResponse<T> | T[]>,
    options?: {
        /** Deliver each page to the consumer as it arrives. Return `false` to
         *  stop paging early (e.g. user navigated away). */
        onPage?: (batch: T[], cumulativeCount: number) => boolean | void;
        /** Abort signal — checked between pages to bail out early. */
        signal?: AbortSignal;
    },
): Promise<T[]> => {
    const all: T[] = [];

    for (let i = 0; i < SAMO_FULL_COLLECTION_MAX_PAGES; i += 1) {
        if (options?.signal?.aborted) break;
        const response = await page({
            limit: SAMO_FULL_COLLECTION_LIMIT,
            offset: i * SAMO_FULL_COLLECTION_LIMIT,
        });
        const batch = samoItemsOf<T>(response);
        if (batch.length === 0) break;
        all.push(...batch);
        // Stream to consumer as pages arrive (for incremental rendering).
        if (options?.onPage) {
            const shouldContinue = options.onPage(batch, all.length);
            if (shouldContinue === false) break;
        }
        if (batch.length < SAMO_FULL_COLLECTION_LIMIT) break;
    }

    return all;
};

const SAMO_FULL_COLLECTION_PLAY_COUNT_QUERY = {
    direction: 'desc' as const,
    sort: 'playCount' as const,
};

const loadSamoFullCollection = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    variant: MobileFullCollectionVariant,
    updatedSince?: number | string,
): Promise<MobileHomeItem[]> => {
    const source = getMobileContentSource(authentication);
    const streamToken = await resolveSamoStreamToken(authentication, fetcher);
    const playCountQuery =
        variant === 'album' || variant === 'artist'
            ? SAMO_FULL_COLLECTION_PLAY_COUNT_QUERY
            : undefined;

    switch (variant) {
        case 'album': {
            const albums = await loadSamoFullCollectionPaged<SamoMusicAlbum>((input) =>
                listSamoMusicAlbums(fetcher, authentication, {
                    ...playCountQuery,
                    ...input,
                    updatedSince,
                }),
            );
            return albums.flatMap((album) => {
                const item = samoAlbumToHomeItem(authentication, album, streamToken, source);
                return item ? [item] : [];
            });
        }
        case 'artist': {
            const artists = await loadSamoFullCollectionPaged<SamoMusicArtist>((input) =>
                listSamoMusicArtists(fetcher, authentication, {
                    ...playCountQuery,
                    ...input,
                    updatedSince,
                }),
            );
            return artists.flatMap((artist) => {
                const item = samoArtistToHomeItem(authentication, artist, streamToken, source);
                return item ? [item] : [];
            });
        }
        case 'audiobook': {
            const audiobooks = await loadSamoFullCollectionPaged<SamoAudiobook>((input) =>
                listSamoAudiobooks(fetcher, authentication, { ...input, updatedSince }),
            );
            return audiobooks.flatMap((audiobook) => {
                const item = samoAudiobookToHomeItem(authentication, audiobook, streamToken, source);
                return item ? [item] : [];
            });
        }
        case 'playlist': {
            const playlists = await loadSamoFullCollectionPaged<SamoMusicPlaylist>((input) =>
                listSamoMusicPlaylists(fetcher, authentication, { ...input, updatedSince }),
            );
            return playlists.flatMap((playlist) => {
                const item = samoPlaylistToHomeItem(authentication, playlist, streamToken, source);
                return item ? [item] : [];
            });
        }
        case 'podcast': {
            const podcasts = await loadSamoFullCollectionPaged<SamoPodcast>((input) =>
                listSamoPodcasts(fetcher, authentication, { ...input, updatedSince }),
            );
            return podcasts.flatMap((podcast) => {
                const item = samoPodcastToHomeItem(authentication, podcast, streamToken, source);
                return item ? [item] : [];
            });
        }
    }
};

const loadSamoLibraryRelevantItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
): Promise<MobileHomeItem[]> => {
    const source = getMobileContentSource(authentication);
    const streamToken = await resolveSamoStreamToken(authentication, fetcher);

    const buckets = await Promise.allSettled([
        getSamoMusicBrowse(fetcher, authentication, 'recently-added', { limit: 80 }).then((body) =>
            samoItemsOf(body.albums as SamoPaginatedResponse<SamoMusicAlbum>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'recently-added', { limit: 80 }).then((body) =>
            samoItemsOf(body.artists as SamoPaginatedResponse<SamoMusicArtist>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'recently-played', { limit: 80 }).then((body) =>
            samoItemsOf(body.albums as SamoPaginatedResponse<SamoMusicAlbum>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'recently-played', { limit: 80 }).then((body) =>
            samoItemsOf(body.artists as SamoPaginatedResponse<SamoMusicArtist>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'favorites', { limit: 80 }).then((body) =>
            samoItemsOf(body.albums as SamoPaginatedResponse<SamoMusicAlbum>),
        ),
        getSamoMusicBrowse(fetcher, authentication, 'favorites', { limit: 80 }).then((body) =>
            samoItemsOf(body.artists as SamoPaginatedResponse<SamoMusicArtist>),
        ),
        listSamoMusicArtists(fetcher, authentication, {
            direction: 'desc',
            limit: 80,
            sort: 'recent',
        }).then((body) => samoItemsOf(body)),
        listSamoMusicPlaylists(fetcher, authentication, { limit: 80 }).then((body) =>
            samoItemsOf(body),
        ),
        listSamoAudiobooks(fetcher, authentication, { limit: 80 }).then((body) =>
            samoItemsOf(body),
        ),
        listSamoPodcasts(fetcher, authentication, { limit: 80 }).then((body) =>
            samoItemsOf(body),
        ),
        listSamoInternetRadioStations(fetcher, authentication, { limit: 40 }).then((body) =>
            samoItemsOf(body),
        ),
    ]);

    const seen = new Set<string>();
    const items: MobileHomeItem[] = [];

    const push = (item: MobileHomeItem | null) => {
        if (!item) return;
        const key = `${item.type}:${item.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push(item);
    };

    if (buckets[0].status === 'fulfilled') {
        for (const album of buckets[0].value as SamoMusicAlbum[]) {
            push(samoAlbumToHomeItem(authentication, album, streamToken, source));
        }
    }
    if (buckets[1].status === 'fulfilled') {
        for (const artist of buckets[1].value as SamoMusicArtist[]) {
            push(samoArtistToHomeItem(authentication, artist, streamToken, source));
        }
    }
    if (buckets[2].status === 'fulfilled') {
        for (const album of buckets[2].value as SamoMusicAlbum[]) {
            push(samoAlbumToHomeItem(authentication, album, streamToken, source));
        }
    }
    if (buckets[3].status === 'fulfilled') {
        for (const artist of buckets[3].value as SamoMusicArtist[]) {
            push(samoArtistToHomeItem(authentication, artist, streamToken, source));
        }
    }
    if (buckets[4].status === 'fulfilled') {
        for (const album of buckets[4].value as SamoMusicAlbum[]) {
            push(samoAlbumToHomeItem(authentication, album, streamToken, source));
        }
    }
    if (buckets[5].status === 'fulfilled') {
        for (const artist of buckets[5].value as SamoMusicArtist[]) {
            push(samoArtistToHomeItem(authentication, artist, streamToken, source));
        }
    }
    if (buckets[6].status === 'fulfilled') {
        for (const artist of buckets[6].value as SamoMusicArtist[]) {
            push(samoArtistToHomeItem(authentication, artist, streamToken, source));
        }
    }
    if (buckets[7].status === 'fulfilled') {
        for (const playlist of buckets[7].value as SamoMusicPlaylist[]) {
            push(samoPlaylistToHomeItem(authentication, playlist, streamToken, source));
        }
    }
    if (buckets[8].status === 'fulfilled') {
        for (const audiobook of buckets[8].value as SamoAudiobook[]) {
            push(samoAudiobookToHomeItem(authentication, audiobook, streamToken, source));
        }
    }
    if (buckets[9].status === 'fulfilled') {
        for (const podcast of buckets[9].value as SamoPodcast[]) {
            push(samoPodcastToHomeItem(authentication, podcast, streamToken, source));
        }
    }
    if (buckets[10].status === 'fulfilled') {
        for (const station of buckets[10].value as SamoInternetRadioStation[]) {
            push(samoInternetRadioToHomeItem(authentication, station, streamToken, source));
        }
    }

    return items.slice(0, LIBRARY_RELEVANT_MAX_ITEMS);
};

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export const loadMobileHomeContent = async ({
    authentication,
    fetch: fetcher,
    limit = DEFAULT_HOME_LIMIT,
    signal,
}: MobileHomeContentInput): Promise<MobileHomeContent> => {
    const request = getFetch(fetcher);

    if (authentication.type === ServerType.SAMO) {
        return loadSamoHomeContent(authentication, request, limit, signal);
    }

    throw new Error('Home content is not wired for this server type');
};



export type MobileFullCollectionVariant =
    | 'album'
    | 'artist'
    | 'audiobook'
    | 'playlist'
    | 'podcast';

export interface MobileFullCollectionInput {
    authentication: ServerAuthenticationResult | null;
    fetch?: SamoFetch;
    // Incremental ("delta") sync watermark for Samo sources: only items
    // changed at/after this point are returned. Pass SamoSyncManifest.serverTime
    // (RFC3339) or unix milliseconds. Non-Samo sources ignore it.
    updatedSince?: number | string;
    variant: MobileFullCollectionVariant;
}

export interface MobileFullCollectionResult {
    errors: string[];
    items: MobileHomeItem[];
}

const loadFullCollectionForServer = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    variant: MobileFullCollectionVariant,
    updatedSince?: number | string,
): Promise<MobileHomeItem[]> => {
    if (authentication.type === ServerType.SAMO) {
        return loadSamoFullCollection(authentication, fetcher, variant, updatedSince);
    }

    return [];
};

/**
 * Load the COMPLETE list of items for a given collection variant across every
 * connected server. Used by the "View All" screens — Home only fetches the top
 * slice of each section, but the View All grids are supposed to be exhaustive.
 *
 * Failures from individual servers are bubbled up as errors but never block
 * the items returned by other servers — partial connectivity should still
 * show whatever it can.
 */
export const loadMobileFullCollection = async ({
    authentication,
    fetch: fetcher,
    updatedSince,
    variant,
}: MobileFullCollectionInput): Promise<MobileFullCollectionResult> => {
    if (!authentication) {
        return { errors: [], items: [] };
    }
    const request = getFetch(fetcher);
    try {
        const items = await loadFullCollectionForServer(authentication, request, variant, updatedSince);
        return { errors: [], items };
    } catch (error) {
        return { errors: [`${authentication.title}: ${getErrorMessage(error)}`], items: [] };
    }
};

export const loadMobileHomeContentForServers = async ({
    authentication,
    fetch: fetcher,
    limit = DEFAULT_HOME_LIMIT,
}: MobileHomeContentForServersInput): Promise<MobileHomeContent> => {
    const loadedAt = Date.now();

    if (!authentication) {
        return {
            errors: [],
            loadedAt,
            sections: [],
            serverTitle: '',
        };
    }

    const request = getFetch(fetcher);
    try {
        const content = await loadMobileHomeContent({
            authentication,
            fetch: request,
            limit,
        });
        return {
            errors: content.errors,
            loadedAt,
            sections: content.sections.filter(hasItems),
            serverTitle: authentication.title,
        };
    } catch (error) {
        throw new Error(`${authentication.title}: ${getErrorMessage(error)}`);
    }
};

/** Server-backed recently played rows for cross-client recents merge (Android home). */
export const loadSamoRecentlyPlayedHomeItems = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    limit = 40,
): Promise<MobileHomeItem[]> => {
    if (authentication.type !== ServerType.SAMO) {
        return [];
    }

    const source = getMobileContentSource(authentication);
    const streamToken = await resolveSamoStreamToken(authentication, fetcher);
    const body = await getSamoMusicBrowse(fetcher, authentication, 'recently-played', { limit });

    const items: MobileHomeItem[] = [];

    for (const album of samoItemsOf(body.albums as SamoPaginatedResponse<SamoMusicAlbum>)) {
        const item = samoAlbumToHomeItem(authentication, album, streamToken, source);
        if (item) {
            items.push({
                ...item,
                lastPlayedAt: toEpochMs(album.playback?.lastPlayedAt) ?? item.lastPlayedAt,
                playCount: album.playback?.playCount ?? item.playCount,
            });
        }
    }

    for (const playlist of samoItemsOf(body.playlists as SamoPaginatedResponse<SamoMusicPlaylist>)) {
        const item = samoPlaylistToHomeItem(authentication, playlist, streamToken, source);
        if (item) {
            items.push(item);
        }
    }

    return sortHomeItemsByLastPlayed(items).slice(0, limit);
};

/** Target size for the Library "Relevant" catalog — fast to load, feels personal. */
export const LIBRARY_RELEVANT_MAX_ITEMS = 300;

export interface MobileLibraryRelevantContent {
    errors: string[];
    items: MobileHomeItem[];
    loadedAt: number;
}

export interface MobileLibraryRelevantContentForServersInput {
    authentication: ServerAuthenticationResult | null;
    fetch?: SamoFetch;
    maxItems?: number;
}

const loadMobileLibraryRelevantContent = async ({
    authentication,
    fetch: fetcher,
}: {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
}): Promise<MobileHomeItem[]> => {
    const request = getFetch(fetcher);

    if (authentication.type === ServerType.SAMO) {
        return loadSamoLibraryRelevantItems(authentication, request);
    }

    return [];
};

/**
 * Build the Library "Relevant" catalog: server-side recency signals (recent /
 * frequent / newest albums, favorites, playlists, radio, ABS recents) merged
 * across every connected server, capped for a fast first paint.
 */
export const loadMobileLibraryRelevantContentForServers = async ({
    authentication,
    fetch: fetcher,
    maxItems = LIBRARY_RELEVANT_MAX_ITEMS,
}: MobileLibraryRelevantContentForServersInput): Promise<MobileLibraryRelevantContent> => {
    const loadedAt = Date.now();

    if (!authentication) {
        return { errors: [], items: [], loadedAt };
    }

    try {
        const items = await loadMobileLibraryRelevantContent({ authentication, fetch: fetcher });
        return {
            errors: [],
            items: items.slice(0, maxItems),
            loadedAt,
        };
    } catch (error) {
        return {
            errors: [`${authentication.title}: ${getErrorMessage(error)}`],
            items: [],
            loadedAt,
        };
    }
};
