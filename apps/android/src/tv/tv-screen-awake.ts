import { setAndroidScreenAwake } from '../services/audio-playback';
import { getAndroidPlaybackState, subscribeAndroidPlaybackState } from '../state/playback-store';
import { type AndroidPlaybackState } from '../types/playback';

/**
 * While samo plays, the TV stays on the way it does for live TV: no
 * screensaver, and no sleep timer switching the set off under the music.
 * The window flag is applied natively (SamoScreenAwake.kt); this decides
 * when a program is on.
 *
 * A program is on while playback is starting, playing, or getting itself
 * back without anyone touching the remote: `buffering` covers the engine's
 * own retries, and `waiting_for_network` resumes the moment the network
 * returns. Releasing there would turn a ten-second Wi-Fi drop into the TV
 * switching off. Pause, the end of the queue, a sleep timer, and errors that
 * need a person all end it, and the TV's own idle timers take over.
 */
const isProgramOn = (state: AndroidPlaybackState) =>
    state.status === 'loading' ||
    state.status === 'buffering' ||
    state.status === 'playing' ||
    state.status === 'waiting_for_network';

/**
 * A step between queue items passes through `ended` (or a brief `paused` /
 * `error`) before the next item reports `loading`. Releasing on that would
 * let Android start the screensaver between two songs: by then the last
 * remote press is usually long past the screen timeout, so it acts at once.
 * The hold is taken immediately and given up only once nothing has resumed
 * for this long.
 */
const RELEASE_SETTLE_MS = 5_000;

let installed = false;
let held = false;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

const sync = () => {
    if (isProgramOn(getAndroidPlaybackState())) {
        if (releaseTimer) {
            clearTimeout(releaseTimer);
            releaseTimer = null;
        }
        if (!held) {
            held = true;
            setAndroidScreenAwake(true);
        }
        return;
    }
    if (!held || releaseTimer) return;
    releaseTimer = setTimeout(() => {
        releaseTimer = null;
        held = false;
        setAndroidScreenAwake(false);
    }, RELEASE_SETTLE_MS);
};

export const installTvScreenAwake = () => {
    if (installed) return;
    installed = true;
    // Native outlives a JS reload with whatever it was last told, so the
    // first state is always sent rather than assumed.
    held = isProgramOn(getAndroidPlaybackState());
    setAndroidScreenAwake(held);
    subscribeAndroidPlaybackState(sync);
};
