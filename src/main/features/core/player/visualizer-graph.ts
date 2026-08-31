import { VISUALIZER_BAND_COUNT, VISUALIZER_FLOOR_DB } from '/@/shared/constants/visualizer';

/**
 * The libavfilter graph that turns mpv into a spectrum source, and the parser
 * for what it prints back.
 *
 * Kept free of Electron imports so it can be exercised against a real mpv
 * without booting the app — the escaping here has three parsers stacked on top
 * of each other (mpv options, libavfilter, then ametadata's own output format)
 * and is not something to verify by reading.
 */

/** `acrossover` accepts at most 17 outputs, which is what caps the band count. */
export const BAND_COUNT = VISUALIZER_BAND_COUNT;

export const MIN_HZ = 40;
export const MAX_HZ = 16000;

/**
 * Below this a band reads as silence. Lives in shared/ because the renderer
 * scales against it — when the two disagreed, silence drew a quarter of the
 * way up the panel and the whole curve floated.
 */
export const FLOOR_DB = VISUALIZER_FLOOR_DB;

/** One analysis frame. 1024 @ 48kHz is ~47 updates/sec. */
export const ANALYSIS_FRAME_SAMPLES = 1024;

/** mpv filter label, so attach/detach never disturbs the user's own `--af`. */
export const FILTER_LABEL = 'samovisualizer';

/** Log-spaced crossover points, so each band spans an equal musical interval. */
export const crossoverPoints = (): number[] => {
    const points: number[] = [];
    for (let i = 1; i < BAND_COUNT; i += 1) {
        points.push(Math.round(MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, i / BAND_COUNT)));
    }
    return points;
};

/**
 * `asplit` gives the playback branch (`acopy`, untouched — what you hear is
 * bit-identical to no filter) and an analysis branch that dead-ends in
 * `anullsink`. The analysis branch downmixes to mono, splits into bands, merges
 * them into one N-channel frame, and measures per channel — so channel N's RMS
 * is band N's level.
 */
export const buildGraph = (fifoPath: string): string => {
    const outs = Array.from({ length: BAND_COUNT }, (_, i) => `[b${i}]`).join('');

    return [
        'asplit=2[play][analyse]',
        // `asetnsamples` is why this is ~47Hz for everything. astats emits once
        // per audio frame, and frame size comes from the codec — FLAC's 4096-sample
        // blocks measured 10Hz, which is visibly steppy. Re-chunking fixes the rate
        // regardless of source.
        `[analyse]aformat=channel_layouts=mono,asetnsamples=n=${ANALYSIS_FRAME_SAMPLES}:p=0,acrossover=split=${crossoverPoints().join(' ')}${outs}`,
        `${outs}amerge=inputs=${BAND_COUNT}[bands]`,
        '[bands]astats=metadata=1:reset=1:measure_perchannel=RMS_level:measure_overall=none[stats]',
        // The sink is a fifo and not a tcp:// socket because libavfilter parses
        // ':' as its own option separator inside a filter's arguments — a URL
        // there fails with "No option name near '//127.0.0.1:PORT'" no matter
        // how it is escaped for mpv.
        // `direct=1` is load-bearing: without it ametadata writes through a
        // 32KB AVIO buffer, so frames arrive in ~2-second bursts and the
        // visualizer lags the music by that much. Measured before/after.
        `[stats]ametadata=mode=print:direct=1:file=${fifoPath}[printed]`,
        '[printed]anullsink',
        '[play]acopy',
    ].join(';');
};

/**
 * mpv's `%LENGTH%` literal form. The graph contains `,` `:` `[` `]`, all
 * meaningful to mpv's own option parser; escaping each by hand is how this
 * breaks silently on the next filter tweak.
 */
export const filterSpec = (fifoPath: string): string => {
    const graph = buildGraph(fifoPath);
    return `@${FILTER_LABEL}:lavfi=%${Buffer.byteLength(graph)}%${graph}`;
};

const BAND_LINE = /^lavfi\.astats\.(\d+)\.RMS_level=(-?[\d.]+|-?inf|nan)$/;
const FRAME_HEADER = /^frame:\d+\s+pts:\S+\s+pts_time:([\d.]+)/;

export type BandFrame = {
    bands: Float32Array;
    /** Audio timestamp these levels describe, in seconds. */
    pts: number;
};

/**
 * Incremental parser for ametadata's output: a `frame:N pts:…` header, then one
 * `key=value` line per entry. The next header is what marks a frame complete.
 */
export const createBandParser = (onFrame: (frame: BandFrame) => void) => {
    let buffer = '';
    let current: Float32Array | null = null;
    let currentPts = 0;
    let seen = 0;

    const flush = () => {
        if (current && seen > 0) onFrame({ bands: current, pts: currentPts });
        current = null;
        seen = 0;
    };

    return (chunk: string) => {
        buffer += chunk;

        let index: number;
        while ((index = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 1);

            if (line.startsWith('frame:')) {
                flush();
                current = new Float32Array(BAND_COUNT).fill(FLOOR_DB);
                currentPts = Number.parseFloat(FRAME_HEADER.exec(line)?.[1] ?? '') || 0;
                continue;
            }

            const match = BAND_LINE.exec(line);
            if (!match || !current) continue;

            const band = Number(match[1]) - 1;
            if (band < 0 || band >= BAND_COUNT) continue;

            // Digital silence reads as `-inf`, an all-zero frame as `nan`.
            const value = Number.parseFloat(match[2]);
            current[band] = Number.isFinite(value) ? Math.max(value, FLOOR_DB) : FLOOR_DB;
            seen += 1;
        }
    };
};

/**
 * Never extrapolate the playback clock further than this past its last anchor.
 * mpv stops sending time updates when it pauses; without a clamp the playhead
 * runs away and dumps the whole queue at once on resume.
 */
const MAX_CLOCK_EXTRAPOLATION_S = 0.5;

/** ~2s of frames. A seek or a stall must not grow the queue without bound. */
const MAX_QUEUED_FRAMES = 100;

/** A pts gap this large is a seek, not drift — start over rather than catch up. */
const DISCONTINUITY_S = 2;

/**
 * Holds band frames until the audio they describe is actually coming out of
 * the speakers.
 *
 * mpv's filter chain runs ahead of its audio output by the size of the output
 * buffer — measured at a steady ~270-310ms on CoreAudio. Forwarding frames on
 * arrival would put the visualizer a third of a second ahead of the music,
 * which reads as plainly wrong. Each frame carries the timestamp it describes,
 * so releasing against mpv's own clock self-calibrates to whatever the
 * device's buffer happens to be.
 *
 * `now` is injected so this is testable without waiting in real time.
 */
export const createFrameScheduler = (
    onDue: (frame: BandFrame) => void,
    now: () => number = Date.now,
) => {
    const queue: BandFrame[] = [];
    let anchor: null | { at: number; pos: number } = null;

    const playhead = (): null | number => {
        if (!anchor) return null;
        const elapsed = Math.min((now() - anchor.at) / 1000, MAX_CLOCK_EXTRAPOLATION_S);
        return anchor.pos + elapsed;
    };

    const drain = () => {
        const position = playhead();

        // No clock yet (just started, or between tracks): pass frames straight
        // through rather than holding them for a position that never arrives.
        if (position === null) {
            while (queue.length > 0) {
                const frame = queue.shift();
                if (frame) onDue(frame);
            }
            return;
        }

        while (queue.length > 0 && queue[0].pts <= position) {
            const frame = queue.shift();
            if (frame) onDue(frame);
        }

        if (queue.length > MAX_QUEUED_FRAMES) {
            queue.splice(0, queue.length - MAX_QUEUED_FRAMES);
        }
    };

    return {
        /** Depth of the hold buffer, for tests and diagnostics. */
        pending: () => queue.length,

        push: (frame: BandFrame) => {
            const previous = queue[queue.length - 1];
            if (previous && Math.abs(frame.pts - previous.pts) > DISCONTINUITY_S) {
                queue.length = 0;
            }

            queue.push(frame);
            drain();
        },

        reset: () => {
            queue.length = 0;
            anchor = null;
        },

        /** mpv's reported playback position, from its `timeposition` event. */
        setClock: (position: number) => {
            anchor = { at: now(), pos: position };
            drain();
        },
    };
};
