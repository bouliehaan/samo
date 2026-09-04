import uniq from 'lodash/uniq';
import MpvAPI from 'node-mpv';
import { rm } from 'node:fs/promises';
import { pid } from 'node:process';

import { resolveMpvBinaryPath } from './mpv-binary';

import { getMainWindow, sendToastToRenderer } from '/@/main/index';
import { createLog, isWindows } from '/@/main/utils';
import { PlayerData } from '/@/shared/types/domain-types';

declare module 'node-mpv';

let socketId = 0;
export const getSocketPath = () => {
    socketId += 1;
    return isWindows()
        ? `\\\\.\\pipe\\mpvserver-${pid}-${Date.now()}-${socketId}`
        : `/tmp/node-mpv-${pid}-${Date.now()}-${socketId}.sock`;
};

const MPV_QUIT_GRACE_PERIOD_MS = 750;
const MPV_QUIT_IPC_TIMEOUT_MS = 1500;

export const NodeMpvErrorCode = {
    0: 'Unable to load file or stream',
    1: 'Invalid argument',
    2: 'Binary not found',
    3: 'IPC command invalid',
    4: 'Unable to bind IPC socket',
    5: 'Connection timeout',
    6: 'MPV is already running',
    7: 'Could not send IPC message',
    8: 'MPV is not running',
    9: 'Unsupported protocol',
};

/**
 * A value mpv will accept for a property. node-mpv's own signature is
 * `value: any`, so nothing upstream constrains this — spelling it out here keeps
 * the renderer→main IPC payloads honest instead of inheriting that `any`.
 */
export type MpvPropertyValue = boolean | number | string;

export type NodeMpvError = {
    errcode?: number;
    message?: string;
    method?: string;
    stackTrace?: string;
    verbose?: string;
};

let mpvInstance: MpvAPI | null = null;
let currentPlayerData: null | PlayerData = null;
let mpvLifecyclePromise: Promise<void> = Promise.resolve();

export const getMpvInstance = () => mpvInstance;
export const setMpvInstance = (instance: MpvAPI | null) => {
    mpvInstance = instance;
};
export const getCurrentPlayerData = () => currentPlayerData;
export const setCurrentPlayerData = (data: null | PlayerData) => {
    currentPlayerData = data;
};

/**
 * The mpv error code carried by a caught value, or `undefined` if it is not an
 * mpv error. Callers branch on specific codes (3 = IPC command invalid, which
 * is the normal answer to asking for `time-pos` while idle), so this must not
 * throw on a string, a null, or a plain Error.
 */
export const getMpvErrorCode = (err: unknown): number | undefined => {
    if (typeof err !== 'object' || err === null || !('errcode' in err)) {
        return undefined;
    }

    const { errcode } = err as NodeMpvError;
    return typeof errcode === 'number' ? errcode : undefined;
};

/**
 * Accepts `unknown` because that is what a `catch` binding actually is.
 *
 * Every call site in this feature used to write `catch (err: any)` purely to
 * get past this parameter being `Error | NodeMpvError` — 26 of them, in the
 * audio path, each one switching off type checking for the whole block rather
 * than for the one value that genuinely is not known. Widening the parameter
 * and narrowing HERE means the callers can use a plain `catch (err)`, keep
 * `unknown`, and still lose nothing: a thrown string, a rejected non-Error, and
 * a real NodeMpvError all still render.
 */
export const mpvLog = (
    data: {
        action: string;
        toast?: 'info' | 'success' | 'warning';
        type?: 'debug' | 'info' | 'success' | 'verbose' | 'warning';
    },
    err?: unknown,
) => {
    const { action, toast, type = 'info' } = data;

    if (err) {
        const mpvError =
            typeof err === 'object' && err !== null ? (err as NodeMpvError) : undefined;
        const errcode = getMpvErrorCode(err);
        const codeDescription =
            typeof errcode === 'number'
                ? `mpv errorcode ${errcode} - ${
                      NodeMpvErrorCode[errcode as keyof typeof NodeMpvErrorCode] ??
                      'Unknown MPV error'
                  }`
                : undefined;
        const detail = codeDescription ?? mpvError?.message ?? String(err);
        const message = `[AUDIO PLAYER] ${action} - ${detail}`;

        sendToastToRenderer({ message, type: 'error' });
        createLog({ message, type: 'error' });
        return;
    }

    const message = `[AUDIO PLAYER] ${action}`;
    createLog({ message, type });
    if (toast) {
        sendToastToRenderer({ message, type: toast });
    }
};

const prefetchPlaylistParams = [
    '--prefetch-playlist=no',
    '--prefetch-playlist=yes',
    '--prefetch-playlist',
];

const DEFAULT_MPV_PARAMETERS = (extraParameters?: string[]) => {
    const parameters = ['--idle=yes', '--no-config', '--load-scripts=no'];

    if (!extraParameters?.some((param) => prefetchPlaylistParams.includes(param))) {
        parameters.push('--prefetch-playlist=yes');
    }

    return parameters;
};

/**
 * The mpv child process. node-mpv owns it but does not expose it on its public
 * type, and the property name has moved between versions — so all four known
 * spellings are probed rather than pinning to one and silently losing the
 * handle on an upgrade.
 *
 * Losing it means an orphaned mpv process outliving the app, which is why the
 * reach into internals is worth it. Narrowed to exactly the members used.
 */
export type MpvChildProcess = {
    exitCode?: null | number;
    kill: (signal?: NodeJS.Signals | number) => boolean;
    once: (
        event: 'exit',
        listener: (code: null | number, signal: NodeJS.Signals | null) => void,
    ) => void;
    pid?: number;
    signalCode?: NodeJS.Signals | null;
};

export const getMpvChildProcess = (instance: MpvAPI): MpvChildProcess | null => {
    const internals = instance as unknown as Record<string, unknown>;
    const candidate =
        internals.process ?? internals.mpvProcess ?? internals._mpvProcess ?? internals.mpvPlayer;

    if (
        typeof candidate === 'object' &&
        candidate !== null &&
        typeof (candidate as MpvChildProcess).kill === 'function'
    ) {
        return candidate as MpvChildProcess;
    }

    return null;
};

const getMpvChildPid = (instance: MpvAPI | null | undefined) => {
    const mpvProcess = instance ? getMpvChildProcess(instance) : null;
    return typeof mpvProcess?.pid === 'number' ? mpvProcess.pid : undefined;
};

export const logMpvChildProcess = (action: string, instance: MpvAPI | null | undefined) => {
    const childPid = getMpvChildPid(instance);

    mpvLog({
        action:
            childPid !== undefined
                ? `${action} mpv child process pid=${childPid}`
                : `${action} mpv child process pid unavailable`,
        type: 'info',
    });
};

const attachMpvProcessLogging = (instance: MpvAPI) => {
    const mpvProcess = getMpvChildProcess(instance);

    logMpvChildProcess('Started', instance);

    if (!mpvProcess || typeof mpvProcess.once !== 'function') {
        return;
    }

    mpvProcess.once('exit', (code: null | number, signal: NodeJS.Signals | null) => {
        const childPid = typeof mpvProcess.pid === 'number' ? mpvProcess.pid : undefined;

        mpvLog({
            action:
                childPid !== undefined
                    ? `Exited mpv child process pid=${childPid} code=${code ?? 'null'} signal=${
                          signal ?? 'null'
                      }`
                    : `Exited mpv child process pid unavailable code=${code ?? 'null'} signal=${
                          signal ?? 'null'
                      }`,
            type: 'info',
        });
    });
};

const wait = (timeout: number) =>
    new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });

const hasMpvChildProcessExited = (mpvProcess: MpvChildProcess | null | undefined) => {
    return mpvProcess?.exitCode != null || mpvProcess?.signalCode != null;
};

const terminateMpvProcess = async (
    instance: MpvAPI,
    reason: string,
    options?: { waitBeforeSignal?: boolean },
) => {
    if (isWindows()) {
        return;
    }

    const mpvProcess = getMpvChildProcess(instance);

    if (!mpvProcess || hasMpvChildProcessExited(mpvProcess)) {
        return;
    }

    if (options?.waitBeforeSignal) {
        logMpvChildProcess(`Waiting for graceful shutdown ${reason}`, instance);
        await wait(MPV_QUIT_GRACE_PERIOD_MS);

        if (hasMpvChildProcessExited(mpvProcess)) {
            return;
        }
    }

    try {
        mpvLog({
            action:
                typeof mpvProcess.pid === 'number'
                    ? `Terminating native mpv process ${reason} pid=${mpvProcess.pid}`
                    : `Terminating native mpv process ${reason} pid unavailable`,
            type: 'warning',
        });
        mpvProcess.kill('SIGTERM');
    } catch (killErr) {
        mpvLog({ action: 'Failed to terminate native mpv process' }, killErr as NodeMpvError);
        return;
    }

    await wait(MPV_QUIT_GRACE_PERIOD_MS);

    if (hasMpvChildProcessExited(mpvProcess)) {
        return;
    }

    try {
        mpvLog({
            action:
                typeof mpvProcess.pid === 'number'
                    ? `Force killing native mpv process ${reason} pid=${mpvProcess.pid}`
                    : `Force killing native mpv process ${reason} pid unavailable`,
            type: 'warning',
        });
        mpvProcess.kill('SIGKILL');
    } catch (killErr) {
        mpvLog({ action: 'Failed to force kill native mpv process' }, killErr as NodeMpvError);
    }
};

export const quit = async (instance?: MpvAPI | null) => {
    const mpv = instance || getMpvInstance();
    if (mpv) {
        logMpvChildProcess('Cleaning up', mpv);
        try {
            // node-mpv's quit() awaits the IPC socket round-trip; on a wedged
            // socket it can hang forever and starve terminateMpvProcess.
            await Promise.race([
                mpv.quit(),
                new Promise<void>((_, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    `mpv quit IPC timed out after ${MPV_QUIT_IPC_TIMEOUT_MS}ms`,
                                ),
                            ),
                        MPV_QUIT_IPC_TIMEOUT_MS,
                    ),
                ),
            ]);
        } catch (error) {
            mpvLog({
                action: `mpv quit IPC failed; terminating native process directly: ${
                    (error as Error | NodeMpvError)?.message ?? String(error)
                }`,
                type: 'warning',
            });
        }
        await terminateMpvProcess(mpv, 'after quit', { waitBeforeSignal: true });
        if (!isWindows()) {
            try {
                // node-mpv keeps the IPC socket path on its options bag, which
                // is not on the public type. Removing the socket file is
                // best-effort cleanup, hence the surrounding try/catch.
                const currentSocket = (mpv as unknown as { options?: { socket?: string } }).options
                    ?.socket;
                if (currentSocket) {
                    await rm(currentSocket);
                }
            } catch {
                // Ignore errors when removing socket file
            }
        }
    }
};

export const runMpvLifecycle = async <T>(task: () => Promise<T>): Promise<T> => {
    const run = mpvLifecyclePromise.then(task, task);

    mpvLifecyclePromise = run.then(
        () => undefined,
        () => undefined,
    );

    return run;
};

export const createMpv = async (data: {
    binaryPath?: string;
    extraParameters?: string[];
    properties?: Record<string, MpvPropertyValue>;
}): Promise<MpvAPI> => {
    const { binaryPath, extraParameters, properties } = data;

    const params = uniq([...DEFAULT_MPV_PARAMETERS(extraParameters), ...(extraParameters || [])]);
    const binary = resolveMpvBinaryPath(binaryPath, (entry) =>
        mpvLog({ action: entry.action, type: entry.type }),
    );

    mpvLog({
        action: binary ? `Starting mpv from ${binary}` : 'Starting mpv from system PATH',
        type: 'debug',
    });

    const mpv = new MpvAPI(
        {
            audio_only: true,
            auto_restart: false,
            binary,
            socket: getSocketPath(),
            // Anchor the renderer's playback clock 4× per second. The renderer
            // interpolates between anchors via performance.now(); a 1-second
            // anchor (node-mpv's default) leaves enough wall-clock-vs-audio
            // drift between refreshes for lyrics to perceptibly lag. 250 ms
            // brings the per-window error well under audible sync.
            time_update: 0.25,
        },
        params,
    );

    try {
        await mpv.start();
        attachMpvProcessLogging(mpv);
        await mpv.setMultipleProperties(properties || {});
    } catch (error) {
        try {
            await quit(mpv);
        } catch {
            // Ignore cleanup errors from a failed start path.
        }
        throw error;
    }

    // Whether mpv currently has something loaded. `pause` is a live property even
    // while mpv sits idle, so its value only describes playback once a file is in.
    let hasLoadedFile = false;

    mpv.on('status', (status) => {
        if (status.property === 'playlist-pos') {
            // mpv uses playlist-pos = -1 when nothing is playing (ended, cleared, load failure, etc).
            if (status.value === -1) {
                hasLoadedFile = false;
                mpv?.pause();
                return;
            }

            hasLoadedFile = true;

            // In our 2-item queue model, playlist-pos should normally be 0.
            // When mpv auto-advances to the next track it becomes > 0 (typically 1).
            if (typeof status.value === 'number' && status.value > 0) {
                getMainWindow()?.webContents.send('renderer-player-auto-next');
            }

            return;
        }

        // Keep the renderer's play/pause state honest no matter who moved it.
        //
        // mpv owns the macOS media keys: --input-media-keys defaults to yes and the
        // binary registers MPRemoteCommandCenter, which is what both keyboard transport
        // keys and Bluetooth headset buttons go through — so they reach mpv before
        // Electron's globalShortcut ever sees them, and mpv pauses itself behind the
        // renderer's back. Without this the store stays PLAYING: the button keeps
        // showing pause and the interpolating playback clock keeps advancing lyrics
        // while the seekbar, fed by timeposition anchors that have stopped, freezes.
        //
        // The property is the only channel for this. mpv removed its `pause`/`unpause`
        // events in 0.33, so node-mpv's `paused`/`resumed` events can never fire.
        if (status.property === 'pause') {
            // Suppress mpv's idle default: the observe replays it once at startup, and
            // the playlist-pos = -1 branch above pauses an emptied player. Neither is a
            // statement about playback, and echoing them would stop the renderer.
            if (!hasLoadedFile) {
                return;
            }

            getMainWindow()?.webContents.send(
                status.value ? 'renderer-player-pause' : 'renderer-player-play',
            );
        }
    });

    // Automatically updates the play button when the player is stopped
    mpv.on('stopped', () => {
        getMainWindow()?.webContents.send('renderer-player-stop');
    });

    // Event output every interval set by time_update, used to update the current time
    mpv.on('timeposition', (time: number) => {
        getMainWindow()?.webContents.send('renderer-player-current-time', time);
    });

    return mpv;
};

export const shutdownMpvInstance = async (
    instance: MpvAPI | null | undefined,
    reason: string,
    options?: { clearPlaylist?: boolean; force?: boolean },
) => {
    if (!instance) {
        return;
    }

    logMpvChildProcess(`Cleaning up ${reason}`, instance);

    try {
        if (!options?.force) {
            await instance.stop().catch((error) => {
                mpvLog({ action: `Failed to stop MPV ${reason}` }, error);
            });
        }

        if (options?.clearPlaylist) {
            await instance.clearPlaylist().catch((error) => {
                mpvLog({ action: `Failed to clear MPV playlist ${reason}` }, error);
            });
        }

        await quit(instance);
    } catch (error) {
        mpvLog({ action: `Failed to clean up MPV ${reason}` }, error);
        await terminateMpvProcess(instance, `after ${reason} cleanup failure`);
    }
};

export enum MpvState {
    DONE,
    IN_PROGRESS,
    STARTED,
}

let mpvState = MpvState.STARTED;

export const getMpvState = () => mpvState;
export const setMpvState = (state: MpvState) => {
    mpvState = state;
};

export const cleanupMpv = async (force = false) => {
    if (mpvState === MpvState.DONE && !force) {
        return;
    }

    await runMpvLifecycle(async () => {
        await shutdownMpvInstance(getMpvInstance(), 'before app quit', { force });
        setMpvInstance(null);
    });
};
