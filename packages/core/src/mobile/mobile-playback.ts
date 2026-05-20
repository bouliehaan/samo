import { isHiResAudioQuality, type AudioDeliveryKind } from '../audio-quality';
import { type PlaybackSource } from '../playback';
import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, requestJson, type SamoFetch } from '../server/server-http';

export interface AudiobookshelfPlayableInput {
    artworkUrl?: string;
    authentication: ServerAuthenticationResult;
    durationSeconds?: number;
    episodeId?: string;
    fetch?: SamoFetch;
    itemId: string;
    startSeconds?: number;
    subtitle?: string;
    timelineSegments?: MobilePlaybackSegment[];
    title: string;
}

export interface MobilePlaybackSegment {
    durationSeconds?: number;
    id: string;
    startSeconds: number;
    title?: string;
}

export interface MobilePlayableAudio {
    album?: string;
    albumId?: string;
    artist?: string;
    artistId?: string;
    artworkUrl?: string;
    /**
     * Mime type to advertise to the Chromecast receiver, when it differs
     * from `mimeType` (which is what the local ExoPlayer sees). Audiobookshelf
     * commonly hands us an HLS playlist for the local player while we
     * separately route the cast leg through a direct-file URL — the cast
     * receiver needs the underlying file's mime (audio/mp4, audio/mpeg, …)
     * rather than `application/x-mpegURL`.
     */
    castMimeType?: string;
    /**
     * Network URL to use when handing the source to Chromecast. Set when
     * `url` is a local file path (offline downloads) so the cast receiver —
     * which can't read the phone's filesystem — gets the original streaming
     * URL instead. Also set when the local stream is HLS but the cast
     * receiver can't reach segments (ABS HLS playlists lose `?token=…` on
     * relative segment URIs per RFC 3986) — in that case we route casting
     * through a single self-authenticating file URL. Falls back to `url`
     * when absent.
     */
    castUrl?: string;
    contentSourceId?: string;
    durationSeconds?: number;
    /**
     * Radio-only: the station's homepage URL, kept separate from `subtitle`
     * so the Android notification (which uses subtitle as the artist line)
     * doesn't leak a raw URL into the lock-screen UI. The Stream Information
     * modal reads it from here.
     */
    homepageUrl?: string;
    httpHeaders?: Record<string, string>;
    id: string;
    isLive?: boolean;
    initialPositionSeconds?: number;
    mimeType?: string;
    /**
     * Spoken-word progress can be reported against a whole book while the
     * current audio URL points at one underlying file. Add this offset to the
     * player position before syncing progress back to the server.
     */
    progressOffsetSeconds?: number;
    quality: MobilePlaybackQuality;
    source: PlaybackSource;
    subtitle?: string;
    timelineSegments?: MobilePlaybackSegment[];
    title: string;
    url: string;
}

export interface MobilePlaybackQuality {
    bitDepth?: null | number;
    bitRate?: null | number;
    channelCount?: null | number;
    container?: null | string;
    deliveryKind: AudioDeliveryKind;
    losslessRequired: boolean;
    sampleRate?: null | number;
    serverTranscodeRequested: boolean;
}

export interface SubsonicPlayableRadioStation {
    coverArt?: string;
    homepageUrl?: string;
    id?: string;
    name?: string;
    streamUrl?: string;
}

export interface SubsonicPlayableSong {
    album?: string;
    albumArtist?: string;
    albumId?: number | string;
    artist?: string;
    artistId?: number | string;
    bitDepth?: number | string;
    bitRate?: number | string;
    channelCount?: number | string;
    contentType?: string;
    coverArt?: string;
    duration?: number;
    id?: number | string;
    parent?: number | string;
    sampleRate?: number | string;
    samplingRate?: number | string;
    suffix?: string;
    title?: string;
}

interface AudiobookshelfPlaybackSessionBody {
    audioTracks?: AudiobookshelfPlaybackTrack[];
}

interface AudiobookshelfPlaybackTrack {
    contentUrl?: string;
    duration?: number;
    index?: number;
    ino?: string;
    metadata?: {
        ext?: string;
        filename?: string;
        size?: number;
    };
    mimeType?: string;
    startOffset?: number;
    title?: string;
}

/**
 * Minimal slice of `/api/items/:id?expanded=1`'s response — enough to locate
 * the underlying audio file for casting. `/play` may hand back an HLS
 * playlist URL with no inode in the body, so we lean on the canonical item
 * endpoint as the source of truth for the file's identity.
 */
interface AudiobookshelfCastItemDetail {
    id?: string;
    media?: {
        episodes?: Array<{
            audioFile?: AudiobookshelfCastFile;
            id?: string;
        }>;
        tracks?: AudiobookshelfCastFile[];
    };
}

interface AudiobookshelfCastFile {
    ino?: string;
    metadata?: {
        ext?: string;
        filename?: string;
    };
    mimeType?: string;
}

const subsonicOriginalStreamUrl = (authentication: ServerAuthenticationResult, id: string) => {
    // format=raw is the Subsonic / Navidrome way to explicitly disable
    // server-side transcoding (since 1.9.0). Without it the server applies
    // the user's "Max bit rate" preference and can hand back a transcoded MP3
    // even for FLAC sources, which means downloads aren't bit-perfect.
    const params = new URLSearchParams({
        c: 'Samo',
        format: 'raw',
        id,
        v: '1.13.0',
    });

    return `${authentication.url}/rest/stream.view?${params.toString()}&${authentication.credential}`;
};

const getContainerFromContentType = (contentType: string | undefined) => {
    if (!contentType?.startsWith('audio/')) {
        return null;
    }

    return contentType.split('/')[1] ?? null;
};

const normalizeContentUrl = (baseUrl: string, contentUrl: string) => {
    return new URL(contentUrl, baseUrl).toString();
};

/**
 * Append `?token=…` to an ABS URL so it self-authenticates without the
 * Authorization header — the default Chromecast receiver can't send custom
 * headers, but ABS accepts the same JWT credential via this query param.
 */
export const appendAudiobookshelfAuthToken = (url: string, credential: string) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(credential)}`;
};

const isAudiobookshelfHlsUrl = (contentUrl: string) => {
    const normalizedUrl = contentUrl.toLowerCase();

    return normalizedUrl.includes('/hls/') || normalizedUrl.includes('.m3u8');
};

/**
 * Cast-safe mime types for ABS audio files. The default Chromecast receiver
 * handles MP3, AAC (in MP4 containers like M4A/M4B), WAV, FLAC, and Ogg
 * Vorbis/Opus natively. Anything outside this set has no cast path at all,
 * so we'd rather leave the existing HLS castUrl in place and let the cast
 * receiver fall through to its own error than route playback through a
 * direct URL the receiver can't decode.
 */
const CAST_FRIENDLY_AUDIO_MIMES = new Set<string>([
    'audio/aac',
    'audio/flac',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/x-flac',
    'audio/x-m4a',
    'audio/x-m4b',
    'audio/x-wav',
]);

/**
 * Map an audiobookshelf file extension to its canonical audio mime type so
 * we can hand the cast receiver something it actually knows how to decode.
 * Returns null for formats we can't cast — caller falls back to leaving the
 * HLS castUrl in place (which will surface as a cast error rather than
 * silently failing on segment auth).
 */
export const mimeFromAudiobookshelfExt = (rawExt: string | undefined): null | string => {
    if (!rawExt) return null;
    const ext = rawExt.toLowerCase().replace(/^\./, '');
    switch (ext) {
        case 'aac':
            return 'audio/aac';
        case 'flac':
            return 'audio/flac';
        case 'm4a':
        case 'm4b':
        case 'mp4':
            return 'audio/mp4';
        case 'mp3':
            return 'audio/mpeg';
        case 'oga':
        case 'ogg':
            return 'audio/ogg';
        case 'opus':
            return 'audio/ogg; codecs=opus';
        case 'wav':
            return 'audio/wav';
        default:
            return null;
    }
};

/**
 * The cast receiver can't fetch ABS HLS playlists reliably: per RFC 3986, a
 * playlist's relative segment URIs resolve against the playlist URL and drop
 * its query string — so `?token=…` is lost on every segment request and ABS
 * 401s them. Workaround: route casting to `/api/items/:id/file/:ino?token=…`
 * instead. One self-authenticating request, no segments, no auth loss.
 *
 * The `ino` comes preferentially from `/api/items/:id?expanded=1` because
 * `/play`'s response doesn't reliably include one (sometimes a session-bound
 * URL is all you get, with no underlying file identity). When neither
 * surfaces an ino — or the file's format isn't one the default Chromecast
 * receiver can decode — fall back to the streaming URL so cast at least
 * surfaces an error rather than freezing on segment auth.
 */
const buildAudiobookshelfCastUrl = (
    authentication: ServerAuthenticationResult,
    itemId: string,
    streamingUrl: string,
    audioTrack: AudiobookshelfPlaybackTrack | undefined,
    itemCastFile: AudiobookshelfCastFile | undefined,
): { mimeType: string | undefined; url: string } => {
    const fallback = {
        mimeType: undefined as string | undefined,
        url: appendAudiobookshelfAuthToken(streamingUrl, authentication.credential),
    };

    const ino = itemCastFile?.ino ?? audioTrack?.ino;
    if (!ino) return fallback;

    const declaredMime = (itemCastFile?.mimeType ?? audioTrack?.mimeType)?.toLowerCase();
    const ext = itemCastFile?.metadata?.ext ?? audioTrack?.metadata?.ext;
    const directMime =
        declaredMime && CAST_FRIENDLY_AUDIO_MIMES.has(declaredMime)
            ? declaredMime
            : mimeFromAudiobookshelfExt(ext);

    if (!directMime) return fallback;

    const fileUrl = `${authentication.url}/api/items/${itemId}/file/${ino}`;
    return {
        mimeType: directMime,
        url: appendAudiobookshelfAuthToken(fileUrl, authentication.credential),
    };
};

/**
 * Find the audio file that maps to the current playback target in the
 * `/api/items` response. For podcasts we match by episodeId; for audiobooks
 * we cast the first track (multi-file books cast file 0 only — driving cast
 * across file boundaries needs receiver-side queue support).
 */
const findAudiobookshelfCastFile = (
    item: AudiobookshelfCastItemDetail | undefined,
    episodeId: string | undefined,
): AudiobookshelfCastFile | undefined => {
    if (!item) return undefined;
    if (episodeId) {
        const episode = item.media?.episodes?.find((candidate) => candidate.id === episodeId);
        return episode?.audioFile;
    }
    return item.media?.tracks?.[0];
};

const getContainerFromMimeType = (mimeType: string | undefined) => {
    if (!mimeType?.startsWith('audio/')) {
        return null;
    }

    return mimeType.split('/')[1] ?? null;
};

const toAudioNumber = (value: null | number | string | undefined) => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

export const getSubsonicMusicQuality = (
    song: SubsonicPlayableSong,
): MobilePlaybackQuality => ({
    bitDepth: toAudioNumber(song.bitDepth),
    bitRate: toAudioNumber(song.bitRate),
    channelCount: toAudioNumber(song.channelCount),
    container: song.suffix ?? getContainerFromContentType(song.contentType),
    deliveryKind: 'android-direct',
    losslessRequired: true,
    sampleRate: toAudioNumber(song.samplingRate ?? song.sampleRate),
    serverTranscodeRequested: false,
});

export const isSubsonicSongHiRes = (song: SubsonicPlayableSong) =>
    isHiResAudioQuality(getSubsonicMusicQuality(song));

export const buildSubsonicMusicPlayback = (
    authentication: ServerAuthenticationResult,
    song: SubsonicPlayableSong,
    artworkUrl?: string,
): MobilePlayableAudio | null => {
    const id = song.id?.toString();

    if (!id || !song.title) {
        return null;
    }

    return {
        album: song.album,
        albumId: song.albumId?.toString() ?? song.parent?.toString(),
        artist: song.artist,
        artistId: song.artistId?.toString(),
        artworkUrl,
        contentSourceId: `${authentication.type}:${authentication.url}`,
        durationSeconds: song.duration,
        id: `${authentication.type}:${authentication.url}:music:${id}`,
        mimeType: song.contentType,
        quality: getSubsonicMusicQuality(song),
        source: 'music',
        subtitle: [song.artist, song.album].filter(Boolean).join(' - '),
        title: song.title,
        url: subsonicOriginalStreamUrl(authentication, id),
    };
};

export const buildRadioPlayback = (
    authentication: ServerAuthenticationResult,
    station: SubsonicPlayableRadioStation,
    artworkUrl?: string,
): MobilePlayableAudio | null => {
    if (!station.id || !station.name || !station.streamUrl) {
        return null;
    }

    return {
        artworkUrl,
        contentSourceId: `${authentication.type}:${authentication.url}`,
        homepageUrl: station.homepageUrl,
        id: `${authentication.type}:${authentication.url}:radio:${station.id}`,
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
    };
};

export const loadAudiobookshelfPlayback = async ({
    artworkUrl,
    authentication,
    durationSeconds,
    episodeId,
    fetch: fetcher,
    itemId,
    startSeconds,
    subtitle,
    timelineSegments,
    title,
}: AudiobookshelfPlayableInput): Promise<MobilePlayableAudio> => {
    const request = getFetch(fetcher);
    const playPath = episodeId
        ? `/api/items/${itemId}/play/${episodeId}`
        : `/api/items/${itemId}/play`;
    // Fire /play and the expanded item endpoint in parallel. /play starts
    // the streaming session and hands us the URL the local ExoPlayer should
    // use (often HLS). The expanded item gives us the underlying audio
    // file's inode, which we need to build a Chromecast-safe direct URL —
    // /play's response doesn't reliably include one. Item-fetch failures
    // are non-fatal: we'll just fall back to the streaming URL for cast,
    // which surfaces as an error rather than a silent freeze.
    const [body, itemDetail] = await Promise.all([
        requestJson<AudiobookshelfPlaybackSessionBody>(
            request,
            `${authentication.url}${playPath}`,
            {
                body: JSON.stringify({}),
                headers: {
                    Authorization: `Bearer ${authentication.credential}`,
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
        ),
        requestJson<AudiobookshelfCastItemDetail>(
            request,
            `${authentication.url}/api/items/${itemId}?expanded=1`,
            {
                headers: { Authorization: `Bearer ${authentication.credential}` },
                method: 'GET',
            },
        ).catch(() => undefined),
    ]);
    const audioTrack = body.audioTracks?.[0];
    const contentUrl = audioTrack?.contentUrl;

    if (!contentUrl) {
        throw new Error('Audiobookshelf did not return an audio URL');
    }

    const source: PlaybackSource = episodeId ? 'podcast' : 'audiobook';
    const progressOffsetSeconds =
        typeof audioTrack.startOffset === 'number' && audioTrack.startOffset > 0
            ? audioTrack.startOffset
            : 0;
    const initialPositionSeconds =
        startSeconds !== undefined
            ? Math.max(0, startSeconds - progressOffsetSeconds)
            : undefined;
    const mimeType = isAudiobookshelfHlsUrl(contentUrl)
        ? 'application/x-mpegURL'
        : audioTrack.mimeType;
    const normalizedUrl = normalizeContentUrl(authentication.url, contentUrl);
    const itemCastFile = findAudiobookshelfCastFile(itemDetail, episodeId);
    const castTarget = buildAudiobookshelfCastUrl(
        authentication,
        itemId,
        normalizedUrl,
        audioTrack,
        itemCastFile,
    );

    return {
        artworkUrl,
        // The cast receiver needs the underlying file's mime type — it
        // can't decode the local HLS wrapper when we route casting through
        // a direct-file URL.
        castMimeType: castTarget.mimeType,
        // Local ExoPlayer uses the Authorization header; Chromecast can't
        // forward it, so cast routes via a self-authenticating `?token=…`
        // URL — preferring the direct file when ABS gives us the inode so
        // segment auth in HLS playlists never enters the picture.
        castUrl: castTarget.url,
        contentSourceId: `${authentication.type}:${authentication.url}`,
        durationSeconds,
        httpHeaders: {
            Authorization: `Bearer ${authentication.credential}`,
        },
        id: `${authentication.type}:${authentication.url}:${source}:${itemId}${episodeId ? `:${episodeId}` : ''}`,
        initialPositionSeconds,
        mimeType,
        progressOffsetSeconds,
        quality: {
            container: isAudiobookshelfHlsUrl(contentUrl)
                ? 'hls'
                : getContainerFromMimeType(audioTrack.mimeType),
            deliveryKind: 'unknown',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        source,
        subtitle,
        timelineSegments,
        title,
        url: normalizedUrl,
    };
};
