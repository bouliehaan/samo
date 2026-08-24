import { beforeEach, describe, expect, it, vi } from 'vitest';

// The renderer's logger reads its level from localStorage at import time, and
// this suite runs in the node environment. Hoisted so it is in place before the
// module graph below is evaluated.
vi.hoisted(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => [...store.keys()][index] ?? null,
        get length() {
            return store.size;
        },
        removeItem: (key: string) => void store.delete(key),
        setItem: (key: string, value: string) => void store.set(key, String(value)),
    } as Storage;
});

// The renderer's store barrel drags in the settings schemas, which run DOMPurify
// at import time and need a real DOM this project has no test environment for.
// So the transport is stubbed down to the one property that matters here: it
// keeps a status, and it notifies its subscribers SYNCHRONOUSLY on a change,
// which is what re-enters play(). The radio store and the playback-owner store
// — the two actually under test — stay real.
const transport = vi.hoisted(() => {
    type Status = 'paused' | 'playing';
    const listeners = new Set<(status: Status, previous: Status) => void>();
    let status: Status = 'paused';

    const move = (next: Status) => {
        if (next === status) return;
        const previous = status;
        status = next;
        listeners.forEach((listener) => listener(status, previous));
    };

    return {
        listeners,
        mediaPause: () => move('paused'),
        mediaPlay: () => move('playing'),
        mediaStop: () => move('paused'),
        reset: () => {
            status = 'paused';
            listeners.clear();
        },
    };
});

vi.mock('/@/renderer/store', () => ({
    useCurrentServerWithCredential: () => null,
    usePlayerStoreBase: {
        getState: () => ({
            mediaPause: transport.mediaPause,
            mediaPlay: transport.mediaPlay,
            mediaStop: transport.mediaStop,
        }),
    },
}));

vi.mock('/@/renderer/store/last-playback-session.store', () => ({
    useLastPlaybackSessionStore: { getState: () => ({ actions: { setSession: () => {} } }) },
}));

vi.mock('/@/renderer/store/play-history.store', () => ({ recordRecentItem: () => {} }));

vi.mock('/@/renderer/api/samo/samo-fetch', () => ({ samoFetch: async () => ({}) }));

import { useRadioStore } from '/@/renderer/features/radio/hooks/use-radio-player';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';

/**
 * One press of Play must produce exactly ONE audio stream.
 *
 * The radio pipeline used to run its side effects inside the zustand `set()`
 * updater, and zustand does not commit until that updater returns. `mediaPlay()`
 * — called from in there — takes the transport PAUSED→PLAYING and notifies
 * synchronously, and `useRadioAudioInstance` answers that by calling
 * `actions.play()` again. That re-entrant call read the not-yet-committed
 * `isPlaying: false`, walked straight past the idempotency guard, and ran the
 * whole pipeline a second time.
 *
 * Two passes mean two sessions, two sweeps of every <audio>, and — because
 * every isPlaying-keyed effect runs again, including the ICY metadata poll — a
 * second real connection to the station. On SiriusXM two concurrent connections
 * are indistinguishable from account sharing.
 *
 * `claim()` is the observable: it is what mints a playback session, so counting
 * sessions counts streams.
 */

const STATION_A = 'http://server.test/internet-radio/a/stream';
const STATION_B = 'http://server.test/internet-radio/b/stream';

/** Counts every session `claim()` mints while `run` executes. */
const countClaims = (run: () => void) => {
    let claims = 0;
    const unsubscribe = usePlaybackOwnerStore.subscribe(
        (state) => state.session.id,
        () => {
            claims += 1;
        },
    );

    try {
        run();
    } finally {
        unsubscribe();
    }

    return claims;
};

/**
 * `useRadioAudioInstance`, without React hosting it: a transport transition
 * calls back into the radio store.
 *
 * Deliberately NOT re-entrancy-guarded. The store is what has to stop the
 * second pass; a guard here would hide the bug this file exists for.
 */
const withTransportEcho = (run: () => void) => {
    const echo = (status: 'paused' | 'playing', previous: 'paused' | 'playing') => {
        if (!useRadioStore.getState().currentStreamUrl) return;
        if (status === 'playing' && previous === 'paused') {
            useRadioStore.getState().actions.play();
        } else if (status === 'paused' && previous === 'playing') {
            useRadioStore.getState().actions.pause();
        }
    };
    transport.listeners.add(echo);

    try {
        run();
    } finally {
        transport.listeners.delete(echo);
    }
};

describe('radio play idempotency', () => {
    beforeEach(() => {
        transport.reset();
        useRadioStore.setState({
            currentStationArt: null,
            currentStreamUrl: null,
            isPlaying: false,
            metadata: null,
            stationName: null,
        });
    });

    it('claims exactly one session when a station is first tuned', () => {
        const claims = countClaims(() => {
            useRadioStore.getState().actions.play(STATION_A, 'Station A');
        });

        expect(claims).toBe(1);
        expect(useRadioStore.getState().isPlaying).toBe(true);
        expect(useRadioStore.getState().currentStreamUrl).toBe(STATION_A);
    });

    it('ignores a redundant play for the station already playing', () => {
        useRadioStore.getState().actions.play(STATION_A, 'Station A');

        const claims = countClaims(() => {
            useRadioStore.getState().actions.play(STATION_A, 'Station A');
            useRadioStore.getState().actions.play();
        });

        expect(claims).toBe(0);
    });

    // THE REGRESSION, and the press that reproduces it: resume after a pause.
    //
    // Here the pre-update state is the one combination the stale read could not
    // survive — a station already tuned, but isPlaying false. The re-entrant
    // pass saw exactly that, so the guard's URL test matched while its
    // isPlaying test did not, and the pipeline ran twice for one press.
    it('claims one session when resuming a paused station and the transport echoes back', () => {
        useRadioStore.getState().actions.play(STATION_A, 'Station A');
        useRadioStore.getState().actions.pause();

        let claims = 0;
        withTransportEcho(() => {
            claims = countClaims(() => {
                useRadioStore.getState().actions.play();
            });
        });

        expect(claims).toBe(1);
        expect(useRadioStore.getState().isPlaying).toBe(true);
        expect(useRadioStore.getState().currentStreamUrl).toBe(STATION_A);
    });

    // Same stale read, reached by tuning the station that is already loaded but
    // paused — the "press play on the row that is already selected" gesture.
    it('claims one session when re-tuning a paused station explicitly', () => {
        useRadioStore.getState().actions.play(STATION_A, 'Station A');
        useRadioStore.getState().actions.pause();

        let claims = 0;
        withTransportEcho(() => {
            claims = countClaims(() => {
                useRadioStore.getState().actions.play(STATION_A, 'Station A');
            });
        });

        expect(claims).toBe(1);
    });

    // Switching stations from paused: the re-entrant pass took no arguments, so
    // it re-ran the pipeline for the OUTGOING station and left the session's
    // mediaKey naming a station that was not playing.
    it('leaves the session pointing at the incoming station after a switch', () => {
        useRadioStore.getState().actions.play(STATION_A, 'Station A');
        useRadioStore.getState().actions.pause();

        let claims = 0;
        withTransportEcho(() => {
            claims = countClaims(() => {
                useRadioStore.getState().actions.play(STATION_B, 'Station B');
            });
        });

        expect(claims).toBe(1);
        expect(useRadioStore.getState().currentStreamUrl).toBe(STATION_B);
        expect(usePlaybackOwnerStore.getState().session.mediaKey).toBe(STATION_B);
    });
});
