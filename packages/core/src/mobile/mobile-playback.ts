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
     * Network URL to use when handing the source to Chromecast. Only set
     * when `url` is a local file path (offline downloads), so the cast
     * receiver — which can't read the phone's filesystem — gets the
     * original streaming URL instead. Falls back to `url` when absent.
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
    audioTracks?: Array<{
        contentUrl?: string;
        mimeType?: string;
    }>;
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
    const body = await requestJson<AudiobookshelfPlaybackSessionBody>(
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
    );
    const audioTrack = body.audioTracks?.[0];
    const contentUrl = audioTrack?.contentUrl;

    if (!contentUrl) {
        throw new Error('Audiobookshelf did not return an audio URL');
    }

    const source: PlaybackSource = episodeId ? 'podcast' : 'audiobook';
    const mimeType = isAudiobookshelfHlsUrl(contentUrl)
        ? 'application/x-mpegURL'
        : audioTrack.mimeType;
    const normalizedUrl = normalizeContentUrl(authentication.url, contentUrl);

    return {
        artworkUrl,
        // Local ExoPlayer uses the Authorization header; Chromecast can't
        // forward it, so cast routes via a `?token=…` URL instead.
        castUrl: appendAudiobookshelfAuthToken(normalizedUrl, authentication.credential),
        contentSourceId: `${authentication.type}:${authentication.url}`,
        durationSeconds,
        httpHeaders: {
            Authorization: `Bearer ${authentication.credential}`,
        },
        id: `${authentication.type}:${authentication.url}:${source}:${itemId}${episodeId ? `:${episodeId}` : ''}`,
        initialPositionSeconds: startSeconds,
        mimeType,
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
