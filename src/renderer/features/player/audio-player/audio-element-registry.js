import { LogCategory, logFn } from '/@/renderer/utils/logger';
const ACTIVE_AUDIO_ELEMENTS = new Map();
const PLAYBACK_AUDIO_ROLE = 'playback';
let lastDuplicateWarningSignature = null;
const isDevelopment = () => process.env.NODE_ENV === 'development';
const handlePlaybackStateChange = () => {
    warnIfMultipleAudiblePlaybackElements();
};
const hasOption = (options, key) => Object.prototype.hasOwnProperty.call(options, key);
const describeAudioElement = (audio, registration) => ({
    currentSrc: audio.currentSrc || audio.src || null,
    mediaKey: registration.mediaKey,
    paused: audio.paused,
    playerId: registration.playerId,
    readyState: audio.readyState,
    sessionId: registration.sessionId,
    source: registration.source,
});
const isPlayingPlaybackElement = (audio) => {
    return !audio.paused && !audio.ended && audio.readyState > HTMLMediaElement.HAVE_NOTHING;
};
const getDuplicateWarningKey = (audio, registration) => {
    if (registration.source === 'radio')
        return 'radio';
    const mediaKey = registration.mediaKey || audio.currentSrc || audio.src || 'unknown';
    return `${registration.source ?? 'unknown'}:${mediaKey}`;
};
export const warnIfMultipleAudiblePlaybackElements = () => {
    if (!isDevelopment())
        return;
    const playing = [...ACTIVE_AUDIO_ELEMENTS.entries()].filter(([audio]) => isPlayingPlaybackElement(audio));
    const warningKeys = new Map();
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
        .map(([audio, registration]) => `${registration.sessionId}:${registration.playerId}:${audio.currentSrc || audio.src}`)
        .sort()
        .join('|');
    if (signature === lastDuplicateWarningSignature)
        return;
    lastDuplicateWarningSignature = signature;
    logFn.warn('[Samo playback] Multiple registered Web playback audio elements are playing.', {
        category: LogCategory.PLAYER,
        meta: {
            duplicates: duplicates.map(([audio, registration]) => describeAudioElement(audio, registration)),
        },
    });
};
export const registerAudioElement = (audio, options = {}) => {
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
export const stopAudioElement = (audio) => {
    try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    }
    catch {
        // Element may already be detached / GC'd; nothing to do.
    }
};
export const unregisterAudioElement = (audio) => {
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
export const stopAllAudioElements = () => {
    ACTIVE_AUDIO_ELEMENTS.forEach((_registration, audio) => {
        stopAudioElement(audio);
    });
    warnIfMultipleAudiblePlaybackElements();
};
