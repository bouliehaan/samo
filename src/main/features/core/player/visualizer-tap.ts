import { execFile } from 'node:child_process';
import { constants, openSync, unlinkSync } from 'node:fs';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pid } from 'node:process';
import { promisify } from 'node:util';

import { getMpvInstance, mpvLog } from './mpv-lifecycle';
import {
    BAND_COUNT,
    createBandParser,
    createFrameScheduler,
    FILTER_LABEL,
    filterSpec,
    FLOOR_DB,
} from './visualizer-graph';

import { getMainWindow } from '/@/main/index';
import { isWindows } from '/@/main/utils';

const execFileAsync = promisify(execFile);

/**
 * A spectrum feed for the visualizer, read out of mpv itself.
 *
 * mpv plays outside the renderer, so its audio never reaches the Web Audio
 * graph the visualizer analyses. The previous answer was `getDisplayMedia`,
 * but Electron's `audio: 'loopback'` is Windows-only — on macOS system audio
 * can only be obtained attached to a live ScreenCaptureKit capture of the
 * whole display. That is why Samo used to ask for Screen Recording, and why a
 * full-display capture ran the whole time the visualizer was open.
 *
 * Asking mpv for the numbers costs neither. The graph and its escaping live in
 * ./visualizer-graph; this module owns the fifo, the mpv commands, and the
 * lifecycle. Measured on mpv 0.41: ~47 updates/sec, and about 7 points of one
 * CPU core — so the filter is attached only while a visualizer is on screen.
 */

export const VISUALIZER_BAND_COUNT = BAND_COUNT;
export const VISUALIZER_FLOOR_DB = FLOOR_DB;

type TapState = {
    fifoPath: string;
    releaseClockListener: ((time: number) => void) | null;
    stream: Socket;
};

let tap: null | TapState = null;
/** What the renderer last asked for; survives mpv restarts so we can re-attach. */
let wanted = false;

/**
 * Read the fifo and hand frames to the scheduler, which releases them in step
 * with what is actually coming out of the speakers. See createFrameScheduler.
 */
const attachReader = (state: TapState) => {
    const scheduler = createFrameScheduler((frame) => {
        getMainWindow()?.webContents.send('renderer-visualizer-bands', Array.from(frame.bands));
    });

    const parse = createBandParser((frame) => scheduler.push(frame));

    // node-mpv emits this every `time_update` seconds (250ms) while playing.
    const onTimePosition = (time: number) => scheduler.setClock(time);

    getMpvInstance()?.on('timeposition', onTimePosition);
    state.releaseClockListener = onTimePosition;

    state.stream.on('data', (chunk) => parse(String(chunk)));

    state.stream.on('error', (err) => {
        mpvLog({ action: 'Visualizer tap fifo read failed' }, err);
    });
};

const teardown = () => {
    if (!tap) return;

    const { fifoPath, releaseClockListener, stream } = tap;
    tap = null;

    if (releaseClockListener) {
        try {
            getMpvInstance()?.off?.('timeposition', releaseClockListener);
        } catch {
            // The instance may already be gone.
        }
    }

    try {
        // The Socket owns the fd and closes it on destroy, so there is no
        // separate close here — closing it twice would throw EBADF, or worse,
        // close an fd another part of the app had since been handed.
        stream.destroy();
    } catch {
        // Going away regardless.
    }

    try {
        unlinkSync(fifoPath);
    } catch {
        // Never created, or already gone.
    }
};

/**
 * Attach the tap to the running mpv. Safe to call when already attached or
 * when mpv is not running; returns whether a tap is live afterwards.
 */
export const startVisualizerTap = async (): Promise<boolean> => {
    wanted = true;

    if (tap) return true;

    // No mkfifo on Windows. Windows is also the one platform where Electron's
    // `audio: 'loopback'` works without any screen capture, so this costs it
    // nothing that it had — it simply has no mpv visualizer for now.
    if (isWindows()) return false;

    const mpv = getMpvInstance();
    if (!mpv) return false;

    const fifoPath = join(tmpdir(), `samo-visualizer-${pid}-${Date.now()}.fifo`);

    try {
        await execFileAsync('mkfifo', [fifoPath]);
    } catch (err) {
        mpvLog({ action: `Visualizer tap could not create fifo at ${fifoPath}` }, err);
        return false;
    }

    let reader: Socket;
    try {
        // O_RDWR, not O_RDONLY: opening a fifo read-only blocks until a writer
        // appears, and holding a writer open ourselves stops the reader hitting
        // EOF every time mpv rebuilds its filter chain between tracks.
        //
        // O_NONBLOCK and a net.Socket, NOT fs.createReadStream. A ReadStream
        // does blocking read(2) calls on libuv's threadpool, and a fifo with no
        // writer parks that thread in the kernel forever — which is how this
        // wedged Electron so hard that SIGKILL would not land and the machine
        // needed a reboot. A Socket is polled by the event loop instead, so an
        // idle fifo costs nothing and destroy() always returns.
        const fd = openSync(fifoPath, constants.O_RDWR | constants.O_NONBLOCK);
        reader = new Socket({ fd, readable: true, writable: false });
        reader.setEncoding('utf8');
        // Never let the visualizer be the reason the app cannot exit. Data
        // still flows — unref only means this handle does not by itself keep
        // the event loop alive.
        reader.unref();
    } catch (err) {
        mpvLog({ action: 'Visualizer tap could not open fifo' }, err);
        try {
            unlinkSync(fifoPath);
        } catch {
            // Nothing to clean up.
        }
        return false;
    }

    tap = {
        fifoPath,
        releaseClockListener: null,
        stream: reader,
    };
    attachReader(tap);

    try {
        // `af add` with a label rather than setting the `af` property: it leaves
        // any filter the user set via mpvExtraParameters in place, and `af
        // remove @label` puts the chain back exactly as it was.
        await mpv.command('af', ['add', filterSpec(fifoPath)]);
    } catch (err) {
        mpvLog({ action: 'Visualizer tap could not attach audio filter' }, err);
        teardown();
        return false;
    }

    mpvLog({ action: `Visualizer tap attached (${BAND_COUNT} bands)` });
    return true;
};

/** Detach the tap, leaving mpv's filter chain as it was before. */
export const stopVisualizerTap = async (): Promise<void> => {
    wanted = false;

    if (!tap) return;

    try {
        await getMpvInstance()?.command('af', ['remove', `@${FILTER_LABEL}`]);
    } catch (err) {
        mpvLog({ action: 'Visualizer tap could not remove audio filter' }, err);
    }

    teardown();
    mpvLog({ action: 'Visualizer tap detached' });
};

/**
 * Called after mpv is (re)created. A restart drops the filter chain entirely,
 * so the tap has to be rebuilt if a visualizer is still on screen.
 */
export const reattachVisualizerTapIfWanted = async (): Promise<void> => {
    if (!wanted) return;

    teardown();
    await startVisualizerTap();
};

/** Drop everything without talking to mpv — for shutdown paths. */
export const disposeVisualizerTap = (): void => {
    wanted = false;
    teardown();
};
