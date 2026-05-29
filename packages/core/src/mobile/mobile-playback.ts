import { type AudioDeliveryKind } from '../audio-quality';
import {
    getSubsonicMusicQuality,
    type SubsonicPlayableSong,
} from '../audio-quality/subsonic-quality-scan';
import { type PlaybackSource } from '../playback';
import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, requestJson, type SamoFetch } from '../server/server-http';
import {
    type SamoAudiobook,
    type SamoAudioFile,
    type SamoInternetRadioStation,
    type SamoMusicTrack,
    type SamoPodcastEpisode,
    getSamoAudiobookStreamUrl,
    getSamoMusicTrackStreamUrl,
    getSamoPodcastEpisodeStreamUrl,
    pickSamoImageId,
    pickSamoCatalogImageId,
} from '../server/server-samo';
import { ensureSamoStreamToken } from '../server/server-samo-stream-token';
import { getServerConnectionKey } from '../server/server-session';
import { ServerType } from '../server/server-types';

import {
    resolveRadioPlaybackDisplay,
    resolveSamoInternetRadioPlaybackDisplay,
} from './mobile-radio-metadata';

/** Relative skip interval for audiobook and podcast scrubbing in mobile/desktop UIs. */
export const LONG_FORM_RELATIVE_SKIP_SECONDS = 15;

// Re-exports for Android back-compat — these symbols used to live here.
export {
    getSubsonicMusicQuality,
    isSubsonicSongHiRes,
    type SubsonicPlayableSong,
} from '../audio-quality/subsonic-quality-scan';

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
    /** Samo metadata `images[].id` for display-time URL rebuild. */
    artworkImageId?: string;
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
    /** Samo internet-radio station id for metadata refresh while playing. */
    radioStationId?: string;
    /** Station display name when [title] is ICY track metadata. */
    radioStationName?: string;
    initialPositionSeconds?: number;
    mimeType?: string;
    /**
     * Spoken-word progress can be reported against a whole book while the
     * current audio URL points at one underlying file. Add this offset to the
     * player position before syncing progress back to the server.
     */
    progressOffsetSeconds?: number;
    /** Podcast episode release time (epoch ms) for player metadata. */
    publishedAt?: number;
    quality: MobilePlaybackQuality;
    /**
     * Android native queue auto-advance: bearer token for minting a fresh
     * `stream_token` without waking JS (Samo servers only).
     */
    serverBearerToken?: string;
    source: PlaybackSource;
    /** Samo server base URL paired with [serverBearerToken]. */
    serverUrl?: string;
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

/**
 * Default Google Cast media receiver supports lossless FLAC up to 96 kHz / 24-bit.
 * Higher sample rates (e.g. 192 kHz hi-res) must use a server-transcoded cast leg.
 */
export const CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ = 96_000;

export const needsChromecastCompatibleStream = (quality: MobilePlaybackQuality) => {
    if (quality.serverTranscodeRequested) {
        return false;
    }

    const sampleRate = quality.sampleRate ?? 0;
    return sampleRate > CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ;
};

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

/** Cast leg: omit format=raw so Navidrome/Subsonic can transcode for the receiver. */
const subsonicChromecastStreamUrl = (authentication: ServerAuthenticationResult, id: string) => {
    const params = new URLSearchParams({
        c: 'Samo',
        format: 'mp3',
        id,
        maxBitRate: '320',
        v: '1.13.0',
    });

    return `${authentication.url}/rest/stream.view?${params.toString()}&${authentication.credential}`;
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

export const buildSubsonicMusicPlayback = (
    authentication: ServerAuthenticationResult,
    song: SubsonicPlayableSong,
    artworkUrl?: string,
): MobilePlayableAudio | null => {
    const id = song.id?.toString();

    if (!id || !song.title) {
        return null;
    }

    const quality = getSubsonicMusicQuality(song);
    const castNeedsTranscode = needsChromecastCompatibleStream(quality);

    return {
        album: song.album,
        albumId: song.albumId?.toString() ?? song.parent?.toString(),
        artist: song.artist,
        artistId: song.artistId?.toString(),
        artworkUrl,
        contentSourceId: getServerConnectionKey(authentication),
        durationSeconds: song.duration,
        id: `${authentication.type}:${authentication.url}:music:${id}`,
        mimeType: song.contentType,
        quality,
        source: 'music',
        subtitle: [song.artist, song.album].filter(Boolean).join(' - '),
        title: song.title,
        url: subsonicOriginalStreamUrl(authentication, id),
        ...(castNeedsTranscode
            ? {
                  castMimeType: 'audio/mpeg',
                  castUrl: subsonicChromecastStreamUrl(authentication, id),
              }
            : {}),
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

    const display = resolveRadioPlaybackDisplay(station.name);

    return {
        artworkUrl,
        artist: display.playerArtist,
        contentSourceId: getServerConnectionKey(authentication),
        homepageUrl: station.homepageUrl,
        id: `${authentication.type}:${authentication.url}:radio:${station.id}`,
        isLive: true,
        quality: {
            container: null,
            deliveryKind: 'android-direct',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        radioStationName: station.name,
        source: 'radio',
        subtitle: display.playerSubtitle,
        title: display.playerTitle,
        url: station.streamUrl,
    };
};

// ---------------------------------------------------------------------------
// Samo native playback builders
// ---------------------------------------------------------------------------

/** Matches `podcast:<showId>:<episodeId>` and legacy `podcast-episode:<episodeId>`. */
export const SAMO_PODCAST_PLAYBACK_ID_INNER =
    /:(?:podcast:([^:]+(?::[^:]+)?)|podcast-episode:([^:]+))$/;

export const buildSamoPodcastPlaybackId = (
    authentication: Pick<ServerAuthenticationResult, 'type' | 'url'>,
    showId: string,
    episodeId: string,
) => `${authentication.type}:${authentication.url}:podcast:${showId}:${episodeId}`;

export const parsePodcastPlaybackEpisodeId = (playbackId: string): string | undefined => {
    const match = playbackId.match(SAMO_PODCAST_PLAYBACK_ID_INNER);
    if (!match) {
        return undefined;
    }

    if (match[1]) {
        const segments = match[1].split(':');
        return segments[segments.length - 1];
    }

    return match[2];
};

export const parsePodcastPlaybackShowId = (playbackId: string): string | undefined => {
    const match = playbackId.match(/:podcast:([^:]+):[^:]+$/);
    return match?.[1];
};

const samoQualityForFile = (
    audioFile: SamoAudioFile | undefined,
    deliveryKind: AudioDeliveryKind,
    losslessRequired: boolean,
): MobilePlaybackQuality => ({
    bitDepth: audioFile?.bitDepth ?? null,
    bitRate: audioFile?.bitrate ?? null,
    channelCount: audioFile?.channels ?? null,
    container: audioFile?.container ?? null,
    deliveryKind,
    losslessRequired,
    sampleRate: audioFile?.sampleRate ?? null,
    serverTranscodeRequested: false,
});

export const buildSamoMusicPlayback = (
    authentication: ServerAuthenticationResult,
    track: SamoMusicTrack,
    artworkUrl?: string,
    streamToken?: string,
    artworkImageId?: string,
): MobilePlayableAudio | null => {
    if (!track.id || !track.title) return null;

    const audioFile = track.primaryAudioFile ?? track.audioFiles?.[0];
    const quality = samoQualityForFile(audioFile, 'android-direct', true);
    const subtitle = [track.displayArtist, track.albumTitle].filter(Boolean).join(' - ')
        || undefined;

    return {
        album: track.albumTitle,
        albumId: track.albumId,
        artist: track.displayArtist,
        artworkUrl,
        artworkImageId: pickSamoImageId(track.images) ?? artworkImageId,
        contentSourceId: getServerConnectionKey(authentication),
        durationSeconds: track.durationSeconds,
        id: `${authentication.type}:${authentication.url}:music:${track.id}`,
        mimeType: audioFile?.mimeType,
        quality,
        source: 'music',
        subtitle,
        title: track.title,
        url: getSamoMusicTrackStreamUrl(authentication, track.id, { streamToken }),
    };
};

export const parseSamoAudiobookIdFromPlaybackId = (playbackId: string): string | undefined => {
    const match = playbackId.match(/:audiobook:([^:]+)$/);
    return match?.[1];
};

export const buildAudiobookTimelineSegments = (
    chapters: Array<{ id?: string; startSeconds?: number; title?: string }> | undefined,
    durationSeconds: number | undefined,
    ownerId: string,
): MobilePlaybackSegment[] => {
    const orderedChapters = (chapters ?? [])
        .map((chapter, index) => ({ chapter, index }))
        .filter(
            ({ chapter }) =>
                chapter.startSeconds !== undefined &&
                Number.isFinite(chapter.startSeconds) &&
                chapter.startSeconds >= 0 &&
                (!durationSeconds || chapter.startSeconds < durationSeconds),
        )
        .sort((left, right) => (left.chapter.startSeconds ?? 0) - (right.chapter.startSeconds ?? 0))
        .filter(
            ({ chapter }, index, ordered) =>
                index === 0 ||
                chapter.startSeconds !== ordered[index - 1].chapter.startSeconds,
        );

    return orderedChapters.map(({ chapter, index }, orderedIndex) => {
        const startSeconds = chapter.startSeconds ?? 0;
        const nextStart = orderedChapters[orderedIndex + 1]?.chapter.startSeconds;
        const segmentDuration =
            nextStart !== undefined
                ? Math.max(0, nextStart - startSeconds)
                : durationSeconds
                  ? Math.max(0, durationSeconds - startSeconds)
                  : undefined;

        return {
            durationSeconds: segmentDuration,
            id: chapter.id ?? `${ownerId}:chapter:${index}`,
            startSeconds,
            title: chapter.title?.trim() || `Chapter ${orderedIndex + 1}`,
        };
    });
};

/**
 * Samo audiobook streams are opened at a book-global byte offset on the server
 * (`progressSeconds` query). The native player reports position 0 at that
 * offset — store it in [progressOffsetSeconds] and rebuild the stream URL when
 * jumping chapters.
 */
export const applySamoAudiobookBookPosition = (
    playback: MobilePlayableAudio,
    bookStartSeconds: number,
    authentication: ServerAuthenticationResult,
    streamToken?: string,
): MobilePlayableAudio => {
    const audiobookId = parseSamoAudiobookIdFromPlaybackId(playback.id);
    if (!audiobookId) {
        return playback;
    }

    const bookStart = Math.max(0, Math.floor(bookStartSeconds));

    return {
        ...playback,
        initialPositionSeconds: 0,
        progressOffsetSeconds: bookStart,
        url: getSamoAudiobookStreamUrl(authentication, audiobookId, {
            progressSeconds: bookStart,
            streamToken,
        }),
    };
};

export const buildSamoAudiobookPlayback = (
    authentication: ServerAuthenticationResult,
    audiobook: SamoAudiobook,
    artworkUrl?: string,
    streamToken?: string,
    options?: {
        startSeconds?: number;
        timelineSegments?: MobilePlaybackSegment[];
    },
): MobilePlayableAudio | null => {
    if (!audiobook.id) return null;
    const title = audiobook.book?.title;
    if (!title) return null;

    const audioFile = audiobook.primaryAudioFile ?? audiobook.audioFiles?.[0];
    const bookStart = Math.max(
        0,
        Math.floor(
            options?.startSeconds ?? audiobook.progress?.progressSeconds ?? 0,
        ),
    );
    const quality = samoQualityForFile(audioFile, 'android-direct', false);

    const authors = audiobook.book?.authors
        ?.map((author) => author.name)
        .filter(Boolean)
        .join(', ');

    const timelineSegments =
        options?.timelineSegments ??
        buildAudiobookTimelineSegments(audiobook.chapters, audiobook.durationSeconds, audiobook.id);

    return applySamoAudiobookBookPosition(
        {
            artworkUrl,
            contentSourceId: getServerConnectionKey(authentication),
            durationSeconds: audiobook.durationSeconds,
            id: `${authentication.type}:${authentication.url}:audiobook:${audiobook.id}`,
            mimeType: audioFile?.mimeType,
            quality,
            source: 'audiobook',
            subtitle: authors,
            timelineSegments:
                timelineSegments.length > 1 ? timelineSegments : undefined,
            title,
            url: getSamoAudiobookStreamUrl(authentication, audiobook.id, {
                progressSeconds: bookStart,
                streamToken,
            }),
        },
        bookStart,
        authentication,
        streamToken,
    );
};

export const buildSamoPodcastEpisodePlayback = (
    authentication: ServerAuthenticationResult,
    episode: SamoPodcastEpisode,
    showId: string | undefined,
    artworkUrl?: string,
    streamToken?: string,
): MobilePlayableAudio | null => {
    if (!episode.id) return null;
    const title = episode.title ?? episode.name;
    if (!title) return null;

    const resolvedShowId = showId ?? episode.podcastId;
    if (!resolvedShowId) return null;

    const audioFile = episode.audioFiles?.[0];
    const progressSeconds =
        episode.progress?.progressSeconds ?? episode.playback?.progressSeconds;
    const resumeSeconds =
        progressSeconds && progressSeconds > 0 ? Math.round(progressSeconds) : undefined;
    const quality = samoQualityForFile(audioFile, 'android-direct', false);

    const publishedAtMs = episode.publishedAt
        ? Date.parse(episode.publishedAt)
        : undefined;

    return {
        artworkUrl,
        contentSourceId: getServerConnectionKey(authentication),
        durationSeconds: episode.duration,
        id: buildSamoPodcastPlaybackId(authentication, resolvedShowId, episode.id),
        initialPositionSeconds: resumeSeconds,
        mimeType: audioFile?.mimeType ?? episode.enclosureType,
        publishedAt:
            publishedAtMs !== undefined && Number.isFinite(publishedAtMs)
                ? publishedAtMs
                : undefined,
        quality,
        source: 'podcast',
        subtitle: episode.podcastTitle,
        title,
        url: getSamoPodcastEpisodeStreamUrl(authentication, episode.id, {
            offsetSeconds: resumeSeconds,
            streamToken,
        }),
    };
};

export const buildSamoInternetRadioPlayback = (
    authentication: ServerAuthenticationResult,
    station: SamoInternetRadioStation,
    artworkUrl?: string,
): MobilePlayableAudio | null => {
    const streamUrl = station.publicStreamUrl ?? station.streamUrl;

    if (!station.id || !station.name || !streamUrl) {
        return null;
    }

    const display = resolveSamoInternetRadioPlaybackDisplay(station);

    return {
        artworkImageId: pickSamoCatalogImageId(station.coverId),
        artworkUrl,
        artist: display.playerArtist,
        contentSourceId: getServerConnectionKey(authentication),
        homepageUrl: station.homepageUrl,
        id: `${getServerConnectionKey(authentication)}:internet-radio:${station.id}`,
        isLive: true,
        mimeType: station.contentType,
        quality: {
            bitRate: station.bitrate ?? null,
            container: station.codec ?? null,
            deliveryKind: 'android-direct',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        radioStationId: station.id,
        radioStationName: display.stationName,
        source: 'radio',
        subtitle: display.playerSubtitle,
        title: display.playerTitle,
        url: streamUrl,
    };
};

/**
 * Mint or reuse a Samo stream token before building a playback URL. Used
 * before queueing a track so the URL embedded in `MobilePlayableAudio` is
 * authenticated for the next 25 minutes — long enough for the player to
 * start without a refresh round-trip.
 */
export const refreshSamoStreamToken = async (
    authentication: ServerAuthenticationResult,
    fetcher?: SamoFetch,
): Promise<string | undefined> => {
    if (authentication.type !== ServerType.SAMO) return undefined;
    return ensureSamoStreamToken(authentication, fetcher);
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
        contentSourceId: getServerConnectionKey(authentication),
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
