import { describe, expect, it } from 'vitest';

import type { BandFrame } from './visualizer-graph';

import {
    ANALYSIS_FRAME_SAMPLES,
    BAND_COUNT,
    buildGraph,
    createBandParser,
    createFrameScheduler,
    crossoverPoints,
    FILTER_LABEL,
    filterSpec,
    FLOOR_DB,
} from './visualizer-graph';

describe('buildGraph', () => {
    it('leaves the playback branch untouched', () => {
        const graph = buildGraph('/tmp/x.fifo');

        // The whole point: what you hear must be what mpv decoded. The analysis
        // branch has to dead-end, and playback has to pass through unmodified.
        expect(graph).toContain('asplit=2[play][analyse]');
        expect(graph).toContain('[play]acopy');
        expect(graph).toContain('[printed]anullsink');
    });

    it('re-chunks frames so the update rate does not follow the codec', () => {
        // Without this, astats emits once per codec frame — FLAC's 4096-sample
        // blocks measured 10Hz against 47Hz for 1024-sample sources.
        expect(buildGraph('/tmp/x.fifo')).toContain(`asetnsamples=n=${ANALYSIS_FRAME_SAMPLES}`);
    });

    it('asks ametadata not to buffer', () => {
        // Without direct=1 the 32KB AVIO buffer delivers frames in ~2s bursts.
        expect(buildGraph('/tmp/x.fifo')).toContain('direct=1');
    });

    it('splits into exactly BAND_COUNT bands', () => {
        const graph = buildGraph('/tmp/x.fifo');

        expect(crossoverPoints()).toHaveLength(BAND_COUNT - 1);
        expect(graph).toContain(`amerge=inputs=${BAND_COUNT}`);
        expect(graph).toContain(`[b${BAND_COUNT - 1}]`);
        expect(graph).not.toContain(`[b${BAND_COUNT}]`);
    });

    it('spaces crossovers logarithmically and in ascending order', () => {
        const points = crossoverPoints();

        for (let i = 1; i < points.length; i += 1) {
            expect(points[i]).toBeGreaterThan(points[i - 1]);
        }

        // Equal musical intervals: each ratio should match the last.
        const first = points[1] / points[0];
        const last = points[points.length - 1] / points[points.length - 2];
        expect(Math.abs(first - last)).toBeLessThan(0.05);
    });
});

describe('filterSpec', () => {
    it('declares the exact byte length mpv will consume', () => {
        // mpv's %LENGTH% form is what lets the graph contain ',' ':' '[' ']'
        // without escaping. A wrong count silently truncates the graph.
        const spec = filterSpec('/tmp/x.fifo');
        const match = /^@[a-z]+:lavfi=%(\d+)%([\s\S]+)$/.exec(spec);

        expect(match).not.toBeNull();
        expect(Buffer.byteLength(match![2])).toBe(Number(match![1]));
    });

    it('labels the filter so attach/detach leaves the user’s own --af alone', () => {
        expect(filterSpec('/tmp/x.fifo').startsWith(`@${FILTER_LABEL}:`)).toBe(true);
    });
});

describe('createBandParser', () => {
    const header = (pts: number) => `frame:0 pts:1 pts_time:${pts}\n`;
    const band = (n: number, db: string) => `lavfi.astats.${n}.RMS_level=${db}\n`;

    const allBands = (pts: number, db = '-20.5') =>
        header(pts) + Array.from({ length: BAND_COUNT }, (_, i) => band(i + 1, db)).join('');

    it('emits a frame only once the next header arrives', () => {
        const frames: BandFrame[] = [];
        const parse = createBandParser((f) => frames.push(f));

        parse(allBands(1.5));
        expect(frames).toHaveLength(0);

        parse(header(1.52));
        expect(frames).toHaveLength(1);
        expect(frames[0].pts).toBeCloseTo(1.5);
        expect(Array.from(frames[0].bands)).toEqual(Array(BAND_COUNT).fill(-20.5));
    });

    it('reassembles frames split across chunk boundaries', () => {
        const frames: BandFrame[] = [];
        const parse = createBandParser((f) => frames.push(f));
        const text = allBands(2) + header(3);

        // Feed it one byte at a time — the fifo gives no alignment guarantees.
        for (const char of text) parse(char);

        expect(frames).toHaveLength(1);
        expect(frames[0].bands[0]).toBe(-20.5);
    });

    it('floors silence rather than emitting -inf or NaN', () => {
        const frames: BandFrame[] = [];
        const parse = createBandParser((f) => frames.push(f));

        parse(header(1) + band(1, '-inf') + band(2, 'nan') + band(3, '-120.0'));
        parse(header(2));

        expect(frames[0].bands[0]).toBe(FLOOR_DB);
        expect(frames[0].bands[1]).toBe(FLOOR_DB);
        expect(frames[0].bands[2]).toBe(FLOOR_DB);
        expect(Number.isNaN(frames[0].bands[1])).toBe(false);
    });

    it('ignores channel indices outside the band range', () => {
        const frames: BandFrame[] = [];
        const parse = createBandParser((f) => frames.push(f));

        parse(header(1) + band(1, '-10') + band(BAND_COUNT + 5, '-10'));
        parse(header(2));

        expect(frames[0].bands).toHaveLength(BAND_COUNT);
    });

    it('does not emit a header with no readings behind it', () => {
        const frames: BandFrame[] = [];
        const parse = createBandParser((f) => frames.push(f));

        parse(header(1) + header(2) + header(3));
        expect(frames).toHaveLength(0);
    });
});

describe('createFrameScheduler', () => {
    const frame = (pts: number): BandFrame => ({ bands: new Float32Array([pts]), pts });

    const harness = () => {
        let clock = 1_000_000;
        const released: number[] = [];
        const scheduler = createFrameScheduler(
            (f) => released.push(f.pts),
            () => clock,
        );
        return {
            advance: (ms: number) => {
                clock += ms;
            },
            at: () => clock,
            released,
            scheduler,
        };
    };

    it('holds frames that describe audio not yet playing', () => {
        // mpv filters ahead of its output buffer — measured ~270-310ms on
        // CoreAudio. Forwarding on arrival puts the visualizer ahead of the music.
        const { released, scheduler } = harness();

        scheduler.setClock(10);
        for (let i = 0; i < 14; i += 1) scheduler.push(frame(10.3 + i * 0.021));

        expect(released).toHaveLength(0);
        expect(scheduler.pending()).toBe(14);
    });

    it('releases each frame when the playhead reaches it', () => {
        const { advance, released, scheduler } = harness();

        scheduler.setClock(10);
        for (let i = 0; i < 14; i += 1) scheduler.push(frame(10.3 + i * 0.021));

        advance(320);
        scheduler.setClock(10.32);

        expect(released[0]).toBeCloseTo(10.3);
        expect(released.length).toBeGreaterThan(0);
        expect(released.length).toBeLessThan(14);
    });

    it('delays a frame by however far ahead it arrived', () => {
        const h = harness();
        const seen: number[] = [];
        let clock = 1_000_000;
        const scheduler = createFrameScheduler(
            () => seen.push(clock),
            () => clock,
        );

        scheduler.setClock(0);
        const arrivedAt = clock;
        scheduler.push(frame(0.3));

        for (let i = 1; i <= 20; i += 1) {
            clock += 25;
            scheduler.setClock(i * 0.025);
        }

        expect(seen).toHaveLength(1);
        expect(seen[0] - arrivedAt).toBeGreaterThanOrEqual(275);
        expect(seen[0] - arrivedAt).toBeLessThanOrEqual(340);
        expect(h.released).toHaveLength(0);
    });

    it('clamps the playhead while paused so the queue is not dumped on resume', () => {
        const { advance, released, scheduler } = harness();

        scheduler.setClock(5);
        for (let i = 0; i < 40; i += 1) scheduler.push(frame(5.3 + i * 0.021));

        // mpv stops sending time updates when paused.
        advance(30_000);
        scheduler.push(frame(6.14));

        expect(released.length).toBeLessThan(30);
    });

    it('drops stale frames on a seek instead of racing to catch up', () => {
        const { scheduler } = harness();

        scheduler.setClock(100);
        for (let i = 0; i < 10; i += 1) scheduler.push(frame(120 + i * 0.021));
        const before = scheduler.pending();

        scheduler.push(frame(5));

        expect(before).toBe(10);
        expect(scheduler.pending()).toBeLessThan(before);
    });

    it('passes frames straight through when there is no clock yet', () => {
        // Between tracks mpv reports no position; holding for one that never
        // arrives would stall the visualizer indefinitely.
        const { released, scheduler } = harness();

        for (let i = 0; i < 5; i += 1) scheduler.push(frame(i));

        expect(released).toHaveLength(5);
    });

    it('caps the queue if playback stalls', () => {
        const { scheduler } = harness();

        scheduler.setClock(0);
        for (let i = 0; i < 5000; i += 1) scheduler.push(frame(1000 + i * 0.021));

        expect(scheduler.pending()).toBeLessThanOrEqual(100);
    });

    it('forgets its clock on reset', () => {
        const { released, scheduler } = harness();

        scheduler.setClock(500);
        scheduler.push(frame(600));
        expect(released).toHaveLength(0);

        scheduler.reset();
        scheduler.push(frame(600));

        expect(released).toHaveLength(1);
    });
});
