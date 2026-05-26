import { type AudioDeliveryKind } from '../audio-quality';
import { type PlaybackSource } from '../playback';
import { type ServerAuthenticationResult } from '../server/server-auth';
import { type SamoFetch } from '../server/server-http';
export {
    getSubsonicMusicQuality,
    isSubsonicSongHiRes,
    type SubsonicPlayableSong,
} from '../audio-quality/subsonic-quality-scan';
import { type SubsonicPlayableSong } from '../audio-quality/subsonic-quality-scan';
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
/**
 * Default Google Cast media receiver supports lossless FLAC up to 96 kHz / 24-bit.
 * Higher sample rates (e.g. 192 kHz hi-res) must use a server-transcoded cast leg.
 */
export declare const CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ = 96000;
export declare const needsChromecastCompatibleStream: (quality: MobilePlaybackQuality) => boolean;
/**
 * Append `?token=…` to an ABS URL so it self-authenticates without the
 * Authorization header — the default Chromecast receiver can't send custom
 * headers, but ABS accepts the same JWT credential via this query param.
 */
export declare const appendAudiobookshelfAuthToken: (url: string, credential: string) => string;
/**
 * Map an audiobookshelf file extension to its canonical audio mime type so
 * we can hand the cast receiver something it actually knows how to decode.
 * Returns null for formats we can't cast — caller falls back to leaving the
 * HLS castUrl in place (which will surface as a cast error rather than
 * silently failing on segment auth).
 */
export declare const mimeFromAudiobookshelfExt: (rawExt: string | undefined) => null | string;
export declare const buildSubsonicMusicPlayback: (authentication: ServerAuthenticationResult, song: SubsonicPlayableSong, artworkUrl?: string) => MobilePlayableAudio | null;
export declare const buildRadioPlayback: (authentication: ServerAuthenticationResult, station: SubsonicPlayableRadioStation, artworkUrl?: string) => MobilePlayableAudio | null;
export declare const loadAudiobookshelfPlayback: ({ artworkUrl, authentication, durationSeconds, episodeId, fetch: fetcher, itemId, startSeconds, subtitle, timelineSegments, title, }: AudiobookshelfPlayableInput) => Promise<MobilePlayableAudio>;
