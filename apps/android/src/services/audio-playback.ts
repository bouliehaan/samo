import { type MobilePlayableAudio } from '@samo/core/mobile';
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

export interface AndroidNativePlaybackEvent {
    bitPerfect?: AndroidPlaybackTruth;
    cast?: {
        deviceName?: string;
        isConnected: boolean;
    };
    durationMs?: number;
    isPlaying?: boolean;
    message?: string;
    positionMs?: number;
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
    | 'playing';

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
    removeListeners: (count: number) => void;
    resume: () => Promise<AndroidNativePlaybackEvent>;
    seekTo: (positionMs: number) => Promise<AndroidNativePlaybackEvent>;
    selectOutputRoute: (
        route: Pick<AndroidMediaOutputRoute, 'deviceId' | 'kind' | 'routeId'>,
    ) => Promise<AndroidMediaOutputState>;
    setSleepTimer: (seconds: number) => Promise<AndroidNativePlaybackEvent>;
    cancelSleepTimer: () => Promise<AndroidNativePlaybackEvent>;
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

const isNetworkPlaybackUrl = (url?: string) => Boolean(url && /^https?:\/\//i.test(url));

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
) => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    // Defensive: the native side uses `subtitle` as the artist line on the
    // notification / lock-screen. A URL there is always wrong — older radio
    // recents persisted before buildRadioPlayback stopped storing the
    // homepage URL in subtitle still carry one. Strip anything that looks
    // like a URL so stale persisted data can't leak into the system UI.
    const sanitizedSubtitle =
        source.subtitle && /^(https?:\/\/|www\.|[a-z]+:\/\/)/i.test(source.subtitle.trim())
            ? undefined
            : source.subtitle;

    // When a self-authenticating castUrl is provided (Subsonic auth in URL
    // params, or ABS `?token=…`), the cast leg doesn't need the headers the
    // local ExoPlayer uses. Forwarding them would trip the native guard
    // since the default Chromecast receiver can't send custom headers.
    const castUrl = getCastNetworkUrl(source, castSource);
    const hasSelfAuthCastUrl = Boolean(
        castUrl && (castUrl === castSource.castUrl || castUrl === source.castUrl),
    );

    // Prefer an explicit castMimeType from the playable. ABS playables hand
    // us the local stream's mime (often application/x-mpegURL for HLS) on
    // `mimeType` and the direct-file mime on `castMimeType` — the cast leg
    // needs the latter because it's routing to a single file URL, not the
    // HLS playlist.
    const castMimeType = castSource.castMimeType ?? source.castMimeType ?? castSource.mimeType;

    return samoAudio.play({
        ...source,
        castArtworkUrl: castSource.artworkUrl,
        castHttpHeaders: hasSelfAuthCastUrl ? undefined : castSource.httpHeaders,
        castIsLive: castSource.isLive,
        castMimeType,
        castSubtitle: castSource.subtitle,
        castTitle: castSource.title,
        castUrl,
        sessionId,
        subtitle: sanitizedSubtitle,
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

export const seekAndroidAudio = async (positionMs: number) => {
    if (!samoAudio) {
        throw new Error('Native Android audio engine is not available');
    }

    return samoAudio.seekTo(positionMs);
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

export interface AndroidNavigationRequestEvent {
    /** -1 for previous, +1 for next. */
    direction: number;
}

/**
 * Fires when the user taps Previous / Next on the notification, lock screen,
 * or hits a Bluetooth media-button. SamoForwardingPlayer surfaces these
 * commands as always-available so the buttons actually appear in the system
 * UI, but Samo's queue lives in JavaScript — this event lets the React side
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
