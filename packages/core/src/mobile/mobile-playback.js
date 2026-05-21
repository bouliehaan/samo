import { isHiResAudioQuality } from '../audio-quality';
import { getFetch, requestJson } from '../server/server-http';
/**
 * Default Google Cast media receiver supports lossless FLAC up to 96 kHz / 24-bit.
 * Higher sample rates (e.g. 192 kHz hi-res) must use a server-transcoded cast leg.
 */
export const CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ = 96_000;
export const needsChromecastCompatibleStream = (quality) => {
    if (quality.serverTranscodeRequested) {
        return false;
    }
    const sampleRate = quality.sampleRate ?? 0;
    return sampleRate > CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ;
};
const subsonicOriginalStreamUrl = (authentication, id) => {
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
const subsonicChromecastStreamUrl = (authentication, id) => {
    const params = new URLSearchParams({
        c: 'Samo',
        format: 'mp3',
        id,
        maxBitRate: '320',
        v: '1.13.0',
    });
    return `${authentication.url}/rest/stream.view?${params.toString()}&${authentication.credential}`;
};
const getContainerFromContentType = (contentType) => {
    if (!contentType?.startsWith('audio/')) {
        return null;
    }
    return contentType.split('/')[1] ?? null;
};
const normalizeContentUrl = (baseUrl, contentUrl) => {
    return new URL(contentUrl, baseUrl).toString();
};
/**
 * Append `?token=…` to an ABS URL so it self-authenticates without the
 * Authorization header — the default Chromecast receiver can't send custom
 * headers, but ABS accepts the same JWT credential via this query param.
 */
export const appendAudiobookshelfAuthToken = (url, credential) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(credential)}`;
};
const isAudiobookshelfHlsUrl = (contentUrl) => {
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
const CAST_FRIENDLY_AUDIO_MIMES = new Set([
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
export const mimeFromAudiobookshelfExt = (rawExt) => {
    if (!rawExt)
        return null;
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
const buildAudiobookshelfCastUrl = (authentication, itemId, streamingUrl, audioTrack, itemCastFile) => {
    const fallback = {
        mimeType: undefined,
        url: appendAudiobookshelfAuthToken(streamingUrl, authentication.credential),
    };
    const ino = itemCastFile?.ino ?? audioTrack?.ino;
    if (!ino)
        return fallback;
    const declaredMime = (itemCastFile?.mimeType ?? audioTrack?.mimeType)?.toLowerCase();
    const ext = itemCastFile?.metadata?.ext ?? audioTrack?.metadata?.ext;
    const directMime = declaredMime && CAST_FRIENDLY_AUDIO_MIMES.has(declaredMime)
        ? declaredMime
        : mimeFromAudiobookshelfExt(ext);
    if (!directMime)
        return fallback;
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
const findAudiobookshelfCastFile = (item, episodeId) => {
    if (!item)
        return undefined;
    if (episodeId) {
        const episode = item.media?.episodes?.find((candidate) => candidate.id === episodeId);
        return episode?.audioFile;
    }
    return item.media?.tracks?.[0];
};
const getContainerFromMimeType = (mimeType) => {
    if (!mimeType?.startsWith('audio/')) {
        return null;
    }
    return mimeType.split('/')[1] ?? null;
};
const toAudioNumber = (value) => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};
export const getSubsonicMusicQuality = (song) => ({
    bitDepth: toAudioNumber(song.bitDepth),
    bitRate: toAudioNumber(song.bitRate),
    channelCount: toAudioNumber(song.channelCount),
    container: song.suffix ?? getContainerFromContentType(song.contentType),
    deliveryKind: 'android-direct',
    losslessRequired: true,
    sampleRate: toAudioNumber(song.samplingRate ?? song.sampleRate),
    serverTranscodeRequested: false,
});
export const isSubsonicSongHiRes = (song) => isHiResAudioQuality(getSubsonicMusicQuality(song));
export const buildSubsonicMusicPlayback = (authentication, song, artworkUrl) => {
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
        contentSourceId: `${authentication.type}:${authentication.url}`,
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
export const buildRadioPlayback = (authentication, station, artworkUrl) => {
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
export const loadAudiobookshelfPlayback = async ({ artworkUrl, authentication, durationSeconds, episodeId, fetch: fetcher, itemId, startSeconds, subtitle, timelineSegments, title, }) => {
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
        requestJson(request, `${authentication.url}${playPath}`, {
            body: JSON.stringify({}),
            headers: {
                Authorization: `Bearer ${authentication.credential}`,
                'Content-Type': 'application/json',
            },
            method: 'POST',
        }),
        requestJson(request, `${authentication.url}/api/items/${itemId}?expanded=1`, {
            headers: { Authorization: `Bearer ${authentication.credential}` },
            method: 'GET',
        }).catch(() => undefined),
    ]);
    const audioTrack = body.audioTracks?.[0];
    const contentUrl = audioTrack?.contentUrl;
    if (!contentUrl) {
        throw new Error('Audiobookshelf did not return an audio URL');
    }
    const source = episodeId ? 'podcast' : 'audiobook';
    const progressOffsetSeconds = typeof audioTrack.startOffset === 'number' && audioTrack.startOffset > 0
        ? audioTrack.startOffset
        : 0;
    const initialPositionSeconds = startSeconds !== undefined
        ? Math.max(0, startSeconds - progressOffsetSeconds)
        : undefined;
    const mimeType = isAudiobookshelfHlsUrl(contentUrl)
        ? 'application/x-mpegURL'
        : audioTrack.mimeType;
    const normalizedUrl = normalizeContentUrl(authentication.url, contentUrl);
    const itemCastFile = findAudiobookshelfCastFile(itemDetail, episodeId);
    const castTarget = buildAudiobookshelfCastUrl(authentication, itemId, normalizedUrl, audioTrack, itemCastFile);
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
