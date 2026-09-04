import { type DeliveredAudioFormat } from '@samo/core/audio-quality';
import { type MobilePlayableAudio } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import {
    attachNativeStreamCredentials,
    attachNativeStreamCredentialsToQueue,
} from '../utils/native-stream-auth';
import { peekLocalDownloadForTrack } from './download-manager';
import { shouldMirrorPlaybackQueueToNative } from '../utils/playback-queue-mirror';
import { NativeEventEmitter, NativeModules } from 'react-native';

export interface AndroidAudioDeviceInfo {
    framesPerBuffer?: string;
    isBluetoothA2dpOn?: boolean;
    isSpeakerphoneOn?: boolean;
    isWiredHeadsetOn?: boolean;
    outputs?: Array<{
        channelCounts?: number[];
        encodings?: number[];
        id?: number;
        productName?: string;
        sampleRates?: number[];
        type?: string;
    }>;
    outputSampleRate?: string;
}

export type AndroidRepeatMode = 'all' | 'off' | 'one';

export interface AndroidNativePlaybackEvent {
    bitPerfect?: AndroidPlaybackTruth;
    cast?: {
        deviceName?: string;
        isConnected: boolean;
    };
    /**
     * The format the engine is ACTUALLY decoding, once a stream has opened.
     *
     * Absent until then, and absent on the cast path where the receiver does
     * the decoding — in both cases the consumer falls back to the catalog's
     * description of the file rather than asserting one.
     */
    decodedFormat?: DeliveredAudioFormat;
    durationMs?: number;
    isPlaying?: boolean;
    message?: string;
    positionMs?: number;
    queueIndex?: number;
    queueLength?: number;
    /** The user's repeat SETTING (native is authoritative; survives JS restarts). */
    repeatMode?: AndroidRepeatMode;
    sessionId?: string;
    source?: {
        artworkUrl?: string;
        id?: string;
        source?: string;
        subtitle?: string;
        title?: string;
    };
    status: AndroidNativePlaybackStatus;
}

export type AndroidNativePlaybackStatus =
    | 'buffering'
    | 'ended'
    | 'error'
    | 'idle'
    | 'paused'
    | 'playing'
    /** Native parked playback because the system reports no network. Resumes
     *  from saved position the moment connectivity returns. */
    | 'waiting_for_network'
    /** Native could not refresh the stream token via the supplied bearer.
     *  JS needs to refresh auth and reissue play(). */
    | 'stale_auth';

export interface AndroidCastState {
    deviceName?: string;
    isConnected: boolean;
    status: 'connected' | 'connecting' | 'no-devices' | 'not-connected' | 'unavailable';
}

export interface AndroidMediaOutputRoute {
    deviceId?: number;
    id: string;
    isAvailable?: boolean;
    isSelected?: boolean;
    kind: 'cast' | 'local';
    routeId?: string;
    subtitle?: string;
    title: string;
    type?: string;
}

export interface AndroidMediaOutputState {
    cast?: AndroidCastState;
    routes: AndroidMediaOutputRoute[];
}

export interface AndroidPlaybackTruth {
    activeClaim: 'bit-perfect-active' | 'not-bit-perfect' | 'unknown';
    directBitstreamSupported?: boolean;
    directOffloadGaplessSupported?: boolean;
    directOffloadSupported?: boolean;
    directPcmSupported?: boolean;
    evidence: string[];
    offloadedPlaybackActive?: boolean;
    sourceBitDepth?: number;
    sourceChannelCount?: number;
    sourceSampleRate?: number;
    usbBitPerfectMixerRequested?: boolean;
    usbBitPerfectMixerSupported?: boolean;
}

interface SamoAudioNativeModule {
    addListener: (eventName: string) => void;
    getAudioDeviceInfo: () => Promise<AndroidAudioDeviceInfo>;
    getCastState: () => Promise<AndroidCastState>;
    getOutputRoutes: () => Promise<AndroidMediaOutputState>;
    getStatus: () => Promise<AndroidNativePlaybackEvent>;
    pause: () => Promise<AndroidNativePlaybackEvent>;
    play: (
        source: MobilePlayableAudio & {
            castArtworkUrl?: string;
            castHttpHeaders?: Record<string, string>;
            castIsLive?: boolean;
            castMimeType?: string;
            castSubtitle?: string;
            castTitle?: string;
            castUrl?: string;
            sessionId: string;
        },
    ) => Promise<AndroidNativePlaybackEvent>;
    playQueueIndex: (
        index: number,
        expectedMediaId: string | null,
    ) => Promise<AndroidNativePlaybackEvent & { handled?: boolean }>;
    removeListeners: (count: number) => void;
    resume: () => Promise<AndroidNativePlaybackEvent>;
    seekTo: (positionMs: number) => Promise<AndroidNativePlaybackEvent>;
    selectOutputRoute: (
        route: Pick<AndroidMediaOutputRoute, 'deviceId' | 'kind' | 'routeId'>,
    ) => Promise<AndroidMediaOutputState>;
    setRepeatMode: (mode: AndroidRepeatMode) => Promise<AndroidNativePlaybackEvent>;
    setSleepTimer: (seconds: number) => Promise<AndroidNativePlaybackEvent>;
    cancelSleepTimer: () => Promise<AndroidNativePlaybackEvent>;
    setPlaybackQueue: (queue: {
        queueIndex: number;
        queueItems: MobilePlayableAudio[];
        source?: string;
    }) => Promise<void>;
    stop: () => Promise<AndroidNativePlaybackEvent>;
    updateNowPlayingMetadata: (metadata: {
        artworkUrl?: string;
        id: string;
        sessionId: string;
        source: string;
        subtitle?: string;
        title: string;
    }) => Promise<AndroidNativePlaybackEvent>;
}

const samoAudio = NativeModules.SamoAudio as SamoAudioNativeModule | undefined;
const eventEmitter = samoAudio ? new NativeEventEmitter(samoAudio) : null;

export const isAndroidNativePlaybackAvailable = () => Boolean(samoAudio);

// The queue-mirror gate lives in a pure, unit-tested module (its radio branch
// regressed background podcast→radio advance). Re-exported here for the existing
// import sites.
export { shouldMirrorPlaybackQueueToNative };

/** Keep the native service queue in sync with JS Up Next mutations. */
export const syncAndroidNativePlaybackQueue = (
    queue:
        | {
              index: number;
              items: MobilePlayableAudio[];
              samoPlaylistId?: string;
          }
        | null
        | undefined,
    serverConnection: ServerAuthenticationResult | null = null,
): void => {
    if (!samoAudio) {
        return;
    }

    if (!queue || !shouldMirrorPlaybackQueueToNative(queue)) {
        void samoAudio.setPlaybackQueue({ queueIndex: 0, queueItems: [] });
        return;
    }

    const credentialedQueue = attachNativeStreamCredentialsToQueue(queue, serverConnection);
    const offlineItems = credentialedQueue.items.map(resolveOfflinePlayable);
    void samoAudio.setPlaybackQueue({
        queueIndex: credentialedQueue.index,
        queueItems: offlineItems,
        source: offlineItems[credentialedQueue.index]?.source,
    });
};

const isNetworkPlaybackUrl = (url?: string) => Boolean(url && /^https?:\/\//i.test(url));

/**
 * Route a downloaded item's playback at its local file instead of the network
 * stream, so downloads play network-independently EVERYWHERE — not just the few
 * tap handlers that special-cased offline. Looked up by the item's progress
 * target id (the music-track / podcast-episode id) + content source. The
 * (credentialed) network URL is preserved on `castUrl` because the Chromecast
 * receiver can't read the phone's local files. No download / cold registry
 * leaves the item unchanged, so this can only ever swap to a real local copy.
 */
const resolveOfflinePlayable = (item: MobilePlayableAudio): MobilePlayableAudio => {
    const trackId = item.samoProgressTargetId;
    const sourceId = item.contentSourceId;
    if (!trackId || !sourceId) {
        return item;
    }
    const localUri = peekLocalDownloadForTrack(trackId, sourceId);
    if (!localUri || localUri === item.url) {
        return item;
    }
    return {
        ...item,
        castUrl: item.castUrl ?? (isNetworkPlaybackUrl(item.url) ? item.url : undefined),
        url: localUri,
    };
};

/** samo stream token auth in the query string — Chromecast cannot use httpHeaders. */
const hasSelfAuthenticatingStreamUrl = (url: string) =>
    /[?&]streamToken=/i.test(url);

const getCastNetworkUrl = (source: MobilePlayableAudio, castSource: MobilePlayableAudio) => {
    const candidates = [
        castSource.castUrl,
        castSource.url,
        source.castUrl,
        source.url,
    ];

    return candidates.find(isNetworkPlaybackUrl);
};

export const playAndroidAudio = async (
    source: MobilePlayableAudio,
    sessionId: string,
    castSource: MobilePlayableAudio = source,
    queue?: {
        index: number;
        items: MobilePlayableAudio[];
        samoPlaylistId?: string;
    },
    serverConnection: ServerAuthenticationResult | null = null,
) => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    // Defensive: the native side uses `subtitle` as the artist line on the
    // notification / lock-screen. A URL there is always wrong — older radio
    // recents persisted before buildRadioPlayback stopped storing the
    // homepage URL in subtitle still carry one. Strip anything that looks
    // like a URL so stale persisted data can't leak into the system UI.
    const bridgedSource = resolveOfflinePlayable(
        attachNativeStreamCredentials(source, serverConnection),
    );
    const bridgedCastSource = attachNativeStreamCredentials(castSource, serverConnection);

    const sanitizedSubtitle =
        bridgedSource.subtitle &&
        /^(https?:\/\/|www\.|[a-z]+:\/\/)/i.test(bridgedSource.subtitle.trim())
            ? undefined
            : bridgedSource.subtitle;

    // When a self-authenticating castUrl is provided (samo stream token in URL
    // params, or ABS `?token=…`), the cast leg doesn't need the headers the
    // local ExoPlayer uses. Forwarding them would trip the native guard
    // since the default Chromecast receiver can't send custom headers.
    const castUrl = getCastNetworkUrl(bridgedSource, bridgedCastSource);
    const hasSelfAuthCastUrl = Boolean(
        castUrl &&
            (castUrl === bridgedCastSource.castUrl ||
                castUrl === bridgedSource.castUrl ||
                ((castUrl === bridgedCastSource.url || castUrl === bridgedSource.url) &&
                    hasSelfAuthenticatingStreamUrl(castUrl))),
    );

    // Prefer an explicit castMimeType from the playable. ABS playables hand
    // us the local stream's mime (often application/x-mpegURL for HLS) on
    // `mimeType` and the direct-file mime on `castMimeType` — the cast leg
    // needs the latter because it's routing to a single file URL, not the
    // HLS playlist.
    const castMimeType =
        bridgedCastSource.castMimeType ??
        bridgedSource.castMimeType ??
        bridgedCastSource.mimeType;

    // The play() payload is AUTHORITATIVE for the native queue mirror: it
    // either carries the real queue, or an explicit EMPTY one. Omitting the
    // key preserves whatever mirror the engine already holds (that omission
    // is reserved for the engine's own internal playLocally calls during a
    // native advance) — so a fresh single-item or radio play that merely
    // omitted it left YESTERDAY'S queue armed, and the end of that item
    // auto-advanced into a stale playlist.
    const queuePayload =
        queue && shouldMirrorPlaybackQueueToNative(queue) && source.source !== 'radio'
            ? (() => {
                  const credentialed = attachNativeStreamCredentialsToQueue(
                      queue,
                      serverConnection,
                  );
                  return {
                      queueIndex: credentialed.index,
                      queueItems: credentialed.items.map(resolveOfflinePlayable),
                  };
              })()
            : { queueIndex: 0, queueItems: [] };

    return samoAudio.play({
        ...bridgedSource,
        castArtworkUrl: bridgedCastSource.artworkUrl,
        castHttpHeaders: hasSelfAuthCastUrl ? undefined : bridgedCastSource.httpHeaders,
        castIsLive: bridgedCastSource.isLive,
        castMimeType,
        castSubtitle: bridgedCastSource.subtitle,
        castTitle: bridgedCastSource.title,
        castUrl,
        sessionId,
        subtitle: sanitizedSubtitle,
        ...queuePayload,
    });
};

export const pauseAndroidAudio = async () => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.pause();
};

export const resumeAndroidAudio = async () => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.resume();
};

export const stopAndroidAudio = async () => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.stop();
};

/** Set the user's repeat mode. Native stores the setting and applies it to
 *  music playback only (Media3 handles the looping with zero JS in the loop). */
export const setAndroidRepeatMode = async (mode: AndroidRepeatMode) => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.setRepeatMode(mode);
};

export const seekAndroidAudio = async (positionMs: number) => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.seekTo(positionMs);
};

/**
 * Step the native queue to [index] — the SAME primitive the lock screen and
 * Bluetooth buttons use. On a loaded Media3 playlist this is an atomic
 * `seekTo(index, 0)`: gapless, instant, no player teardown, no new session.
 * Resolves `handled: false` when native can't take it (casting, no queue,
 * unknown index) so the caller falls back to a full JS-driven play.
 *
 * `expectedMediaId` makes the item id the authority and the index a hint —
 * native re-locates the target by id if the JS index is momentarily stale.
 *
 * Feature-detected: an older native binary without the method reports
 * unhandled instead of crashing the JS caller.
 */
export const playAndroidQueueIndex = async (
    index: number,
    expectedMediaId: string | null,
): Promise<AndroidNativePlaybackEvent & { handled?: boolean }> => {
    if (!samoAudio || typeof samoAudio.playQueueIndex !== 'function') {
        return { handled: false, status: 'idle' };
    }

    return samoAudio.playQueueIndex(index, expectedMediaId);
};

export const setAndroidSleepTimer = async (seconds: number) => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.setSleepTimer(seconds);
};

export const cancelAndroidSleepTimer = async () => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.cancelSleepTimer();
};

export const getAndroidAudioDeviceInfo = async () => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.getAudioDeviceInfo();
};

export const getAndroidPlaybackStatus = async () => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.getStatus();
};

export const updateAndroidNowPlayingMetadata = async (metadata: {
    artworkUrl?: string;
    id: string;
    sessionId: string;
    source: string;
    subtitle?: string;
    title: string;
}) => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.updateNowPlayingMetadata(metadata);
};

export const getAndroidCastState = async () => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.getCastState();
};

export const getAndroidOutputRoutes = async () => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.getOutputRoutes();
};

export const selectAndroidOutputRoute = async (route: AndroidMediaOutputRoute) => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.selectOutputRoute({
        deviceId: route.deviceId,
        kind: route.kind,
        routeId: route.routeId,
    });
};

export const subscribeToAndroidAudioEvents = (
    listener: (event: AndroidNativePlaybackEvent) => void,
) => {
    return eventEmitter?.addListener('SamoAudioPlaybackState', listener) ?? { remove: () => {} };
};

export const subscribeToAndroidCastEvents = (listener: (event: AndroidCastState) => void) => {
    return eventEmitter?.addListener('SamoAudioCastState', listener) ?? { remove: () => {} };
};

export const subscribeToAndroidOutputRouteEvents = (
    listener: (event: AndroidMediaOutputState) => void,
) => {
    return eventEmitter?.addListener('SamoAudioOutputRoutes', listener) ?? { remove: () => {} };
};

export interface AndroidStreamMetadataEvent {
    /** The item this announcement belongs to — a late event for the station
     *  you just left must not retitle the one you are on now. */
    mediaId?: string;
    /** The ICY stream title, verbatim. Empty when the station went quiet. */
    title?: string;
}

/**
 * Fires when the station being played announces a track (ICY), and only then.
 *
 * This is what a radio listener's "now playing" is made of. The announcement
 * is interleaved with the audio, so the player holding the stream is the only
 * thing that can read it — the server's copy is a periodic probe that is
 * usually describing a song that has already finished.
 */
export const subscribeToAndroidStreamMetadata = (
    listener: (event: AndroidStreamMetadataEvent) => void,
) => {
    return eventEmitter?.addListener('SamoAudioStreamMetadata', listener) ?? { remove: () => {} };
};

export interface AndroidNavigationRequestEvent {
    /** -1 for previous, +1 for next. */
    direction: number;
    /** The native session this request was born under; stale requests
     *  (user already started a new context) must be dropped by consumers. */
    sessionId?: string;
}

/**
 * Fires when the user taps Previous / Next on the notification, lock screen,
 * or hits a Bluetooth media-button. SamoForwardingPlayer surfaces these
 * commands as always-available so the buttons actually appear in the system
 * UI, but samo's queue lives in JavaScript — this event lets the React side
 * step the queue and call playAndroidAudio with the new track.
 */
export const subscribeToAndroidNavigationRequests = (
    listener: (event: AndroidNavigationRequestEvent) => void,
) => {
    return (
        eventEmitter?.addListener('SamoAudioNavigationRequest', listener) ?? {
            remove: () => {},
        }
    );
};
