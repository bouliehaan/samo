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
// Adapters that map other servers' shapes (Navidrome/Subsonic/ABS) live in
// the per-server modules; they do not reach into this file.

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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential'>,
) => {
    return authentication.ndCredential ?? authentication.credential;
};

const encodeSamoId = (id: string) => encodeURIComponent(id);

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
    const url = new URL(apiPath, `${baseUrl}/`);

    for (const [key, value] of Object.entries(query ?? {})) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
    }

    return url.toString();
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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

export const getSamoCapabilities = (): ServerCapabilities =>
    getDefaultServerCapabilities(ServerType.SAMO);

// ---------------------------------------------------------------------------
// Bearer-token-authenticated GET helper
// ---------------------------------------------------------------------------

interface SamoRequestOptions {
    query?: Record<string, boolean | number | string | undefined>;
    signal?: AbortSignal;
}

const samoGet = async <T>(
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    path: string,
    options?: SamoRequestOptions,
): Promise<T> => {
    return requestJson<T>(fetcher, getSamoApiUrl(authentication, path, options?.query), {
        headers: authHeaders(getSamoBearerToken(authentication)),
        method: 'GET',
        signal: options?.signal,
    });
};

const samoSend = async <T>(
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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

    const deviceToken = await requestJson<SamoDeviceTokenResponse>(
        request,
        `${baseUrl}/api/v1/users/me/tokens`,
        {
            body: JSON.stringify({ label: deviceLabel }),
            headers: jsonHeaders(loginToken),
            method: 'POST',
        },
    );
    const token = deviceToken.secret ?? loginToken;
    const resolvedUsername = login.user?.username ?? username;
    const capabilities = getSamoCapabilities();

    return {
        capabilities,
        credential: token,
        details: `Samo Server: ${formatServerCapabilities(capabilities)}`,
        isAdmin: login.user?.role === 'admin',
        kind: 'samo-token' as ServerAuthenticationKind,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoMusicArtist> => {
    return samoGet<SamoMusicArtist>(fetcher, authentication, `/music/artists/${encodeSamoId(id)}`, {
        signal,
    });
};

export const listSamoMusicArtistAlbums = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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

export const listSamoMusicAlbums = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoMusicAlbum> => {
    return samoGet<SamoMusicAlbum>(fetcher, authentication, `/music/albums/${encodeSamoId(id)}`, { signal });
};

export const listSamoMusicAlbumTracks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoMusicTrack> => {
    return samoGet<SamoMusicTrack>(fetcher, authentication, `/music/tracks/${encodeSamoId(id)}`, { signal });
};

export const listSamoMusicGenres = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoMusicPlaylist> => {
    return samoGet<SamoMusicPlaylist>(fetcher, authentication, `/music/playlists/${id}`, {
        signal,
    });
};

export const listSamoMusicPlaylistTracks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
): Promise<void> => {
    await samoSend<unknown>(fetcher, authentication, 'DELETE', `/music/playlists/${id}`);
};

export const uploadSamoMusicPlaylistCover = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoAudiobook> => {
    return samoGet<SamoAudiobook>(fetcher, authentication, `/audiobooks/${id}`, { signal });
};

export const searchSamoAudiobooks = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoSeries>> => {
    return samoGet<SamoPaginatedResponse<SamoSeries>>(fetcher, authentication, '/series', {
        query: listQuery(input),
        signal: input?.signal,
    });
};

export const getSamoSeries = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoBookmark>> => {
    return samoGet<SamoPaginatedResponse<SamoBookmark>>(fetcher, authentication, '/bookmarks', {
        query: listQuery(input),
        signal: input?.signal,
    });
};

export const updateSamoBookmark = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
    body: { note?: string; positionSeconds?: number; title?: string },
): Promise<SamoBookmark> => {
    return samoSend<SamoBookmark>(fetcher, authentication, 'PATCH', `/bookmarks/${id}`, body);
};

export const deleteSamoBookmark = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
): Promise<void> => {
    await samoSend(fetcher, authentication, 'DELETE', `/bookmarks/${id}`);
};

export const listSamoCollections = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoCollection> => {
    return samoGet<SamoCollection>(fetcher, authentication, `/collections/${id}`, { signal });
};

export const listSamoAudiobookSessions = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    input?: SamoListQuery,
): Promise<SamoPaginatedResponse<SamoPodcast>> => {
    return samoGet<SamoPaginatedResponse<SamoPodcast>>(fetcher, authentication, '/podcasts', {
        query: listQuery(input),
        signal: input?.signal,
    });
};

export const getSamoPodcastShow = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
    id: string,
    signal?: AbortSignal,
): Promise<SamoPodcast> => {
    return samoGet<SamoPodcast>(fetcher, authentication, `/podcasts/shows/${id}`, { signal });
};

export const listSamoPodcastEpisodes = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'ndCredential' | 'url'>,
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

const buildStreamUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    path: string,
    options?: SamoStreamUrlOptions,
) => {
    const url = new URL(getSamoApiUrl(authentication, path));

    if (options?.disc !== undefined) url.searchParams.set('disc', String(options.disc));
    if (options?.mediaFileId) url.searchParams.set('mediaFileId', options.mediaFileId);
    if (options?.offsetSeconds !== undefined)
        url.searchParams.set('offsetSeconds', String(options.offsetSeconds));
    if (options?.progressSeconds !== undefined)
        url.searchParams.set('progressSeconds', String(options.progressSeconds));
    if (options?.streamToken) url.searchParams.set('stream_token', options.streamToken);

    return url.toString();
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

export const getSamoMusicPlaylistCoverUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    playlistId: string,
    streamToken?: string,
) => buildStreamUrl(authentication, `/music/playlists/${encodeSamoId(playlistId)}/cover`, { streamToken });

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

const appendSamoStreamTokenToUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    url: string,
    streamToken?: string,
): string => {
    if (!streamToken) {
        return url;
    }

    try {
        const parsed = new URL(url);
        const base = new URL(authentication.url);

        // List responses can ship absolute image URLs pointed at the server's
        // loopback/hostname from scan time. Rewrite API paths to the origin
        // the client actually connected with so stream tokens attach and the
        // device can reach the host.
        if (parsed.pathname.includes('/api/v1/')) {
            parsed.protocol = base.protocol;
            parsed.host = base.host;
        } else if (parsed.origin !== base.origin) {
            return url;
        }

        if (parsed.searchParams.has('stream_token')) {
            parsed.searchParams.set('stream_token', streamToken);
            return parsed.toString();
        }

        parsed.searchParams.set('stream_token', streamToken);
        return parsed.toString();
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

export const resolveSamoPlaylistArtworkUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    playlist: Pick<SamoMusicPlaylist, 'id' | 'images'>,
    streamToken?: string,
): string | undefined => {
    const fromImage = resolveSamoImageUrl(authentication, pickImage(playlist.images), streamToken);
    if (fromImage) {
        return fromImage;
    }
    if (playlist.id) {
        return getSamoMusicPlaylistCoverUrl(authentication, playlist.id, streamToken);
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
