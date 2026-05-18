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
        productName?: string;
        sampleRates?: number[];
        type?: string;
    }>;
    outputSampleRate?: string;
}

export interface AndroidNativePlaybackEvent {
    bitPerfect?: AndroidPlaybackTruth;
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
    getStatus: () => Promise<AndroidNativePlaybackEvent>;
    pause: () => Promise<AndroidNativePlaybackEvent>;
    play: (
        source: MobilePlayableAudio & { sessionId: string },
    ) => Promise<AndroidNativePlaybackEvent>;
    removeListeners: (count: number) => void;
    resume: () => Promise<AndroidNativePlaybackEvent>;
    seekTo: (positionMs: number) => Promise<AndroidNativePlaybackEvent>;
    stop: () => Promise<AndroidNativePlaybackEvent>;
}

const samoAudio = NativeModules.SamoAudio as SamoAudioNativeModule | undefined;
const eventEmitter = samoAudio ? new NativeEventEmitter(samoAudio) : null;

export const isAndroidNativePlaybackAvailable = () => Boolean(samoAudio);

export const playAndroidAudio = async (source: MobilePlayableAudio, sessionId: string) => {
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

    return samoAudio.play({ ...source, sessionId, subtitle: sanitizedSubtitle });
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

export const subscribeToAndroidAudioEvents = (
    listener: (event: AndroidNativePlaybackEvent) => void,
) => {
    return eventEmitter?.addListener('SamoAudioPlaybackState', listener) ?? { remove: () => {} };
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
