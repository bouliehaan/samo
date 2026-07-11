import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MobilePlayableAudio } from '@samo/core/mobile';

import type { AndroidPlaybackState } from '../types/playback';

import {
    getResumePositionSeconds,
    mergePreparedQueueItem,
    refreshPlayableResumeFromServer,
} from './playback-resume';

// vitest hoists vi.hoisted + vi.mock above the imports above, so these apply.
const { getNativeResumeProgressMock, loadAbsCurrentProgressMock } = vi.hoisted(() => ({
    getNativeResumeProgressMock: vi.fn(),
    loadAbsCurrentProgressMock: vi.fn(),
}));

vi.mock('../services/abs-progress', () => ({
    loadAbsCurrentProgress: loadAbsCurrentProgressMock,
}));

vi.mock('./native-resume', () => ({
    getNativeResumeProgress: getNativeResumeProgressMock,
}));

vi.mock('@samo/core/server', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@samo/core/server')>();
    return {
        ...actual,
        ensureSamoStreamToken: async () => undefined,
        findServerAuthenticationForSource: () => ({
            credential: 'tok',
            type: 'samo',
            url: 'https://samo',
        }),
    };
});

const baseItem = (overrides: Partial<MobilePlayableAudio> = {}): MobilePlayableAudio => ({
    id: 'samo:https://samo:music:track-1',
    quality: {
        deliveryKind: 'unknown',
        losslessRequired: false,
        serverTranscodeRequested: false,
    },
    source: 'music',
    title: 'Track One',
    url: 'https://samo/api/v1/music/tracks/track-1/stream?stream_token=old',
    ...overrides,
});

describe('mergePreparedQueueItem', () => {
    it('adopts refreshed URLs without inheriting the session start position', () => {
        // The regression this locks: a mid-track recovery restart prepared the
        // item with initialPositionSeconds=10 and wrote it back into the queue
        // slot — after which EVERY entry into that slot (native auto-advance,
        // lock-screen skip, Prev) started the song 10 seconds in.
        const original = baseItem();
        const prepared = baseItem({
            artworkUrl: 'https://samo/api/v1/music/albums/a1/cover?stream_token=fresh',
            initialPositionSeconds: 10,
            url: 'https://samo/api/v1/music/tracks/track-1/stream?stream_token=fresh',
        });

        const merged = mergePreparedQueueItem(original, prepared);

        expect(merged.url).toBe(prepared.url);
        expect(merged.artworkUrl).toBe(prepared.artworkUrl);
        expect(merged.initialPositionSeconds).toBeUndefined();
    });

    it('keeps the build-time resume the queue slot was created with', () => {
        // Podcast/audiobook slots legitimately carry a resume point from queue
        // build time; a session-level refresh must not clobber it (the slot is
        // durable, the session position is transient).
        const original = baseItem({
            initialPositionSeconds: 1700,
            source: 'podcast',
        });
        const prepared = baseItem({
            initialPositionSeconds: 1800,
            source: 'podcast',
            url: 'https://samo/api/v1/podcasts/episodes/e1/stream?stream_token=fresh',
        });

        const merged = mergePreparedQueueItem(original, prepared);

        expect(merged.initialPositionSeconds).toBe(1700);
        expect(merged.url).toBe(prepared.url);
    });

    it('returns the prepared item untouched when start positions already agree', () => {
        const original = baseItem({ initialPositionSeconds: 42 });
        const prepared = baseItem({
            initialPositionSeconds: 42,
            url: 'https://samo/api/v1/music/tracks/track-1/stream?stream_token=fresh',
        });

        expect(mergePreparedQueueItem(original, prepared)).toBe(prepared);
    });

    it('strips a transient resume even when the original never had one', () => {
        const original = baseItem();
        const prepared = baseItem({ initialPositionSeconds: 130 });

        const merged = mergePreparedQueueItem(original, prepared);

        expect('initialPositionSeconds' in merged).toBe(false);
    });
});

describe('getResumePositionSeconds', () => {
    // THE fundamental bug: returning to an audiobook from radio. The live
    // playback state is the RADIO (playing, different id), so the playhead-reuse
    // guard fails. The audiobook branch used to `return 0` here — discarding the
    // resume position that refreshPlayableResumeFromServer / the queue build had
    // baked into item.initialPositionSeconds. So the value reached the progress
    // writer but never became a seek, and the book played from 0.
    it('honors the item resume position for an audiobook when not reusing the playhead', () => {
        const item = baseItem({
            id: 'samo:https://samo:audiobook:book-7:file:mf-3',
            initialPositionSeconds: 2526,
            progressOffsetSeconds: 0,
            source: 'audiobook',
        });
        const playingRadio = {
            item: baseItem({ id: 'samo:https://samo:internet-radio:r1', source: 'radio' }),
            positionMs: 5_000,
            status: 'playing',
        } as unknown as AndroidPlaybackState;

        expect(getResumePositionSeconds(item, playingRadio)).toBe(2526);
    });

    it('still reuses the live playhead for an audiobook paused on the same item', () => {
        const item = baseItem({
            id: 'samo:https://samo:audiobook:book-7:file:mf-3',
            progressOffsetSeconds: 0,
            source: 'audiobook',
        });
        const pausedSame = {
            item,
            positionMs: 90_000,
            status: 'paused',
        } as unknown as AndroidPlaybackState;

        expect(getResumePositionSeconds(item, pausedSame)).toBe(90);
    });
});

describe('refreshPlayableResumeFromServer', () => {
    beforeEach(() => {
        loadAbsCurrentProgressMock.mockReset();
        getNativeResumeProgressMock.mockReset();
        getNativeResumeProgressMock.mockResolvedValue(null);
    });

    // THE regression: audiobook queue ids are the per-file form
    // `…:audiobook:<bookId>:file:<mediaFileId>`, but resume used a bare
    // `/:audiobook:([^:]+)$/` that never matched it → the server position was
    // never loaded → every book resumed at 0 (and looked like "no cross-device
    // sync" even though the native writer had saved progress).
    it('loads + applies server resume for a per-file audiobook id', async () => {
        loadAbsCurrentProgressMock.mockResolvedValue({
            currentTimeSeconds: 1234,
            isFinished: false,
        });

        const item = baseItem({
            contentSourceId: 'samo:https://samo',
            id: 'samo:https://samo:audiobook:book-7:file:mf-3',
            source: 'audiobook',
            url: 'https://samo/api/v1/audiobooks/book-7/stream?mediaFileId=mf-3',
        });

        const result = await refreshPlayableResumeFromServer(item, null);

        // Keyed on the BOOK id, not the per-file id.
        expect(loadAbsCurrentProgressMock).toHaveBeenCalledWith(expect.anything(), 'book-7');
        expect(result.initialPositionSeconds).toBe(1234);
    });

    it('leaves the item untouched when the server has no progress and no cache', async () => {
        loadAbsCurrentProgressMock.mockResolvedValue(null);

        const item = baseItem({
            contentSourceId: 'samo:https://samo',
            id: 'samo:https://samo:audiobook:book-7:file:mf-3',
            source: 'audiobook',
        });

        const result = await refreshPlayableResumeFromServer(item, null);

        expect(result.initialPositionSeconds).toBeUndefined();
    });

    // The flaky-LAN fix: when the live server read fails (returns null), resume
    // from the native local cache instead of restarting the book at 0 — which is
    // what then overwrote the good server position. Repro: scrub to 42 min →
    // switch to radio → switch back during a momentary LAN drop → reset to 0.
    it('falls back to the native resume cache when the server read fails', async () => {
        loadAbsCurrentProgressMock.mockResolvedValue(null);
        getNativeResumeProgressMock.mockResolvedValue({
            completed: false,
            progressSeconds: 2526,
        });

        const item = baseItem({
            contentSourceId: 'samo:https://samo',
            id: 'samo:https://samo:audiobook:book-7:file:mf-3',
            source: 'audiobook',
        });

        const result = await refreshPlayableResumeFromServer(item, null);

        expect(getNativeResumeProgressMock).toHaveBeenCalledWith('audiobook', 'book-7');
        expect(result.initialPositionSeconds).toBe(2526);
    });

    it('prefers the server position over the cache when the server answers', async () => {
        loadAbsCurrentProgressMock.mockResolvedValue({
            currentTimeSeconds: 1234,
            isFinished: false,
        });
        getNativeResumeProgressMock.mockResolvedValue({
            completed: false,
            progressSeconds: 9999,
        });

        const item = baseItem({
            contentSourceId: 'samo:https://samo',
            id: 'samo:https://samo:audiobook:book-7:file:mf-3',
            source: 'audiobook',
        });

        const result = await refreshPlayableResumeFromServer(item, null);

        expect(result.initialPositionSeconds).toBe(1234);
        expect(getNativeResumeProgressMock).not.toHaveBeenCalled();
    });
});
