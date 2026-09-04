import { LogCategory, logFn } from '/@/shared/utils/logger';
// Module-level registry of every playback <audio> element this app's web
// players have spawned. We can't rely on React's unmount cleanup to pause
// audio because by the time a parent component's cleanup runs, child refs
// (player1Ref, player2Ref) have already been nulled, so the cleanup can
// silently no-op while the underlying <audio> keeps streaming.

export interface AudioElementRegistration {
    mediaKey: null | string;
    playerId: string;
    registeredAt: number;
    sessionId: null | string;
    source: null | string;
    updatedAt: number;
}

type RegisterAudioElementOptions = Partial<
    Pick<AudioElementRegistration, 'mediaKey' | 'playerId' | 'sessionId' | 'source'>
>;

const ACTIVE_AUDIO_ELEMENTS = new Map<HTMLAudioElement, AudioElementRegistration>();
const PLAYBACK_AUDIO_ROLE = 'playback';
let lastDuplicateWarningSignature: null | string = null;

const isDevelopment = () => process.env.NODE_ENV === 'development';

const handlePlaybackStateChange = () => {
    warnIfMultipleAudiblePlaybackElements();
};

const hasOption = <Key extends keyof RegisterAudioElementOptions>(
    options: RegisterAudioElementOptions,
    key: Key,
) => Object.prototype.hasOwnProperty.call(options, key);

const describeAudioElement = (audio: HTMLAudioElement, registration: AudioElementRegistration) => ({
    currentSrc: audio.currentSrc || audio.src || null,
    mediaKey: registration.mediaKey,
    paused: audio.paused,
    playerId: registration.playerId,
    readyState: audio.readyState,
    sessionId: registration.sessionId,
    source: registration.source,
});

const isPlayingPlaybackElement = (audio: HTMLAudioElement) => {
    return !audio.paused && !audio.ended && audio.readyState > HTMLMediaElement.HAVE_NOTHING;
};

const getDuplicateWarningKey = (
    audio: HTMLAudioElement,
    registration: AudioElementRegistration,
) => {
    if (registration.source === 'radio') return 'radio';
    const mediaKey = registration.mediaKey || audio.currentSrc || audio.src || 'unknown';
    return `${registration.source ?? 'unknown'}:${mediaKey}`;
};

export const warnIfMultipleAudiblePlaybackElements = () => {
    if (!isDevelopment()) return;

    const playing = [...ACTIVE_AUDIO_ELEMENTS.entries()].filter(([audio]) =>
        isPlayingPlaybackElement(audio),
    );
    const warningKeys = new Map<string, number>();

    playing.forEach(([audio, registration]) => {
        const key = getDuplicateWarningKey(audio, registration);
        warningKeys.set(key, (warningKeys.get(key) ?? 0) + 1);
    });

    const duplicates = playing.filter(([audio, registration]) => {
        return (warningKeys.get(getDuplicateWarningKey(audio, registration)) ?? 0) > 1;
    });

    if (duplicates.length <= 1) {
        lastDuplicateWarningSignature = null;
        return;
    }

    const signature = duplicates
        .map(
            ([audio, registration]) =>
                `${registration.sessionId}:${registration.playerId}:${audio.currentSrc || audio.src}`,
        )
        .sort()
        .join('|');

    if (signature === lastDuplicateWarningSignature) return;
    lastDuplicateWarningSignature = signature;

    logFn.warn('[samo playback] Multiple registered Web playback audio elements are playing.', {
        category: LogCategory.PLAYER,
        meta: {
            duplicates: duplicates.map(([audio, registration]) =>
                describeAudioElement(audio, registration),
            ),
        },
    });
};

export const registerAudioElement = (
    audio: HTMLAudioElement,
    options: RegisterAudioElementOptions = {},
) => {
    const now = Date.now();
    const previous = ACTIVE_AUDIO_ELEMENTS.get(audio);

    audio.dataset.samoAudioRole = PLAYBACK_AUDIO_ROLE;
    audio.removeEventListener('play', handlePlaybackStateChange);
    audio.removeEventListener('playing', handlePlaybackStateChange);
    audio.addEventListener('play', handlePlaybackStateChange);
    audio.addEventListener('playing', handlePlaybackStateChange);

    ACTIVE_AUDIO_ELEMENTS.set(audio, {
        mediaKey: hasOption(options, 'mediaKey')
            ? (options.mediaKey ?? null)
            : (previous?.mediaKey ?? null),
        playerId: hasOption(options, 'playerId')
            ? (options.playerId ?? 'web-player')
            : (previous?.playerId ?? 'web-player'),
        registeredAt: previous?.registeredAt ?? now,
        sessionId: hasOption(options, 'sessionId')
            ? (options.sessionId ?? null)
            : (previous?.sessionId ?? null),
        source: hasOption(options, 'source')
            ? (options.source ?? null)
            : (previous?.source ?? null),
        updatedAt: now,
    });

    warnIfMultipleAudiblePlaybackElements();
};

export const stopAudioElement = (audio: HTMLAudioElement) => {
    try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    } catch {
        // Element may already be detached / GC'd; nothing to do.
    }
};

export const unregisterAudioElement = (audio: HTMLAudioElement) => {
    stopAudioElement(audio);
    audio.removeEventListener('play', handlePlaybackStateChange);
    audio.removeEventListener('playing', handlePlaybackStateChange);
    ACTIVE_AUDIO_ELEMENTS.delete(audio);
    warnIfMultipleAudiblePlaybackElements();
};

// Pause, strip src, and force load() to abort any in-flight buffering.
// Intentionally keep mounted elements registered: ReactPlayer may reuse the
// same DOM node for the next URL, and onReady is not guaranteed to re-register
// that reused node.
//
// Defense-in-depth: also sweep every <audio> currently in the DOM. The
// long-standing "headless radio" bug is that ReactPlayer occasionally
// produces an <audio> element that never makes it through onReady (or makes
// it through and is then swapped internally), so the registry can't pause
// it. The orphaned element keeps streaming until the renderer is destroyed.
// The DOM sweep guarantees that even untracked elements are paused at every
// session boundary.
export const stopAllAudioElements = () => {
    ACTIVE_AUDIO_ELEMENTS.forEach((_registration, audio) => {
        stopAudioElement(audio);
    });

    if (typeof document !== 'undefined') {
        document.querySelectorAll<HTMLAudioElement>('audio').forEach((audio) => {
            if (ACTIVE_AUDIO_ELEMENTS.has(audio)) return;
            stopAudioElement(audio);
        });
    }

    warnIfMultipleAudiblePlaybackElements();
};
