import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type AndroidPlaybackState } from '../types/playback';

const native = vi.hoisted(() => ({ setAndroidScreenAwake: vi.fn<(held: boolean) => void>() }));
vi.mock('../services/audio-playback', () => native);

const load = async () => {
    const store = await import('../state/playback-store');
    const { installTvScreenAwake } = await import('./tv-screen-awake');
    const status = (next: AndroidPlaybackState['status']) =>
        store.setAndroidPlaybackState(
            next === 'idle'
                ? { status: 'idle' }
                : { item: { id: 'track:1' } as never, sessionId: 's1', status: next },
        );
    return { installTvScreenAwake, status };
};
const sent = () => native.setAndroidScreenAwake.mock.calls.map(([held]) => held);

beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    native.setAndroidScreenAwake.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('TV screen stays awake for a program', () => {
    it('tells native the starting state, then holds once for a playing program', async () => {
        const { installTvScreenAwake, status } = await load();
        installTvScreenAwake();
        installTvScreenAwake();
        expect(sent()).toEqual([false]);
        status('loading');
        status('buffering');
        status('playing');
        status('playing');
        expect(sent()).toEqual([false, true]);
    });

    it('keeps holding through a step to the next item', async () => {
        const { installTvScreenAwake, status } = await load();
        status('playing');
        installTvScreenAwake();
        status('ended');
        vi.advanceTimersByTime(1_000);
        status('loading');
        vi.advanceTimersByTime(10_000);
        status('playing');
        expect(sent()).toEqual([true]);
    });

    it('holds while the engine waits for the network to come back', async () => {
        const { installTvScreenAwake, status } = await load();
        status('playing');
        installTvScreenAwake();
        status('waiting_for_network');
        vi.advanceTimersByTime(60_000);
        expect(sent()).toEqual([true]);
    });

    it('lets the TV idle once playback stops and nothing resumes', async () => {
        const { installTvScreenAwake, status } = await load();
        status('playing');
        installTvScreenAwake();
        status('paused');
        vi.advanceTimersByTime(4_999);
        expect(sent()).toEqual([true]);
        vi.advanceTimersByTime(1);
        expect(sent()).toEqual([true, false]);
        status('error');
        status('idle');
        vi.advanceTimersByTime(10_000);
        expect(sent()).toEqual([true, false]);
    });
});
