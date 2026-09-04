import { type MobilePlayableAudio } from '@samo/core/mobile';
import { describe, expect, it } from 'vitest';

import { type AndroidNativePlaybackEvent } from '../services/audio-playback';
import {
    type ActiveAndroidPlaybackState,
    type AndroidPlaybackState,
} from '../types/playback';

import { reducePlaybackStateFromEvent } from './playback-reduce';

const makeItem = (id: string, source = 'music'): MobilePlayableAudio =>
    ({
        durationSeconds: 180,
        id,
        quality: {
            deliveryKind: 'direct',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        source,
        title: id,
        url: `https://example.test/${id}`,
    }) as unknown as MobilePlayableAudio;

const makeState = (
    overrides: Partial<ActiveAndroidPlaybackState> = {},
): AndroidPlaybackState =>
    ({
        durationMs: 180_000,
        item: makeItem('B'),
        positionMs: 1_000,
        sessionId: 'sessB',
        status: 'playing',
        ...overrides,
    }) as AndroidPlaybackState;

const makeEvent = (overrides: Partial<AndroidNativePlaybackEvent> = {}): AndroidNativePlaybackEvent => ({
    durationMs: 180_000,
    positionMs: 2_000,
    sessionId: 'sessB',
    source: { id: 'B' },
    status: 'playing',
    ...overrides,
});

describe('reducePlaybackStateFromEvent — foreign-event guard (Next-bleed bug)', () => {
    it('ignores a trailing tick for the PREVIOUS track (does not bleed its position onto the new one)', () => {
        // Snapshot says we are on B at 0:01. A trailing native tick for the
        // OUTGOING track A reports 0:52. This must NOT overwrite B's playhead.
        const current = makeState({ positionMs: 1_000 });
        const snapshot = { item: makeItem('B'), sessionId: 'sessB' };
        const event = makeEvent({ positionMs: 52_000, source: { id: 'A' }, sessionId: 'sessB' });

        const next = reducePlaybackStateFromEvent(current, event, snapshot);

        expect(next).toBe(current); // returned unchanged
        expect(next.status === 'idle' ? undefined : next.positionMs).toBe(1_000);
    });

    it('does not get pinned: subsequent real ticks for the new track DO advance it', () => {
        const current = makeState({ positionMs: 1_000 });
        const snapshot = { item: makeItem('B'), sessionId: 'sessB' };

        const afterForeign = reducePlaybackStateFromEvent(
            current,
            makeEvent({ positionMs: 52_000, source: { id: 'A' } }),
            snapshot,
        );
        const afterReal = reducePlaybackStateFromEvent(
            afterForeign,
            makeEvent({ positionMs: 2_000, source: { id: 'B' } }),
            snapshot,
        );

        expect(afterReal.status === 'idle' ? undefined : afterReal.positionMs).toBe(2_000);
    });

    it('processes an event whose source matches the active item normally', () => {
        const current = makeState({ positionMs: 1_000 });
        const snapshot = { item: makeItem('B'), sessionId: 'sessB' };
        const event = makeEvent({ positionMs: 3_000, source: { id: 'B' } });

        const next = reducePlaybackStateFromEvent(current, event, snapshot);

        expect(next.status === 'idle' ? undefined : next.positionMs).toBe(3_000);
    });
});

describe('reducePlaybackStateFromEvent — pending-seek grace (backward-seek stuck bug)', () => {
    const snapshot = { item: makeItem('B'), sessionId: 'sessB' };

    it('holds the optimistic target against a stale far echo during the grace window', () => {
        const current = makeState({
            pendingSeekAtMs: 10_000,
            pendingSeekTargetMs: 6_000,
            positionMs: 6_000,
        });
        // A stale pre-seek echo reports the OLD forward position 60s, 100ms after the seek.
        const event = makeEvent({ positionMs: 60_000, source: { id: 'B' } });

        const next = reducePlaybackStateFromEvent(current, event, snapshot, {
            now: () => 10_100,
        });

        const state = next.status === 'idle' ? undefined : next;
        expect(state?.positionMs).toBe(6_000);
        expect(state?.pendingSeekTargetMs).toBe(6_000); // still held
    });

    it('accepts and releases the grace once a near-target sample lands', () => {
        const current = makeState({
            pendingSeekAtMs: 10_000,
            pendingSeekTargetMs: 6_000,
            positionMs: 6_000,
        });
        const event = makeEvent({ positionMs: 6_200, source: { id: 'B' } });

        const next = reducePlaybackStateFromEvent(current, event, snapshot, {
            now: () => 10_200,
        });

        const state = next.status === 'idle' ? undefined : next;
        expect(state?.positionMs).toBe(6_200);
        expect(state?.pendingSeekTargetMs).toBeUndefined();
        expect(state?.pendingSeekAtMs).toBeUndefined();
    });

    it('releases the grace after it expires even if nothing near-target arrives', () => {
        const current = makeState({
            pendingSeekAtMs: 10_000,
            pendingSeekTargetMs: 6_000,
            positionMs: 6_000,
        });
        const event = makeEvent({ positionMs: 60_000, source: { id: 'B' } });

        const next = reducePlaybackStateFromEvent(current, event, snapshot, {
            now: () => 10_000 + 1_600, // past PLAYBACK_PENDING_SEEK_GRACE_MS (1500)
        });

        const state = next.status === 'idle' ? undefined : next;
        expect(state?.pendingSeekTargetMs).toBeUndefined();
        expect(state?.pendingSeekAtMs).toBeUndefined();
    });
});

describe('reducePlaybackStateFromEvent — track-start anchor (music Next at 0:52)', () => {
    const snapshot = { item: makeItem('B'), sessionId: 'sessB' };

    it('holds a freshly-started music track at 0 against the previous track\'s 0:52 tick', () => {
        // playQueuedItem armed the anchor at the start: target 0 (music starts
        // at 0). A trailing tick for the song we skipped FROM reports 52s with
        // the NEW session/source (identity guard can't catch it). It must be
        // held off, not written onto the new track's playhead.
        const current = makeState({
            pendingSeekAtMs: 1_000,
            pendingSeekTargetMs: 0,
            positionMs: 0,
            status: 'buffering',
        });
        const event = makeEvent({ positionMs: 52_000, source: { id: 'B' }, status: 'playing' });

        const next = reducePlaybackStateFromEvent(current, event, snapshot, {
            now: () => 1_100,
        });

        const state = next.status === 'idle' ? undefined : next;
        expect(state?.positionMs).toBe(0);
        expect(state?.pendingSeekTargetMs).toBe(0); // still anchored
    });

    it('releases the anchor and starts counting once the new track reports near 0', () => {
        const current = makeState({
            pendingSeekAtMs: 1_000,
            pendingSeekTargetMs: 0,
            positionMs: 0,
            status: 'playing',
        });
        const event = makeEvent({ positionMs: 300, source: { id: 'B' }, status: 'playing' });

        const next = reducePlaybackStateFromEvent(current, event, snapshot, {
            now: () => 1_200,
        });

        const state = next.status === 'idle' ? undefined : next;
        expect(state?.positionMs).toBe(300);
        expect(state?.pendingSeekTargetMs).toBeUndefined();
    });
});

describe('reducePlaybackStateFromEvent — live station metadata', () => {
    it('keeps the now-playing the metadata sync wrote, rather than the snapshot it was opened with', () => {
        // A live station's snapshot is stamped when the stream opens and is
        // never re-stamped while it plays — the item id does not change when
        // the station moves on. The now-playing line is written onto the
        // playing item instead, so adopting the snapshot on every position
        // tick pinned the display to whatever was airing at tune-in.
        const opened = { ...makeItem('chan', 'radio'), title: 'Car Talk' };
        const airing = { ...makeItem('chan', 'radio'), title: "Stavvy's World" };
        const current = makeState({ item: airing, positionMs: 1_000 });
        const event = makeEvent({ positionMs: 30_000, source: { id: 'chan' } });

        const next = reducePlaybackStateFromEvent(current, event, {
            item: opened,
            sessionId: 'sessB',
        });

        expect(next.status === 'idle' ? undefined : next.item.title).toBe("Stavvy's World");
    });

    it('still adopts the snapshot when the track genuinely changed', () => {
        // The id is what says "different item", and there the snapshot is the
        // one that knows — this is the native auto-advance path.
        const current = makeState({ item: makeItem('A'), positionMs: 170_000 });
        const event = makeEvent({ positionMs: 500, source: { id: 'B' } });

        const next = reducePlaybackStateFromEvent(current, event, {
            item: makeItem('B'),
            sessionId: 'sessB',
        });

        expect(next.status === 'idle' ? undefined : next.item.id).toBe('B');
    });
});

describe('reducePlaybackStateFromEvent — observed delivery format', () => {
    const opus = { bitRate: null, channelCount: 2, codec: 'audio/opus', sampleRate: 48_000 };

    it('adopts the format the engine reports', () => {
        const next = reducePlaybackStateFromEvent(
            makeState(),
            makeEvent({ decodedFormat: opus }),
            null,
        );

        expect(next.status !== 'idle' && next.decodedFormat).toEqual(opus);
    });

    it('keeps the previous object identity when the format has not changed', () => {
        // Native re-sends the format on every emit. A fresh identity here would
        // mark the state dirty on each position tick and re-render the player.
        const current = makeState({ decodedFormat: opus });
        const next = reducePlaybackStateFromEvent(
            current,
            makeEvent({ decodedFormat: { ...opus } }),
            null,
        );

        expect(next.status !== 'idle' && next.decodedFormat).toBe(
            current.status !== 'idle' ? current.decodedFormat : undefined,
        );
    });

    it('drops the outgoing track format when the track changes and none is reported', () => {
        const next = reducePlaybackStateFromEvent(
            makeState({ decodedFormat: opus }),
            makeEvent({ source: { id: 'C' } }),
            { item: makeItem('C'), sessionId: 'sessB' },
        );

        expect(next.status !== 'idle' && next.decodedFormat).toBeUndefined();
    });

    it('holds the format across a tick on the same track that reports none', () => {
        // The cast path reports no decoded format at all; a same-track tick
        // must not be read as "the delivery changed".
        const next = reducePlaybackStateFromEvent(
            makeState({ decodedFormat: opus }),
            makeEvent(),
            null,
        );

        expect(next.status !== 'idle' && next.decodedFormat).toEqual(opus);
    });
});
