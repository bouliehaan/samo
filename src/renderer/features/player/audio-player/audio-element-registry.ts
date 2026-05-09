// Module-level registry of every <audio> element this app's web players
// have spawned. We can't rely on React's unmount cleanup to pause audio
// because by the time a parent component's cleanup runs, child refs
// (player1Ref, player2Ref) have already been nulled — so the cleanup
// silently no-ops while the underlying <audio> keeps streaming. Tracking
// the elements here gives the playback owner a way to forcibly silence
// any leftover stream when the source changes.

const ACTIVE_AUDIO_ELEMENTS = new Set<HTMLAudioElement>();

export const registerAudioElement = (audio: HTMLAudioElement) => {
    ACTIVE_AUDIO_ELEMENTS.add(audio);
};

export const unregisterAudioElement = (audio: HTMLAudioElement) => {
    try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    } catch {
        // Element may already be detached / GC'd; nothing to do.
    }
    ACTIVE_AUDIO_ELEMENTS.delete(audio);
};

// Nuclear: pause, strip src, force a load() to abort any in-flight buffering,
// and drop the element from the registry. Use this on every source-change /
// station-switch / release path — the whole point of the backstop is to
// guarantee nothing the previous owner spawned can keep streaming. The next
// mount will register fresh elements via onReady.
export const stopAllAudioElements = () => {
    ACTIVE_AUDIO_ELEMENTS.forEach((audio) => {
        try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        } catch {
            // Element may already be detached / GC'd; nothing to do.
        }
    });
    ACTIVE_AUDIO_ELEMENTS.clear();
};
