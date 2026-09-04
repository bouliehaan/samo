import {
    formatServerCapabilities,
    getDefaultServerCapabilities,
    type ServerCapabilities,
} from './server-capabilities';
import { getFetch, normalizeBaseUrl, requestJson, type SamoFetch } from './server-http';
import { type ServerAuthenticationKind, type ServerAuthenticationResult } from './server-auth';
import { ServerType } from './server-types';

// ---------------------------------------------------------------------------
// Native Samo `/api/v1/*` types
// ---------------------------------------------------------------------------
//
// These are 1:1 with the JSON the server emits. We do not reshape, flatten, or
// alias. Field names match `server_docs/api.md` and `api-integration.md` —
// when a future Samo Server release adds a field, we add the property here.

export interface SamoSetupStatus {
    currentStep?: 'admin' | 'done' | 'libraries' | 'scan';
    hasAdmin?: boolean;
    hasLibrary?: boolean;
    hasScanned?: boolean;
    libraryCount?: number;
    needsSetup?: boolean;
}

export interface SamoLoginUser {
    displayName?: string;
    id?: string;
    role?: 'admin' | 'user';
    username?: string;
}

export interface SamoLoginResponse {
    /** Stable, server-issued identity. Absent on servers older than the
     *  identity migration — callers fall back to keying by URL. */
    serverId?: string;
    token?: string;
    tokenMeta?: {
        createdAt?: string;
        id?: string;
        label?: string;
    };
    user?: SamoLoginUser;
}

export interface SamoDeviceTokenResponse {
    secret?: string;
    token?: {
        createdAt?: string;
        id?: string;
        label?: string;
    };
}

export interface SamoStreamTokenResponse {
    expiresAt?: string;
    token?: string;
}

export interface SamoPaginatedResponse<T> {
    items?: T[];
    limit?: number;
    offset?: number;
    total?: number;
}

export interface SamoImage {
    height?: number;
    id?: string;
    kind?: string;
    mimeType?: string;
    /**
     * Local filesystem path. The server's catalog responses surface this so
     * admin clients can audit where an asset lives; remote clients can't
     * read it but it still appears in payloads.
     */
    path?: string;
    sourceUrl?: string;
    /**
     * Absolute URL when the cover was sourced from a remote provider (e.g.
     * Open Library, iTunes). Local filesystem images don't populate this —
     * use the image/cover endpoints with the `id`/`path` to fetch them.
     */
    url?: string;
    width?: number;
}

export interface SamoExternalIds {
    audibleAsin?: string;
    discogs?: string;
    googleBooks?: string;
    isbn?: string;
    isrc?: string;
    itunes?: string;
    musicbrainzAlbum?: string;
    musicbrainzArtist?: string;
    musicbrainzRecording?: string;
    musicbrainzReleaseGroup?: string;
    musicbrainzTrack?: string;
    openLibrary?: string;
    upc?: string;
}

export interface SamoAudioFile {
    bitDepth?: number;
    /** Server returns lowercase `bitrate` (bits per second). */
    bitrate?: number;
    channelLayout?: string;
    channels?: number;
    checksum?: string;
    codec?: string;
    codecProfile?: string;
    container?: string;
    discNumber?: number;
    /** Duration in seconds. */
    durationSeconds?: number;
    /** Exact duration in milliseconds (preferred over durationSeconds). */
    durationMs?: number;
    embeddedTags?: Record<string, string[]>;
    fileName?: string;
    id?: string;
    inode?: string;
    libraryId?: string;
    mediaFileId?: string;
    /**
     * This file's start position on the book-global timeline (sum of every
     * earlier file's exact duration). 0 for the first file. The client uses it
     * to map book-time <-> (file, file-time) without re-accumulating durations.
     */
    startOffsetSeconds?: number;
    metadataFormats?: string[];
    mimeType?: string;
    modifiedAt?: string;
    path?: string;
    relativePath?: string;
    sampleRate?: number;
    sizeBytes?: number;
    trackNumber?: number;
}

export interface SamoAudioChapter {
    durationSeconds?: number;
    endSeconds?: number;
    id?: string;
    index?: number;
    mediaFileId?: string;
    startSeconds?: number;
    title?: string;
}

export interface SamoPlaybackState {
    completed?: boolean;
    favorite?: boolean;
    lastPlayedAt?: string;
    lastPositionAt?: string;
    playCount?: number;
    progressSeconds?: number;
    rating?: number;
    skipCount?: number;
    starred?: boolean;
}

export interface SamoCatalogOverview {
    audiobook?: {
        audiobookCount?: number;
        contributorCount?: number;
        seriesCount?: number;
    };
    music?: {
        albumCount?: number;
        artistCount?: number;
        trackCount?: number;
    };
    podcast?: {
        episodeCount?: number;
        podcastCount?: number;
    };
    radio?: {
        internetStationCount?: number;
        programmedStationCount?: number;
    };
}

export interface SamoMusicArtistRef {
    id?: string;
    name?: string;
    role?: string;
    sortName?: string;
}

/**
 * Reference shown in the "Similar Artists" rail. When the artist exists in this
 * library, `id` + `images` point at the navigable catalog artist. When it does
 * not, `external` is true and `imageUrl` holds the external provider's picture —
 * the client renders the tile and routes a tap to search rather than a detail
 * fetch that would 404.
 */
export interface SamoArtistRef {
    id: string;
    images?: SamoImage[];
    /** External provider artist picture URL — present (with `external: true`) for similar artists not in this library. */
    imageUrl?: string;
    /** True when this artist is NOT in the local catalog: tap routes to search, not a detail fetch. */
    external?: boolean;
    name: string;
}

export interface SamoMusicArtist {
    addedAt?: string;
    albumCount?: number;
    biography?: string;
    country?: string;
    disambiguation?: string;
    durationSeconds?: number;
    externalIds?: SamoExternalIds;
    genres?: string[];
    id: string;
    images?: SamoImage[];
    links?: string[];
    moods?: string[];
    name: string;
    playback?: SamoPlaybackState;
    similarArtists?: SamoArtistRef[];
    sortName?: string;
    styles?: string[];
    trackCount?: number;
    updatedAt?: string;
}

export interface SamoMusicAlbum {
    /** Server-real `addedAt` timestamp (RFC3339). */
    addedAt?: string;
    /**
     * Album-artist IDs in display order. The server splits artist
     * references into parallel `albumArtistIds` + `albumArtistNames` arrays
     * rather than a single `[{id, name}]` shape.
     */
    albumArtistIds?: string[];
    albumArtistNames?: string[];
    barcode?: string;
    catalogNumber?: string;
    discCount?: number;
    /** Duration in seconds (server returns `durationSeconds`, not `duration`). */
    durationSeconds?: number;
    externalIds?: SamoExternalIds;
    genres?: string[];
    /** Set by the explo folder integration - excludes the album from Recently Added shelves. */
    hiddenFromRecentlyAdded?: boolean;
    id: string;
    images?: SamoImage[];
    moods?: string[];
    originalReleaseDate?: string;
    originalReleaseYear?: number;
    playback?: SamoPlaybackState;
    /**
     * Aggregated from track media files at catalog load so list/search/home
     * responses can show quality badges without per-track fetches.
     */
    maxBitDepth?: number;
    maxSampleRate?: number;
    /** Human label such as "24/192" when the album exceeds CD quality. */
    audioQuality?: string;
    hiRes?: boolean;
    /**
     * Optional single-file representative (not sent on list/search today).
     * Prefer maxBitDepth / maxSampleRate when present.
     */
    primaryAudioFile?: SamoAudioFile;
    /** Label name (server returns `recordLabel`). */
    recordLabel?: string;
    releaseDate?: string;
    releaseStatus?: string;
    releaseType?: string;
    releaseYear?: number;
    sizeBytes?: number;
    sortName?: string;
    styles?: string[];
    tags?: string[];
    /** Display artist string the server picks for tile subtitles. */
    displayArtist?: string;
    /** Album title (server returns `title`, not `name`). */
    title: string;
    trackArtistIds?: string[];
    trackArtistNames?: string[];
    trackCount?: number;
    tracks?: SamoMusicTrack[];
    updatedAt?: string;
}

export interface SamoMusicTrack {
    addedAt?: string;
    albumId?: string;
    /** Album title (server returns `albumTitle`, not `albumName`). */
    albumTitle?: string;
    /** Parallel album-artist arrays when the server includes them on track rows. */
    albumArtistIds?: string[];
    albumArtistNames?: string[];
    /** Parallel artist arrays — server doesn't ship `[{id, name}]` refs. */
    artistIds?: string[];
    artistNames?: string[];
    audioFiles?: SamoAudioFile[];
    bpm?: number;
    comment?: string;
    discNumber?: number;
    /** Display artist string the server picks for tile subtitles. */
    displayArtist?: string;
    /** Duration in seconds (server returns `durationSeconds`, not `duration`). */
    durationSeconds?: number;
    externalIds?: SamoExternalIds;
    genres?: string[];
    id: string;
    images?: SamoImage[];
    key?: string;
    lyrics?: string;
    playback?: SamoPlaybackState;
    primaryAudioFile?: SamoAudioFile;
    releaseDate?: string;
    releaseYear?: number;
    sortName?: string;
    tags?: string[];
    /** Track title (server returns `title`, not `name`). */
    title: string;
    totalDiscs?: number;
    totalTracks?: number;
    trackNumber?: number;
    trackSubtitle?: string;
    updatedAt?: string;
}

export interface SamoMusicPlaylist {
    createdAt?: string;
    description?: string;
    duration?: number;
    id: string;
    images?: SamoImage[];
    name: string;
    ownerId?: string;
    ownerName?: string;
    playback?: SamoPlaybackState;
    public?: boolean;
    /** Server-managed playlist (e.g. the explo auto-tagged drop playlist) rather than user-created. */
    system?: boolean;
    trackCount?: number;
    tracks?: SamoMusicTrack[];
    updatedAt?: string;
}

export interface SamoMusicSearchResponse {
    albums?: SamoMusicAlbum[];
    artists?: SamoMusicArtist[];
    playlists?: SamoMusicPlaylist[];
    tracks?: SamoMusicTrack[];
}

export interface SamoMusicBrowseResponse {
    albums?: SamoPaginatedResponse<SamoMusicAlbum> | SamoMusicAlbum[];
    artists?: SamoPaginatedResponse<SamoMusicArtist> | SamoMusicArtist[];
    playlists?: SamoPaginatedResponse<SamoMusicPlaylist> | SamoMusicPlaylist[];
    tracks?: SamoPaginatedResponse<SamoMusicTrack> | SamoMusicTrack[];
    view?: string;
}

export interface SamoContributor {
    audiobookCount?: number;
    biography?: string;
    externalIds?: SamoExternalIds;
    id: string;
    images?: SamoImage[];
    name: string;
    role?: string;
    sortName?: string;
}

export interface SamoSeries {
    audiobookCount?: number;
    description?: string;
    duration?: number;
    externalIds?: SamoExternalIds;
    id: string;
    images?: SamoImage[];
    name: string;
    sortName?: string;
}

export interface SamoAudiobook {
    addedAt?: string;
    audioFiles?: SamoAudioFile[];
    book?: {
        abridged?: boolean;
        authors?: SamoContributor[];
        description?: string;
        explicit?: boolean;
        externalIds?: SamoExternalIds;
        genres?: string[];
        isbn?: string;
        language?: string;
        narrators?: SamoContributor[];
        publishedDate?: string;
        /** Server returns a string ("2014") not a number. */
        publishedYear?: number | string;
        publisher?: string;
        seriesSequence?: string;
        sortTitle?: string;
        subtitle?: string;
        title?: string;
    };
    chapters?: SamoAudioChapter[];
    /**
     * How the chapters were derived and how much to trust them, so the UI can flag
     * uncertain ones for review instead of presenting every marker as authoritative.
     * chapterSource: "embedded" | "cue" | "audnexus" | "audio-aligned" | "file" | "none".
     * chapterConfidence: 0..1 from the audio registration (0 for embedded/file).
     */
    chapterSource?: string;
    chapterConfidence?: number;
    chapterAsin?: string;
    contributors?: SamoContributor[];
    /**
     * Single cover image object — server emits one cover per audiobook,
     * not the `images[]` array music uses.
     */
    cover?: SamoImage;
    /** Duration in seconds. */
    durationSeconds?: number;
    externalIds?: SamoExternalIds;
    folderId?: string;
    genres?: string[];
    /**
     * Server returns `item_*`-prefixed IDs for audiobook list rows even
     * though the spec calls these "audiobooks". Don't infer prefix.
     */
    id: string;
    inode?: string;
    invalid?: boolean;
    lastScanAt?: string;
    libraryId?: string;
    missing?: boolean;
    path?: string;
    /** Per-user playback state (server returns `progress`, not `playback`). */
    progress?: SamoPlaybackState;
    primaryAudioFile?: SamoAudioFile;
    series?: SamoSeries[];
    sizeBytes?: number;
    tags?: string[];
    updatedAt?: string;
}

export interface SamoBookmark {
    audiobookId?: string;
    chapterId?: string;
    createdAt?: string;
    id: string;
    note?: string;
    positionSeconds?: number;
    title?: string;
    updatedAt?: string;
}

export interface SamoCollection {
    audiobookCount?: number;
    audiobookIds?: string[];
    audiobooks?: SamoAudiobook[];
    createdAt?: string;
    description?: string;
    id: string;
    name: string;
    ownerId?: string;
    updatedAt?: string;
}

export interface SamoListeningSession {
    audiobookId?: string;
    durationSeconds?: number;
    endedAt?: string;
    id: string;
    startedAt?: string;
    userId?: string;
}

export interface SamoPodcastFeedPoll {
    consecutiveErrors?: number;
    lastPollFinishedAt?: string;
    lastPollStartedAt?: string;
    nextPollAt?: string;
    pollEnabled?: boolean;
    pollIntervalSeconds?: number;
}

export interface SamoPodcastFeed {
    createdAt?: string;
    feedUrl?: string;
    id: string;
    podcastId?: string;
    poll?: SamoPodcastFeedPoll;
    title?: string;
    updatedAt?: string;
}

export interface SamoPodcast {
    addedAt?: string;
    /** Single cover image object — server emits one cover per podcast. */
    cover?: SamoImage;
    durationSeconds?: number;
    /**
     * Optional RSS feed metadata. Only populated for shows backed by a
     * remote feed; locally-scanned shows leave it undefined.
     */
    feed?: SamoPodcastFeed;
    /** Active podcast_feeds row when RSS is linked (including hybrid library shows). */
    rssFeed?: {
        feedUrl?: string;
        id: string;
        title?: string;
    };
    folderId?: string;
    genres?: string[];
    id: string;
    invalid?: boolean;
    lastScanAt?: string;
    libraryId?: string;
    missing?: boolean;
    path?: string;
    /**
     * Show-level metadata is nested under `podcast` on the wire — the
     * outer row carries scan / cache / source state, the inner object
     * carries title / author / feed URL / episode count.
     */
    podcast?: {
        author?: string;
        categories?: string[];
        description?: string;
        episodeCount?: number;
        explicit?: boolean;
        externalIds?: SamoExternalIds & {
            feedGuid?: string;
            itunesId?: string;
            urls?: string[];
        };
        feedUrl?: string;
        language?: string;
        ownerEmail?: string;
        ownerName?: string;
        siteUrl?: string;
        subtitle?: string;
        title?: string;
    };
    /** Per-user playback state (server returns `progress`, not `playback`). */
    progress?: SamoPlaybackState;
    tags?: string[];
    updatedAt?: string;
}

export interface SamoPodcastEpisode {
    addedAt?: string;
    audioFiles?: SamoAudioFile[];
    /**
     * Server-side enclosure availability (wire field `cache`): `cached` = the
     * proxy cache holds the bytes, `local` = the episode file lives in the
     * server's own library. Either way the server serves it from disk, so the
     * proxy beats a direct CDN fetch for these episodes.
     */
    cache?: {
        cached?: boolean;
        downloadedAt?: string;
        local?: boolean;
        sizeBytes?: number;
    };
    chapters?: SamoAudioChapter[];
    description?: string;
    duration?: number;
    durationSeconds?: number;
    enclosureSize?: number;
    enclosureType?: string;
    enclosureUrl?: string;
    episodeNumber?: number;
    externalIds?: SamoExternalIds;
    id: string;
    images?: SamoImage[];
    /** Dead vocabulary — the server never emits these; see `cache`. */
    isCached?: boolean;
    isLocal?: boolean;
    name?: string;
    /** Per-user playback (wire field name on podcast episode payloads). */
    progress?: SamoPlaybackState;
    /** Legacy alias; prefer `progress` from the Samo API. */
    playback?: SamoPlaybackState;
    podcastId?: string;
    podcastTitle?: string;
    publishedAt?: string;
    seasonNumber?: number;
    subtitle?: string;
    tags?: string[];
    title?: string;
}

export interface SamoInternetRadioStationProbe {
    bitrate?: number;
    codec?: string;
    consecutiveErrors?: number;
    contentType?: string;
    error?: string;
    lastProbeFinishedAt?: string;
    lastProbeStartedAt?: string;
    lastProbedAt?: string;
    nextProbeAt?: string;
    probeEnabled?: boolean;
    probeIntervalSeconds?: number;
    /** "ok" | "error" | other server-defined string. */
    status?: string;
}

export interface SamoInternetRadioStationNowPlaying {
    artist?: string;
    raw?: string;
    /** Display title — server's preferred field. */
    title?: string;
    updatedAt?: string;
}

export interface SamoInternetRadioStation {
    bitrate?: number;
    codec?: string;
    contentType?: string;
    /**
     * Direct cover URL — when present, use this as-is instead of resolving
     * via a stream-token query. Server builds the absolute URL using the
     * configured base address.
     */
    coverId?: string;
    coverPath?: string;
    coverUrl?: string;
    createdAt?: string;
    description?: string;
    enabled?: boolean;
    homepageUrl?: string;
    /** External logo/thumbnail URL supplied by the station feed or admin. */
    imageUrl?: string;
    id: string;
    /** When the probe last ran (RFC3339). */
    lastCheckedAt?: string;
    name: string;
    nowPlaying?: SamoInternetRadioStationNowPlaying;
    /** M3U URL pointing at the cover stream — server-hosted shortcut. */
    playlistUrl?: string;
    probe?: SamoInternetRadioStationProbe;
    /** Public stream URL hosted by samo (redirects to upstream). */
    publicStreamUrl?: string;
    streamUrl?: string;
    tags?: string[];
    updatedAt?: string;
}

export interface SamoProgrammedRadioStation {
    createdAt?: string;
    description?: string;
    enabled?: boolean;
    id: string;
    images?: SamoImage[];
    name: string;
    nowPlaying?: {
        endsAt?: string;
        startedAt?: string;
        title?: string;
    };
    streamUrl?: string;
    updatedAt?: string;
}

export interface SamoUserMe {
    displayName?: string;
    email?: string;
    id: string;
    role?: 'admin' | 'user';
    username: string;
}

// ---------------------------------------------------------------------------
// URL + auth helpers
// ---------------------------------------------------------------------------

const authHeaders = (token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
});

const jsonHeaders = (token?: string): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(token ? authHeaders(token) : {}),
});

export const getSamoBearerToken = (
    authentication: Pick<ServerAuthenticationResult, 'credential'>,
) => {
    return authentication.credential;
};

const encodeSamoId = (id: string) => encodeURIComponent(id);

/**
 * `application/x-www-form-urlencoded` serialization of one query component —
 * byte-identical to what `URLSearchParams` emits (space as `+`, and the five
 * characters `!'()~` percent-encoded, which `encodeURIComponent` leaves bare).
 * These URLs are compared as strings all over the app (artwork cache keys,
 * queue item identity), so the encoding has to match the URL object's exactly.
 */
const encodeQueryComponent = (value: string): string =>
    encodeURIComponent(value)
        .replace(/%20/g, '+')
        .replace(/[!'()~]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * Origin for a server base URL, parsed ONCE per distinct URL.
 *
 * `new URL()` cost real frames: every Samo URL used to construct one (often
 * several), and Home alone builds ~900 artwork URLs per derive — on device
 * that measured 0.11ms per construction, i.e. most of a ~900ms synchronous
 * block, repeated on every re-derive. Since every API path here is ABSOLUTE,
 * URL resolution against the base is exactly "origin + path" — so parse the
 * base once, cache the origin, and concatenate from then on.
 *
 * The cache is keyed by the raw base string and is effectively fixed-size (one
 * entry per configured server).
 */
const apiOriginCache = new Map<string, string>();
const getSamoApiOrigin = (baseUrl: string): string => {
    const cached = apiOriginCache.get(baseUrl);
    if (cached !== undefined) {
        return cached;
    }
    // Trailing slash: matches the `new URL(path, `${baseUrl}/`)` this replaced,
    // so a base carrying a path prefix resolves the same way it always did.
    const origin = new URL(`${baseUrl}/`).origin;
    apiOriginCache.set(baseUrl, origin);
    return origin;
};

export const getSamoApiUrl = (
    server: Pick<ServerAuthenticationResult, 'url'>,
    path: string,
    query?: Record<string, boolean | number | string | undefined>,
) => {
    const baseUrl = normalizeBaseUrl(server.url);
    if (!baseUrl) {
        throw new Error('Samo server URL is not configured');
    }

    const apiPath = path.startsWith('/api/v1')
        ? path
        : `/api/v1${path.startsWith('/') ? path : `/${path}`}`;
    const url = `${getSamoApiOrigin(baseUrl)}${apiPath}`;

    if (!query) {
        return url;
    }
    let search = '';
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        search += `${search ? '&' : '?'}${encodeQueryComponent(key)}=${encodeQueryComponent(String(value))}`;
    }

    return `${url}${search}`;
};

export const getSamoSetupStatus = async (
    fetcher: SamoFetch,
    url: string,
): Promise<SamoSetupStatus> => {
    return requestJson<SamoSetupStatus>(
        fetcher,
        `${normalizeBaseUrl(url)}/api/v1/setup/status`,
        { method: 'GET' },
    );
};

export const mintSamoStreamToken = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
): Promise<SamoStreamTokenResponse> => {
    return requestJson<SamoStreamTokenResponse>(
        fetcher,
        getSamoApiUrl(authentication, '/auth/stream-token'),
        {
            headers: authHeaders(getSamoBearerToken(authentication)),
            method: 'POST',
        },
    );
};

export const withSamoStreamToken = (url: string, streamToken: string | undefined) => {
    if (!streamToken) {
        return url;
    }

    const target = new URL(url);
    target.searchParams.set('stream_token', streamToken);
    return target.toString();
};

export const getSamoCapabilities = (): ServerCapabilities => getDefaultServerCapabilities();

// ---------------------------------------------------------------------------
// Bearer-token-authenticated GET helper
// ---------------------------------------------------------------------------

interface SamoRequestOptions {
    query?: Record<string, boolean | number | string | undefined>;
    signal?: AbortSignal;
}

export const samoGet = async <T>(
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    path: string,
    options?: SamoRequestOptions,
): Promise<T> => {
    return requestJson<T>(fetcher, getSamoApiUrl(authentication, path, options?.query), {
        headers: authHeaders(getSamoBearerToken(authentication)),
        method: 'GET',
        signal: options?.signal,
    });
};

export const samoSend = async <T>(
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    method: 'DELETE' | 'PATCH' | 'POST' | 'PUT',
    path: string,
    body?: unknown,
    options?: { query?: SamoRequestOptions['query']; signal?: AbortSignal },
): Promise<T> => {
    return requestJson<T>(fetcher, getSamoApiUrl(authentication, path, options?.query), {
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers: jsonHeaders(getSamoBearerToken(authentication)),
        method,
        signal: options?.signal,
    });
};

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export const authenticateSamo = async ({
    deviceLabel = 'Samo client',
    fetch: fetcher,
    password,
    url,
    username,
}: {
    deviceLabel?: string;
    fetch?: SamoFetch;
    password: string;
    url: string;
    username: string;
}): Promise<ServerAuthenticationResult> => {
    const request = getFetch(fetcher);
    const baseUrl = normalizeBaseUrl(url);

    // Login FIRST. The setup-status probe used to be a mandatory serial
    // round-trip in front of every login; on a slow or warming connection that
    // doubled the time-to-fail for zero happy-path value. It is now consulted
    // only when login fails, purely to upgrade the error message for the one
    // genuine "server not set up yet" case.
    let login: SamoLoginResponse;
    try {
        login = await requestJson<SamoLoginResponse>(
            request,
            `${baseUrl}/api/v1/auth/login`,
            {
                body: JSON.stringify({ password, username }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            },
        );
    } catch (error) {
        const setup = await getSamoSetupStatus(request, baseUrl).catch(() => undefined);
        if (setup?.needsSetup) {
            throw new Error(
                `Samo Server setup is not finished yet. Open ${baseUrl}/setup first.`,
            );
        }
        throw error;
    }
    const loginToken = login.token;

    if (!loginToken) {
        throw new Error('Samo Server did not return an auth token');
    }

    let token = loginToken;
    try {
        const deviceToken = await requestJson<SamoDeviceTokenResponse>(
            request,
            `${baseUrl}/api/v1/users/me/tokens`,
            {
                body: JSON.stringify({ label: deviceLabel }),
                headers: jsonHeaders(loginToken),
                method: 'POST',
            },
        );
        if (deviceToken.secret) {
            token = deviceToken.secret;
        }
    } catch (error) {
        // If the server's database is temporarily locked (e.g. during initial scan),
        // writing a new device token will fail. We can safely fall back to the
        // loginToken which is already valid, so the user isn't blocked.
        // eslint-disable-next-line no-console -- deliberate auth fallback diagnostic
        console.warn('Failed to mint device token, falling back to login token', error);
    }
    const resolvedUsername = login.user?.username ?? username;
    const capabilities = getSamoCapabilities();

    return {
        capabilities,
        credential: token,
        details: `Samo Server: ${formatServerCapabilities(capabilities)}`,
        isAdmin: login.user?.role === 'admin',
        kind: 'samo-token' as ServerAuthenticationKind,
        serverId: login.serverId,
        title: `Samo: ${login.user?.displayName ?? resolvedUsername}`,
        type: ServerType.SAMO,
        url: baseUrl,
        userId: login.user?.id,
        username: resolvedUsername,
    };
};

// ---------------------------------------------------------------------------
// Catalog overview
// ---------------------------------------------------------------------------

export const getSamoCatalogOverview = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    signal?: AbortSignal,
): Promise<SamoCatalogOverview> => {
    return samoGet<SamoCatalogOverview>(fetcher, authentication, '/catalog/overview', {
        signal,
    });
};

export interface SamoRecentlyAddedEntry {
    addedAt?: string;
    id: string;
    kind: 'audiobook' | 'music-album' | 'podcast';
    subtitle?: string;
    title: string;
}

export interface SamoRecentlyAddedResults {
    items: SamoRecentlyAddedEntry[];
    limit: number;
    offset: number;
    total: number;
}

export const listSamoCatalogRecentlyAdded = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoRecentlyAddedResults> => {
    return samoGet<SamoRecentlyAddedResults>(
        fetcher,
        authentication,
        '/catalog/recently-added',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

// ---------------------------------------------------------------------------
// Delta sync
// ---------------------------------------------------------------------------

// SamoSyncManifest is the server's deletion-reconciliation payload for
// incremental syncs: the full set of current entity IDs per type (playlists
// scoped to the caller) plus the server clock. A client stores serverTime and
// replays it as updatedSince on the next sync; any locally-mirrored row whose
// ID is absent from these sets was deleted server-side.
export interface SamoSyncManifest {
    serverTime: string;
    counts: Record<string, number>;
    ids: {
        artists: string[];
        albums: string[];
        tracks: string[];
        playlists: string[];
        audiobooks: string[];
        podcasts: string[];
        episodes: string[];
    };
}

export const fetchSamoSyncManifest = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    signal?: AbortSignal,
): Promise<SamoSyncManifest> => {
    return samoGet<SamoSyncManifest>(fetcher, authentication, '/catalog/sync/manifest', { signal });
};

// ---------------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------------

export interface SamoListQuery {
    direction?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
    sort?: 'az' | 'lastPlayed' | 'playCount' | 'recent' | 'release';
    // When set, the server returns only entities whose updatedAt is at or after
    // this point — the incremental ("delta") sync watermark. Pass the RFC3339
    // string from SamoSyncManifest.serverTime, or unix milliseconds.
    updatedSince?: number | string;
}

const listQuery = (input?: SamoListQuery) => {
    const query: Record<string, number | string | undefined> = {};

    if (input?.limit !== undefined) query.limit = input.limit;
    if (input?.offset !== undefined) query.offset = input.offset;
    if (input?.sort !== undefined) query.sort = input.sort;
    if (input?.direction !== undefined) query.direction = input.direction;
    if (input?.updatedSince !== undefined) query.updatedSince = input.updatedSince;

    return query;
};

export const listSamoMusicArtists = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoMusicArtist>> => {
    return samoGet<SamoPaginatedResponse<SamoMusicArtist>>(
        fetcher,
        authentication,
        '/music/artists',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const getSamoMusicArtist = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoMusicArtist> => {
    return samoGet<SamoMusicArtist>(fetcher, authentication, `/music/artists/${encodeSamoId(id)}`, {
        signal,
    });
};

export const listSamoMusicArtistAlbums = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoMusicAlbum>> => {
    return samoGet<SamoPaginatedResponse<SamoMusicAlbum>>(
        fetcher,
        authentication,
        `/music/artists/${encodeSamoId(id)}/albums`,
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const listSamoMusicArtistTopTracks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoMusicTrack>> => {
    return samoGet<SamoPaginatedResponse<SamoMusicTrack>>(
        fetcher,
        authentication,
        `/music/artists/${encodeSamoId(id)}/top-tracks`,
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const listSamoMusicArtistAppearsOn = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoMusicAlbum>> => {
    return samoGet<SamoPaginatedResponse<SamoMusicAlbum>>(
        fetcher,
        authentication,
        `/music/artists/${encodeSamoId(id)}/appears-on`,
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

// ---------------------------------------------------------------------------
// Podcast prewarm + enclosure cache controls (admin-configurable)
// ---------------------------------------------------------------------------

export interface SamoPodcastPrewarm {
    /** Effective newest-N episodes kept warm per show. */
    count: number;
    /** The server's env default, for "reset to default" affordances. */
    default: number;
}

export interface SamoPodcastCacheSummary {
    enabled: boolean;
    episodeCount: number;
    totalBytes: number;
    /** Effective cache size cap in bytes. */
    maxBytes: number;
}

export const getSamoPodcastPrewarm = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    signal?: AbortSignal,
): Promise<SamoPodcastPrewarm> =>
    samoGet<SamoPodcastPrewarm>(fetcher, authentication, '/podcasts/prewarm', { signal });

export const setSamoPodcastPrewarm = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    count: number,
): Promise<{ count: number }> =>
    samoSend<{ count: number }>(fetcher, authentication, 'PUT', '/podcasts/prewarm', { count });

export const getSamoPodcastCacheSummary = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    signal?: AbortSignal,
): Promise<SamoPodcastCacheSummary> =>
    samoGet<SamoPodcastCacheSummary>(fetcher, authentication, '/podcasts/cache', { signal });

export const clearSamoPodcastCache = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
): Promise<void> => {
    await samoSend<unknown>(fetcher, authentication, 'DELETE', '/podcasts/cache');
};

export const getSamoPodcastCacheLimit = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    signal?: AbortSignal,
): Promise<{ maxBytes: number }> =>
    samoGet<{ maxBytes: number }>(fetcher, authentication, '/podcasts/cache/limit', { signal });

export const setSamoPodcastCacheLimit = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    maxBytes: number,
): Promise<{ maxBytes: number }> =>
    samoSend<{ maxBytes: number }>(fetcher, authentication, 'PUT', '/podcasts/cache/limit', {
        maxBytes,
    });

export const listSamoMusicAlbums = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoMusicAlbum>> => {
    return samoGet<SamoPaginatedResponse<SamoMusicAlbum>>(
        fetcher,
        authentication,
        '/music/albums',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const getSamoMusicAlbum = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoMusicAlbum> => {
    return samoGet<SamoMusicAlbum>(fetcher, authentication, `/music/albums/${encodeSamoId(id)}`, { signal });
};

export const listSamoMusicAlbumTracks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoMusicTrack>> => {
    return samoGet<SamoPaginatedResponse<SamoMusicTrack>>(
        fetcher,
        authentication,
        `/music/albums/${encodeSamoId(id)}/tracks`,
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const listSamoMusicTracks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoMusicTrack>> => {
    return samoGet<SamoPaginatedResponse<SamoMusicTrack>>(
        fetcher,
        authentication,
        '/music/tracks',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const getSamoMusicTrack = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoMusicTrack> => {
    return samoGet<SamoMusicTrack>(fetcher, authentication, `/music/tracks/${encodeSamoId(id)}`, { signal });
};

export const listSamoMusicGenres = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    signal?: AbortSignal,
): Promise<SamoPaginatedResponse<{ id?: string; name?: string }>> => {
    return samoGet<SamoPaginatedResponse<{ id?: string; name?: string }>>(
        fetcher,
        authentication,
        '/music/genres',
        { signal },
    );
};

export const listSamoMusicPlaylists = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoMusicPlaylist>> => {
    return samoGet<SamoPaginatedResponse<SamoMusicPlaylist>>(
        fetcher,
        authentication,
        '/music/playlists',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const getSamoMusicPlaylist = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoMusicPlaylist> => {
    return samoGet<SamoMusicPlaylist>(fetcher, authentication, `/music/playlists/${id}`, {
        signal,
    });
};

/**
 * Finds the server-managed "Explo" playlist among a user's playlists, or
 * undefined if it doesn't exist yet (no drops processed) or the feature
 * isn't configured on this server. Shared by both clients' home screens so
 * "how do we recognize the Explo playlist" lives in exactly one place.
 */
/** One track's outcome from a keep request; see keepSamoExploTracks. */
export interface SamoExploKeepResult {
    error?: string;
    /**
     * Catalog id of the COPY in the library, which is a different track from
     * the drop-folder original. Anything that has to outlive the week — adding
     * the song to a playlist above all — must reference this one: the
     * original's file is deleted by the next rotation and a playlist pointing
     * at it silently loses the entry. Absent if the scan had not caught up yet.
     */
    libraryTrackId?: string;
    /**
     * The copy was unnecessary because the file was already at the destination.
     * A success, not a no-op: libraryTrackId is still populated, so adding the
     * song to a playlist uses the existing library track.
     */
    alreadyInLibrary?: boolean;
    path?: string;
    title?: string;
    trackId: string;
}

export interface SamoExploKeepResponse {
    alreadyInLibrary: number;
    failed: number;
    kept: number;
    results: SamoExploKeepResult[];
}

/**
 * Copies explo drops into the music library proper.
 *
 * The drop folder is emptied by every weekly rotation, so this is how a track
 * survives the week. The server copies rather than moves — the original stays
 * in Explore until rotation collects it — and writes samo's identified
 * metadata into the copy, so the kept file is correct in any player rather
 * than carrying whatever the original sharer typed.
 *
 * Admin only, and per-track: one unkeepable track does not fail the batch.
 */
export const keepSamoExploTracks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    trackIds: string[],
): Promise<SamoExploKeepResponse> => {
    return samoSend<SamoExploKeepResponse>(fetcher, authentication, 'POST', '/explo/keep', {
        trackIds,
    });
};

/** How many playlists one scan page asks for while hunting the system playlist. */
const EXPLO_SCAN_PAGE_SIZE = 200;

/** Runaway guard for a server that never returns a short page. Not a product limit. */
const EXPLO_SCAN_CEILING = 10_000;

/**
 * The server-managed "Explo" playlist (the weekly untagged-drop auto-playlist),
 * or undefined when the server has not built one yet.
 *
 * Recognized by the `system` flag, never by name — a user's own playlist called
 * "Explo" is not this one, and opening the wrong playlist from the home card is
 * worse than showing no card.
 *
 * This PAGES rather than reading one capped page. `/music/playlists` has no
 * `system` filter and returns the catalog's own slice order, so the system
 * playlist sits wherever it happens to sit; the old single `limit: 100` read
 * found it only while the account had fewer than 100 playlists, and past that
 * Explore silently vanished from every home screen at once. There is no error
 * in that failure and no empty state — the section just stops existing — which
 * is precisely why it went unnoticed. The walk stops at the first match, so the
 * common case is still exactly one request.
 */
export const findSamoExploPlaylist = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    signal?: AbortSignal,
): Promise<SamoMusicPlaylist | undefined> => {
    for (let offset = 0; offset < EXPLO_SCAN_CEILING; offset += EXPLO_SCAN_PAGE_SIZE) {
        const page = await listSamoMusicPlaylists(fetcher, authentication, {
            limit: EXPLO_SCAN_PAGE_SIZE,
            offset,
            signal,
        });
        const items = samoItemsOf(page);

        const found = items.find((playlist) => playlist.system);
        if (found) return found;

        // A short page is the end of the list whatever the envelope claims.
        if (items.length < EXPLO_SCAN_PAGE_SIZE) return undefined;

        const total = samoTotalOf(page);
        if (total !== undefined && offset + items.length >= total) return undefined;
    }

    return undefined;
};

export const listSamoMusicPlaylistTracks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoMusicTrack>> => {
    return samoGet<SamoPaginatedResponse<SamoMusicTrack>>(
        fetcher,
        authentication,
        `/music/playlists/${id}/tracks`,
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const createSamoMusicPlaylist = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    body: {
        description?: string;
        name: string;
        public?: boolean;
        trackIds?: string[];
    },
): Promise<SamoMusicPlaylist> => {
    return samoSend<SamoMusicPlaylist>(fetcher, authentication, 'POST', '/music/playlists', body);
};

export const updateSamoMusicPlaylist = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    body: {
        description?: string;
        name?: string;
        public?: boolean;
        trackIds?: string[];
    },
): Promise<SamoMusicPlaylist> => {
    return samoSend<SamoMusicPlaylist>(
        fetcher,
        authentication,
        'PATCH',
        `/music/playlists/${id}`,
        body,
    );
};

export const deleteSamoMusicPlaylist = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
): Promise<void> => {
    await samoSend<unknown>(fetcher, authentication, 'DELETE', `/music/playlists/${id}`);
};

export const uploadSamoMusicPlaylistCover = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    playlistId: string,
    file: Blob,
    filename = 'cover.jpg',
): Promise<SamoMusicPlaylist> => {
    const form = new FormData();
    form.append('cover', file, filename);
    const url = getSamoApiUrl(
        authentication,
        `/music/playlists/${encodeURIComponent(playlistId)}/cover`,
    );
    const response = await fetcher(url, {
        body: form as unknown as string,
        headers: authHeaders(getSamoBearerToken(authentication)),
        method: 'POST',
    });

    if (!response.ok) {
        const message =
            typeof response.text === 'function'
                ? await response.text().catch(() => '')
                : '';
        throw new Error(
            message.trim() || `Playlist cover upload failed (${response.status})`,
        );
    }

    return response.json() as Promise<SamoMusicPlaylist>;
};

export const searchSamoMusic = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    query: string,
    options?: { limit?: number; signal?: AbortSignal },
): Promise<SamoMusicSearchResponse> => {
    return samoGet<SamoMusicSearchResponse>(fetcher, authentication, '/music/search', {
        query: {
            limit: options?.limit,
            q: query,
        },
        signal: options?.signal,
    });
};

export type SamoMusicBrowseKind =
    | 'discovery'
    | 'favorites'
    | 'recently-added'
    | 'recently-played'
    | 'starred'
    | 'unplayed';

export const getSamoMusicBrowse = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    kind: SamoMusicBrowseKind,
    options?: { limit?: number; offset?: number; signal?: AbortSignal },
): Promise<SamoMusicBrowseResponse> => {
    return samoGet<SamoMusicBrowseResponse>(
        fetcher,
        authentication,
        `/music/browse/${kind}`,
        {
            query: { limit: options?.limit, offset: options?.offset },
            signal: options?.signal,
        },
    );
};

// ---------------------------------------------------------------------------
// Audiobooks
// ---------------------------------------------------------------------------

export const listSamoAudiobooks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery & { libraryId?: string },
): Promise<SamoPaginatedResponse<SamoAudiobook>> => {
    return samoGet<SamoPaginatedResponse<SamoAudiobook>>(
        fetcher,
        authentication,
        '/audiobooks',
        {
            query: {
                ...listQuery(input),
                libraryId: input?.libraryId,
            },
            signal: input?.signal,
        },
    );
};

export const getSamoAudiobook = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoAudiobook> => {
    return samoGet<SamoAudiobook>(fetcher, authentication, `/audiobooks/${id}`, { signal });
};

export const searchSamoAudiobooks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    query: string,
    options?: { limit?: number; signal?: AbortSignal },
): Promise<SamoPaginatedResponse<SamoAudiobook>> => {
    return samoGet<SamoPaginatedResponse<SamoAudiobook>>(
        fetcher,
        authentication,
        '/audiobooks/search',
        {
            query: { limit: options?.limit, q: query },
            signal: options?.signal,
        },
    );
};

export const listSamoContributors = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoContributor>> => {
    return samoGet<SamoPaginatedResponse<SamoContributor>>(
        fetcher,
        authentication,
        '/contributors',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const getSamoContributor = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    options?: { include?: 'audiobooks'; limit?: number; signal?: AbortSignal },
): Promise<SamoContributor & { audiobooks?: SamoPaginatedResponse<SamoAudiobook> }> => {
    return samoGet(fetcher, authentication, `/contributors/${id}`, {
        query: {
            include: options?.include,
            limit: options?.limit,
        },
        signal: options?.signal,
    });
};

export const listSamoSeries = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoSeries>> => {
    return samoGet<SamoPaginatedResponse<SamoSeries>>(fetcher, authentication, '/series', {
        query: listQuery(input),
        signal: input?.signal,
    });
};

export const getSamoSeries = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    options?: { include?: 'audiobooks'; limit?: number; signal?: AbortSignal },
): Promise<SamoSeries & { audiobooks?: SamoPaginatedResponse<SamoAudiobook> }> => {
    return samoGet(fetcher, authentication, `/series/${id}`, {
        query: { include: options?.include, limit: options?.limit },
        signal: options?.signal,
    });
};

export const listSamoAudiobookBookmarks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    audiobookId: string,
    signal?: AbortSignal,
): Promise<SamoPaginatedResponse<SamoBookmark>> => {
    return samoGet<SamoPaginatedResponse<SamoBookmark>>(
        fetcher,
        authentication,
        `/audiobooks/${audiobookId}/bookmarks`,
        { signal },
    );
};

export const createSamoAudiobookBookmark = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    audiobookId: string,
    body: { chapterId?: string; note?: string; positionSeconds?: number; title?: string },
): Promise<SamoBookmark> => {
    return samoSend<SamoBookmark>(
        fetcher,
        authentication,
        'POST',
        `/audiobooks/${audiobookId}/bookmarks`,
        body,
    );
};

export const listSamoBookmarks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoBookmark>> => {
    return samoGet<SamoPaginatedResponse<SamoBookmark>>(fetcher, authentication, '/bookmarks', {
        query: listQuery(input),
        signal: input?.signal,
    });
};

export const updateSamoBookmark = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    body: { note?: string; positionSeconds?: number; title?: string },
): Promise<SamoBookmark> => {
    return samoSend<SamoBookmark>(fetcher, authentication, 'PATCH', `/bookmarks/${id}`, body);
};

export const deleteSamoBookmark = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
): Promise<void> => {
    await samoSend(fetcher, authentication, 'DELETE', `/bookmarks/${id}`);
};

export const listSamoCollections = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoCollection>> => {
    return samoGet<SamoPaginatedResponse<SamoCollection>>(
        fetcher,
        authentication,
        '/collections',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const getSamoCollection = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoCollection> => {
    return samoGet<SamoCollection>(fetcher, authentication, `/collections/${id}`, { signal });
};

export const listSamoAudiobookSessions = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    audiobookId: string,
    options?: { limit?: number; signal?: AbortSignal },
): Promise<SamoPaginatedResponse<SamoListeningSession>> => {
    return samoGet<SamoPaginatedResponse<SamoListeningSession>>(
        fetcher,
        authentication,
        `/audiobooks/${audiobookId}/sessions`,
        {
            query: { limit: options?.limit },
            signal: options?.signal,
        },
    );
};

export const listSamoListeningSessions = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoListeningSession>> => {
    return samoGet<SamoPaginatedResponse<SamoListeningSession>>(
        fetcher,
        authentication,
        '/listening-sessions',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

// ---------------------------------------------------------------------------
// Podcasts
// ---------------------------------------------------------------------------

export const listSamoPodcasts = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoPodcast>> => {
    return samoGet<SamoPaginatedResponse<SamoPodcast>>(fetcher, authentication, '/podcasts', {
        query: listQuery(input),
        signal: input?.signal,
    });
};

export const getSamoPodcastShow = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoPodcast> => {
    return samoGet<SamoPodcast>(fetcher, authentication, `/podcasts/shows/${id}`, { signal });
};

export const listSamoPodcastEpisodes = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    showId: string,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoPodcastEpisode>> => {
    return samoGet<SamoPaginatedResponse<SamoPodcastEpisode>>(
        fetcher,
        authentication,
        `/podcasts/shows/${showId}/episodes`,
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const listSamoAllPodcastEpisodes = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoPodcastEpisode>> => {
    return samoGet<SamoPaginatedResponse<SamoPodcastEpisode>>(
        fetcher,
        authentication,
        '/podcasts/episodes',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const getSamoPodcastEpisode = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoPodcastEpisode> => {
    return samoGet<SamoPodcastEpisode>(
        fetcher,
        authentication,
        `/podcasts/episodes/${id}`,
        { signal },
    );
};

export const searchSamoPodcasts = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    query: string,
    options?: { limit?: number; signal?: AbortSignal },
): Promise<SamoPaginatedResponse<SamoPodcast>> => {
    return samoGet<SamoPaginatedResponse<SamoPodcast>>(
        fetcher,
        authentication,
        '/podcasts/search',
        {
            query: { limit: options?.limit, q: query },
            signal: options?.signal,
        },
    );
};

export const listSamoPodcastFeeds = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoPodcastFeed>> => {
    return samoGet<SamoPaginatedResponse<SamoPodcastFeed>>(
        fetcher,
        authentication,
        '/podcasts/feeds',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const createSamoPodcastFeed = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    body: {
        autoDownloadEnabled?: boolean;
        podcastId?: string;
        title?: string;
        url: string;
    },
): Promise<SamoPodcastFeed> => {
    return samoSend<SamoPodcastFeed>(fetcher, authentication, 'POST', '/podcasts/feeds', body);
};

/** Attach an RSS feed to an existing file-backed podcast show (hybrid library). */
export const attachSamoPodcastShowFeed = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    podcastId: string,
    body: {
        autoDownloadEnabled?: boolean;
        title?: string;
        url: string;
    },
): Promise<SamoPodcastFeed> => {
    return samoSend<SamoPodcastFeed>(
        fetcher,
        authentication,
        'POST',
        `/podcasts/shows/${encodeURIComponent(podcastId)}/feeds`,
        body,
    );
};

// ---------------------------------------------------------------------------
// Internet + programmed radio
// ---------------------------------------------------------------------------

export const listSamoInternetRadioStations = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoInternetRadioStation>> => {
    return samoGet<SamoPaginatedResponse<SamoInternetRadioStation>>(
        fetcher,
        authentication,
        '/internet-radio/stations',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

export const getSamoInternetRadioStation = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoInternetRadioStation> => {
    return samoGet<SamoInternetRadioStation>(
        fetcher,
        authentication,
        `/internet-radio/stations/${encodeURIComponent(id)}`,
        { signal },
    );
};

export const createSamoInternetRadioStation = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    body: {
        homepageUrl?: string;
        imageUrl?: string;
        name: string;
        streamUrl: string;
    },
): Promise<SamoInternetRadioStation> => {
    return samoSend<SamoInternetRadioStation>(
        fetcher,
        authentication,
        'POST',
        '/internet-radio/stations',
        {
            homepageUrl: body.homepageUrl,
            imageUrl: body.imageUrl,
            name: body.name,
            streamUrl: body.streamUrl,
        },
    );
};

export const uploadSamoInternetRadioCover = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    stationId: string,
    file: Blob,
    filename = 'cover.jpg',
): Promise<SamoInternetRadioStation> => {
    const form = new FormData();
    form.append('cover', file, filename);
    const url = getSamoApiUrl(
        authentication,
        `/internet-radio/stations/${encodeURIComponent(stationId)}/cover`,
    );
    const response = await fetcher(url, {
        body: form as unknown as string,
        headers: authHeaders(getSamoBearerToken(authentication)),
        method: 'POST',
    });

    if (!response.ok) {
        const message =
            typeof response.text === 'function'
                ? await response.text().catch(() => '')
                : '';
        throw new Error(
            message.trim() || `Thumbnail upload failed (${response.status})`,
        );
    }

    return response.json() as Promise<SamoInternetRadioStation>;
};

export const listSamoProgrammedRadioStations = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoProgrammedRadioStation>> => {
    return samoGet<SamoPaginatedResponse<SamoProgrammedRadioStation>>(
        fetcher,
        authentication,
        '/radio/stations',
        {
            query: listQuery(input),
            signal: input?.signal,
        },
    );
};

// ---------------------------------------------------------------------------
// Playback state writes (PATCH/PUT)
// ---------------------------------------------------------------------------

export type SamoPlaybackTargetKind =
    | 'audiobook'
    | 'music-album'
    | 'music-artist'
    | 'music-playlist'
    | 'music-track'
    | 'podcast'
    | 'podcast-episode';

export interface SamoPlaybackPatch {
    completed?: boolean;
    favorite?: boolean;
    incrementPlayCount?: boolean;
    incrementSkipCount?: boolean;
    progressSeconds?: number;
    rating?: number;
    starred?: boolean;
    touchLastPlayedAt?: boolean;
    touchLastPositionAt?: boolean;
}

/** Samo podcast/audiobook rows use `progress`; music entities use `playback`. */
export const samoUserPlaybackState = (
    entity: { playback?: SamoPlaybackState; progress?: SamoPlaybackState } | undefined,
): SamoPlaybackState | undefined => entity?.progress ?? entity?.playback;

export const getSamoPlayback = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    kind: SamoPlaybackTargetKind,
    id: string,
    signal?: AbortSignal,
): Promise<SamoPlaybackState> => {
    return samoGet<SamoPlaybackState>(fetcher, authentication, `/playback/${kind}/${id}`, {
        signal,
    });
};

export const patchSamoPlayback = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    kind: SamoPlaybackTargetKind,
    id: string,
    body: SamoPlaybackPatch,
): Promise<SamoPlaybackState> => {
    return samoSend<SamoPlaybackState>(
        fetcher,
        authentication,
        'PATCH',
        `/playback/${kind}/${id}`,
        body,
    );
};

export const putSamoPlayback = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    kind: SamoPlaybackTargetKind,
    id: string,
    body: SamoPlaybackPatch,
): Promise<SamoPlaybackState> => {
    return samoSend<SamoPlaybackState>(
        fetcher,
        authentication,
        'PUT',
        `/playback/${kind}/${id}`,
        body,
    );
};

// ---------------------------------------------------------------------------
// Stream + cover URL builders
// ---------------------------------------------------------------------------

export interface SamoStreamUrlOptions {
    disc?: number;
    mediaFileId?: string;
    offsetSeconds?: number;
    progressSeconds?: number;
    streamToken?: string;
}

/** Stream/media URL. Params keep their historical order (disc, mediaFileId,
 *  offsetSeconds, progressSeconds, stream_token) — these strings are compared
 *  and cached verbatim, so the order is part of the contract. */
const buildStreamUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    path: string,
    options?: SamoStreamUrlOptions,
) => {
    const query: Record<string, number | string | undefined> = {};
    if (options?.disc !== undefined) query.disc = options.disc;
    if (options?.mediaFileId) query.mediaFileId = options.mediaFileId;
    if (options?.offsetSeconds !== undefined) query.offsetSeconds = options.offsetSeconds;
    if (options?.progressSeconds !== undefined) query.progressSeconds = options.progressSeconds;
    if (options?.streamToken) query.stream_token = options.streamToken;

    return getSamoApiUrl(authentication, path, query);
};

export const getSamoMusicTrackStreamUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    trackId: string,
    options?: SamoStreamUrlOptions,
) => buildStreamUrl(authentication, `/music/tracks/${encodeSamoId(trackId)}/stream`, options);

export const getSamoAudiobookStreamUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    audiobookId: string,
    options?: SamoStreamUrlOptions,
) => buildStreamUrl(authentication, `/audiobooks/${audiobookId}/stream`, options);

export const getSamoPodcastEpisodeStreamUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    episodeId: string,
    options?: SamoStreamUrlOptions,
) => buildStreamUrl(authentication, `/podcasts/episodes/${episodeId}/stream`, options);

export const getSamoAudiobookCoverUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    audiobookId: string,
    streamToken?: string,
) => buildStreamUrl(authentication, `/audiobooks/${audiobookId}/cover`, { streamToken });

export const getSamoPodcastCoverUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    showId: string,
    streamToken?: string,
) => buildStreamUrl(authentication, `/podcasts/shows/${showId}/cover`, { streamToken });

export const getSamoMusicAlbumCoverUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    albumId: string,
    streamToken?: string,
) => buildStreamUrl(authentication, `/music/albums/${encodeSamoId(albumId)}/cover`, { streamToken });

/**
 * The playlist cover route, optionally stamped with a version.
 *
 * Built through `getSamoApiUrl` rather than `buildStreamUrl` because the stamp
 * is peculiar to this one route — no other media URL has bytes that change
 * behind a fixed address — and does not belong in the shared stream options.
 */
export const getSamoMusicPlaylistCoverUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    playlistId: string,
    streamToken?: string,
    version?: string,
) =>
    getSamoApiUrl(authentication, `/music/playlists/${encodeSamoId(playlistId)}/cover`, {
        stream_token: streamToken,
        v: version,
    });

export const getSamoMusicArtistCoverUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    artistId: string,
    streamToken?: string,
) => buildStreamUrl(authentication, `/music/artists/${encodeSamoId(artistId)}/cover`, { streamToken });

/**
 * Stream a catalog image by the `id` from metadata `images[]` — embedded art
 * (`cover_*`), sidecars (`image_*`), etc. This is the direct path from scan
 * metadata to bytes; entity cover routes are not involved.
 */
export const getSamoMetadataImageUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    imageId: string,
    streamToken?: string,
) => buildStreamUrl(authentication, `/media/images/${encodeSamoId(imageId)}/image`, { streamToken });

/** Stream bytes for an extracted `cover_*` id from `/api/v1/media/covers/{id}/image`. */
export const getSamoExtractedCoverUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    coverId: string,
    streamToken?: string,
) => buildStreamUrl(authentication, `/media/covers/${encodeSamoId(coverId)}/image`, { streamToken });

/**
 * @deprecated No standalone route — use {@link getSamoMetadataImageUrl}.
 */
export const getSamoMediaImageUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    imageId: string,
    streamToken?: string,
) => getSamoMetadataImageUrl(authentication, imageId, streamToken);

// ---------------------------------------------------------------------------
// Image resolution (picks the best image from an item)
// ---------------------------------------------------------------------------

const isAbsoluteUrl = (value: string | undefined) =>
    typeof value === 'string' && /^https?:\/\//i.test(value);

const pickImage = (images?: SamoImage[]): SamoImage | undefined => {
    if (!images || images.length === 0) return undefined;
    return images.find((image) => image.id || image.url || image.sourceUrl) ?? images[0];
};

/** Pick the metadata image record the server attached at scan time. */
export const pickSamoImage = pickImage;

export const pickSamoImageId = (images?: SamoImage[] | undefined): string | undefined =>
    pickImage(images)?.id;

/** Metadata image ids the `/media/images/{id}/image` route can serve. */
export const pickSamoCatalogImageId = (imageId?: string): string | undefined => {
    const id = imageId?.trim();
    if (!id) {
        return undefined;
    }
    if (id.startsWith('cover_') || id.startsWith('image_')) {
        return id;
    }
    return undefined;
};

/** Resolve artwork image id from primary metadata, then optional track fallbacks. */
export const resolveSamoArtworkImageId = (
    images?: SamoImage[],
    fallbackImageSources?: Array<{ images?: SamoImage[] }>,
): string | undefined => {
    const primary = pickSamoImageId(images);
    if (primary) {
        return primary;
    }
    for (const source of fallbackImageSources ?? []) {
        const id = pickSamoImageId(source.images);
        if (id) {
            return id;
        }
    }
    return undefined;
};

/**
 * Resolve a single image record to a URL the client can render. Picks the
 * absolute URL when the server already shipped one (remote provider),
 * otherwise routes through the right `/api/v1/media/...` endpoint based
 * on the ID prefix (`cover_*` extracted, `image_*` raw catalog image).
 */
const resolveSamoImageUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    image: SamoImage | undefined,
    streamToken?: string,
): string | undefined => {
    if (!image) return undefined;
    if (isAbsoluteUrl(image.url)) return image.url;
    if (isAbsoluteUrl(image.sourceUrl)) return image.sourceUrl;
    if (image.id) {
        return getSamoMetadataImageUrl(authentication, image.id, streamToken);
    }
    return undefined;
};

/**
 * Re-home a Samo media URL onto the connected origin, and attach a stream token
 * IF one was supplied.
 *
 * These are two separate jobs and only one of them is optional. Re-homing is
 * always required — list responses ship absolute image URLs pointed at whatever
 * hostname or loopback address the server saw at scan time, and a device that
 * connected over a tunnel or a different LAN address cannot reach those. The
 * stream token is only needed by consumers that cannot send an Authorization
 * header.
 *
 * This used to bail out at the top whenever `streamToken` was undefined, which
 * silently skipped the re-homing too. So exactly when no token was cached — at
 * boot before the first mint, during the five-minute refresh lead window, or
 * after a failed mint — every scan-time URL went to the image loader
 * unmodified, pointed at a host the device has no route to. That is a blank
 * cover with no error worth the name, and it looked like a caching problem.
 *
 * An existing `stream_token` is stripped when we are not setting one, so the
 * result is determined by what the CALLER asked for rather than by whatever
 * happened to be embedded in the stored URL.
 */
const appendSamoStreamTokenToUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    url: string,
    streamToken?: string,
): string => {
    // Hot path: the URL is already homed on the connected origin AND already in
    // the token state the caller asked for, so the parse-and-reserialize below
    // would hand back the identical string. Home finalizes hundreds of artwork
    // URLs per derive and each `new URL()` measured ~0.11ms on device — this
    // early-out is worth real frames.
    try {
        const origin = getSamoApiOrigin(normalizeBaseUrl(authentication.url));
        if (
            url.startsWith(origin) &&
            (streamToken
                ? url.includes(`stream_token=${encodeQueryComponent(streamToken)}`)
                : !url.includes('stream_token='))
        ) {
            return url;
        }
    } catch {
        // Unparseable base — fall through to the general path below.
    }

    try {
        const parsed = new URL(url);
        const base = new URL(authentication.url);

        // List responses can ship absolute image URLs pointed at the server's
        // loopback/hostname from scan time. Rewrite API paths to the origin
        // the client actually connected with so stream tokens attach and the
        // device can reach the host.
        //
        // Rebuild from `base.origin` rather than assigning `.protocol`/`.host`:
        // the host setter only replaces the port when the value it is given
        // carries one, so re-homing `http://10.0.0.5:6969/api/v1/…` onto an
        // `https://host` base used to leave the scan-time PORT in place and
        // emit `https://host:6969/…` — an address the client can't reach.
        const target =
            parsed.origin === base.origin
                ? parsed
                : parsed.pathname.includes('/api/v1/')
                  ? new URL(`${base.origin}${parsed.pathname}${parsed.search}${parsed.hash}`)
                  : null;
        if (!target) {
            // Someone else's host, and not an API path we own — leave it alone.
            return url;
        }

        if (streamToken) {
            target.searchParams.set('stream_token', streamToken);
        } else {
            target.searchParams.delete('stream_token');
        }
        return target.toString();
    } catch {
        return url;
    }
};

export const isSamoApiMediaUrl = (url: string): boolean => {
    try {
        return new URL(url).pathname.includes('/api/v1/');
    } catch {
        return false;
    }
};

/** Ensure Samo media/cover URLs include a stream token for unauthenticated image loaders. */
export const finalizeSamoMediaUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    url: string | undefined,
    streamToken?: string,
): string | undefined => {
    if (!url) {
        return undefined;
    }

    return appendSamoStreamTokenToUrl(authentication, url, streamToken);
};

const finalizeSamoCoverUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    url: string | undefined,
    streamToken?: string,
): string | undefined => finalizeSamoMediaUrl(authentication, url, streamToken);

export const resolveSamoAlbumArtworkUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    album: Pick<SamoMusicAlbum, 'images'> & { id?: string },
    streamToken?: string,
): string | undefined => {
    const fromImage = resolveSamoImageUrl(authentication, pickImage(album.images), streamToken);

    if (fromImage) {
        return finalizeSamoCoverUrl(authentication, fromImage, streamToken);
    }

    if (album.id) {
        return finalizeSamoCoverUrl(
            authentication,
            getSamoMusicAlbumCoverUrl(authentication, album.id, streamToken),
            streamToken,
        );
    }

    return undefined;
};

export const resolveSamoAudiobookArtworkUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    audiobook: Pick<SamoAudiobook, 'cover' | 'id'>,
    streamToken?: string,
): string | undefined => {
    const fromCover = resolveSamoImageUrl(authentication, audiobook.cover, streamToken);
    if (fromCover) return fromCover;
    return getSamoAudiobookCoverUrl(authentication, audiobook.id, streamToken);
};

export const resolveSamoPodcastArtworkUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    podcast: Pick<SamoPodcast, 'cover' | 'id'>,
    streamToken?: string,
): string | undefined => {
    const fromCover = resolveSamoImageUrl(authentication, podcast.cover, streamToken);
    if (fromCover) return fromCover;
    return getSamoPodcastCoverUrl(authentication, podcast.id, streamToken);
};

export const resolveSamoPodcastEpisodeArtworkUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    episode: Pick<SamoPodcastEpisode, 'images' | 'podcastId'>,
    streamToken?: string,
): string | undefined => {
    const fromImage = resolveSamoImageUrl(authentication, pickImage(episode.images), streamToken);
    if (fromImage) return fromImage;
    if (episode.podcastId) {
        return getSamoPodcastCoverUrl(authentication, episode.podcastId, streamToken);
    }
    return undefined;
};

export const resolveSamoArtistArtworkUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    artist: Pick<SamoMusicArtist, 'images'> & { id?: string },
    streamToken?: string,
): string | undefined => {
    const fromImage = resolveSamoImageUrl(authentication, pickImage(artist.images), streamToken);

    if (fromImage) {
        return finalizeSamoCoverUrl(authentication, fromImage, streamToken);
    }

    if (artist.id) {
        return finalizeSamoCoverUrl(
            authentication,
            getSamoMusicArtistCoverUrl(authentication, artist.id, streamToken),
            streamToken,
        );
    }

    return undefined;
};

/**
 * A playlist with more than one cover gets a server-composited 2x2 grid at
 * `/music/playlists/{id}/cover`. Callers that carry a *single* `imageId`
 * alongside the artwork URL (the mobile mappers) must drop it when this is
 * true, or the single first cover would override the grid. Single source of
 * truth for the grid threshold — keep it aligned with the resolver below.
 */
export const samoPlaylistHasCoverGrid = (
    playlist: Pick<SamoMusicPlaylist, 'images'>,
): boolean => (playlist.images?.length ?? 0) > 1;

/**
 * Cache-busting stamp for a playlist's cover URL.
 *
 * `/music/playlists/{id}/cover` is a FIXED address whose bytes are not fixed.
 * The server composites the 2x2 grid from the playlist's first four track
 * covers at request time, then serves it as
 * `Cache-Control: public, max-age=31536000, immutable`. So adding a track
 * changes the image behind a URL every client has been promised will never
 * change, and the old grid stays on screen until somebody clears an HTTP cache
 * by hand — which was the last thing on the desktop still relying on a
 * full cache wipe at every sync.
 *
 * `updatedAt` moves on every write to the playlist — tracks, order, name,
 * an uploaded cover — so folding it into the URL gives a changed playlist a new
 * address and leaves an unchanged one on the bytes it already has. A server too
 * old to send `updatedAt` behaves exactly as before: no stamp, no bust.
 */
export const samoPlaylistCoverVersion = (
    playlist: Pick<SamoMusicPlaylist, 'updatedAt'>,
): string | undefined => {
    const updatedAt = playlist.updatedAt?.trim();
    if (!updatedAt) {
        return undefined;
    }

    // Epoch millis: short, and identical for two spellings of the same instant,
    // so a server that changes how it formats timestamps does not invalidate
    // every cover at once. A value neither side can parse yields NO stamp
    // rather than a raw-string one — SamoCatalogConverters.toEpochMs is the
    // Kotlin twin of this and can only return null there, and the two must
    // produce the same URL for the same playlist or the mirror-backed surfaces
    // and the network-backed ones would cache the same grid twice.
    const parsed = Date.parse(updatedAt);
    return Number.isFinite(parsed) ? String(parsed) : undefined;
};

export const resolveSamoPlaylistArtworkUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    playlist: Pick<SamoMusicPlaylist, 'id' | 'images' | 'updatedAt'>,
    streamToken?: string,
): string | undefined => {
    const version = samoPlaylistCoverVersion(playlist);

    if (samoPlaylistHasCoverGrid(playlist) && playlist.id) {
        return finalizeSamoCoverUrl(
            authentication,
            getSamoMusicPlaylistCoverUrl(authentication, playlist.id, streamToken, version),
            streamToken,
        );
    }

    // No stamp on this branch: a metadata image id names its own bytes, so the
    // id changes when the art does and `immutable` is the truth there.
    const fromImage = resolveSamoImageUrl(authentication, pickImage(playlist.images), streamToken);
    if (fromImage) {
        return finalizeSamoCoverUrl(authentication, fromImage, streamToken);
    }
    if (playlist.id) {
        return finalizeSamoCoverUrl(
            authentication,
            getSamoMusicPlaylistCoverUrl(authentication, playlist.id, streamToken, version),
            streamToken,
        );
    }
    return undefined;
};

export const resolveSamoStationArtworkUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    station: Pick<SamoInternetRadioStation, 'coverId' | 'coverUrl' | 'imageUrl'>,
    streamToken?: string,
): string | undefined => {
    if (isAbsoluteUrl(station.imageUrl)) {
        return station.imageUrl;
    }

    if (station.coverUrl) {
        if (isAbsoluteUrl(station.coverUrl)) {
            return appendSamoStreamTokenToUrl(authentication, station.coverUrl, streamToken);
        }
    }

    if (station.coverId?.startsWith('cover_')) {
        return getSamoExtractedCoverUrl(authentication, station.coverId, streamToken);
    }

    return undefined;
};

// ---------------------------------------------------------------------------
// Items helper — paginated lists tolerate either {items:[...]} or raw [...]
// ---------------------------------------------------------------------------

export const samoItemsOf = <T>(value: SamoPaginatedResponse<T> | T[] | undefined): T[] => {
    if (Array.isArray(value)) return value;
    return value?.items ?? [];
};

/**
 * The `total` the server sent alongside a page, or `undefined` when the
 * response carried no count (a bare array, or an envelope that omitted it).
 *
 * `samoItemsOf` throws this field away, and for a long time it was the only
 * accessor anyone used — so every paginator in the codebase had to discover the
 * length of a list by fetching until it saw a short page. That is one wasted
 * round trip per list at best, and it pushed callers into inventing their own
 * guesses: playlist tracks fired a fixed window of four concurrent pages (three
 * of them wasted on any playlist under 1500 tracks) while podcast episodes went
 * strictly serial. Two different wrong answers to a question the server had
 * already answered in the first response.
 */
export const samoTotalOf = <T>(
    value: SamoPaginatedResponse<T> | T[] | undefined,
): number | undefined => {
    if (Array.isArray(value)) return value.length;
    const total = value?.total;
    return typeof total === 'number' && Number.isFinite(total) && total >= 0 ? total : undefined;
};
