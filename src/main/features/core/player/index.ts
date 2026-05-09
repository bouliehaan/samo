import console from 'console';
import { app, ipcMain } from 'electron';
import uniq from 'lodash/uniq';
import MpvAPI from 'node-mpv';
import { accessSync, chmodSync, constants, existsSync, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { join } from 'node:path';
import { pid } from 'node:process';
import process from 'process';

import { getMainWindow, sendToastToRenderer } from '../../../index';
import { createLog, isLinux, isMacOS, isWindows } from '../../../utils';
import { store } from '../settings';

import { PlayerData } from '/@/shared/types/domain-types';

declare module 'node-mpv';

// function wait(timeout: number) {
//     return new Promise((resolve) => {
//         setTimeout(() => {
//             resolve('resolved');
//         }, timeout);
//     });
// }

let mpvInstance: MpvAPI | null = null;
let currentPlayerData: null | PlayerData = null;
const socketPath = isWindows() ? `\\\\.\\pipe\\mpvserver-${pid}` : `/tmp/node-mpv-${pid}.sock`;
let mpvLifecyclePromise: Promise<void> = Promise.resolve();

const NodeMpvErrorCode = {
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

type NodeMpvError = {
    errcode?: number;
    message?: string;
    method?: string;
    stackTrace?: string;
    verbose?: string;
};

const mpvLog = (
    data: {
        action: string;
        toast?: 'info' | 'success' | 'warning';
        type?: 'debug' | 'info' | 'success' | 'verbose' | 'warning';
    },
    err?: Error | NodeMpvError,
) => {
    const { action, toast, type = 'info' } = data;

    if (err) {
        const errcode = 'errcode' in err ? err.errcode : undefined;
        const codeDescription =
            typeof errcode === 'number'
                ? `mpv errorcode ${errcode} - ${
                      NodeMpvErrorCode[errcode as keyof typeof NodeMpvErrorCode] ??
                      'Unknown MPV error'
                  }`
                : undefined;
        const detail = codeDescription ?? err.message ?? String(err);
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

const getConfiguredMpvBinaryPath = () => store.get('mpv_path') as string | undefined;

type MpvBinaryCandidate = {
    allowExecutableName?: boolean;
    canRepairPermissions?: boolean;
    path: string;
    source: string;
};

const MACOS_DEV_MPV_CANDIDATES = ['/opt/homebrew/bin/mpv', '/usr/local/bin/mpv'];
const LINUX_MPV_CANDIDATES = ['/usr/bin/mpv', '/usr/local/bin/mpv', '/snap/bin/mpv'];
const MPV_QUIT_GRACE_PERIOD_MS = 750;
const MPV_QUIT_IPC_TIMEOUT_MS = 1500;

const getBundledMacOSMpvBinaryPath = () => join(process.resourcesPath, 'bin', 'mpv');
const getBundledMacOSX64MpvBinaryPath = () => join(process.resourcesPath, 'bin', 'x64', 'mpv');

const getPackagedMacOSMpvCandidates = (): MpvBinaryCandidate[] => {
    const appleSiliconMpv = {
        canRepairPermissions: true,
        path: getBundledMacOSMpvBinaryPath(),
        source: 'bundled Apple Silicon app resource',
    };
    const intelMpv = {
        canRepairPermissions: true,
        path: getBundledMacOSX64MpvBinaryPath(),
        source: 'bundled Intel app resource',
    };

    return process.arch === 'x64' ? [intelMpv, appleSiliconMpv] : [appleSiliconMpv, intelMpv];
};

const isExecutableName = (value: string) => !/[\\/]/.test(value);

const ensureMpvCandidateExecutable = ({
    canRepairPermissions,
    path: candidatePath,
    source,
}: MpvBinaryCandidate) => {
    const stats = statSync(candidatePath);

    if (!stats.isFile()) {
        throw new Error(
            `MPV unavailable: ${source} exists at ${candidatePath}, but it is not a file.`,
        );
    }

    try {
        accessSync(candidatePath, constants.X_OK);
        return;
    } catch {
        if (canRepairPermissions) {
            try {
                chmodSync(candidatePath, stats.mode | 0o111);
                accessSync(candidatePath, constants.X_OK);
                mpvLog({
                    action: `Repaired executable permissions for ${source} MPV at ${candidatePath}`,
                    type: 'warning',
                });
                return;
            } catch {
                // Fall through to the explicit error below.
            }
        }

        throw new Error(
            `MPV unavailable: ${source} exists at ${candidatePath}, but it is not executable.`,
        );
    }
};

const resolveExistingMpvCandidate = (candidate: MpvBinaryCandidate) => {
    if (candidate.allowExecutableName && isExecutableName(candidate.path)) {
        return candidate.path;
    }

    if (!existsSync(candidate.path)) {
        return null;
    }

    ensureMpvCandidateExecutable(candidate);
    return candidate.path;
};

const logSelectedMpvPath = (mode: 'dev' | 'packaged', path: string, source: string) => {
    mpvLog({
        action: `Resolved MPV binary in ${mode} mode from ${source}: ${path}`,
        type: 'info',
    });
};

const resolveMpvBinaryPath = (binaryPath?: string) => {
    const mode = app.isPackaged ? 'packaged' : 'dev';
    const configuredPath = binaryPath || getConfiguredMpvBinaryPath();
    const envPath = process.env.SAMO_MPV_PATH;

    mpvLog({
        action: `Resolving MPV binary in ${mode} mode`,
        type: 'debug',
    });

    if (isMacOS() && app.isPackaged) {
        const bundledCandidates = getPackagedMacOSMpvCandidates();

        for (const candidate of bundledCandidates) {
            const bundledMpvPath = resolveExistingMpvCandidate(candidate);

            if (bundledMpvPath) {
                logSelectedMpvPath(mode, bundledMpvPath, candidate.source);
                return bundledMpvPath;
            }
        }

        mpvLog({
            action: `Bundled MPV binaries missing at ${bundledCandidates
                .map((candidate) => candidate.path)
                .join(' and ')}`,
            type: 'warning',
        });

        if (configuredPath) {
            const configuredMpvPath = resolveExistingMpvCandidate({
                path: configuredPath,
                source: 'configured mpv_path',
            });

            if (configuredMpvPath) {
                logSelectedMpvPath(mode, configuredMpvPath, 'configured mpv_path');
                return configuredMpvPath;
            }

            mpvLog({
                action: `Configured MPV path was not found at ${configuredPath}`,
                type: 'warning',
            });
        }

        throw new Error(
            `MPV unavailable: packaged macOS builds require bundled MPV at ${getBundledMacOSMpvBinaryPath()} with optional Intel backup at ${getBundledMacOSX64MpvBinaryPath()}. Populate resources/bin/darwin before building release artifacts.`,
        );
    }

    if (isMacOS()) {
        const candidates: MpvBinaryCandidate[] = [
            ...(envPath ? [{ path: envPath, source: 'SAMO_MPV_PATH' }] : []),
            ...(configuredPath ? [{ path: configuredPath, source: 'configured mpv_path' }] : []),
            ...MACOS_DEV_MPV_CANDIDATES.map((path) => ({
                path,
                source: 'macOS development default path',
            })),
        ];

        for (const candidate of candidates) {
            const resolvedPath = resolveExistingMpvCandidate(candidate);

            if (resolvedPath) {
                logSelectedMpvPath(mode, resolvedPath, candidate.source);
                return resolvedPath;
            }
        }

        throw new Error(
            `MPV unavailable: set SAMO_MPV_PATH, configure mpv_path, or install mpv at ${MACOS_DEV_MPV_CANDIDATES.join(
                ' or ',
            )}.`,
        );
    }

    const candidates: MpvBinaryCandidate[] = [
        ...(envPath ? [{ allowExecutableName: true, path: envPath, source: 'SAMO_MPV_PATH' }] : []),
        ...(configuredPath
            ? [{ allowExecutableName: true, path: configuredPath, source: 'configured mpv_path' }]
            : []),
        ...(isLinux()
            ? LINUX_MPV_CANDIDATES.map((path) => ({
                  path,
                  source: 'linux default path',
              }))
            : []),
    ];

    for (const candidate of candidates) {
        const resolvedPath = resolveExistingMpvCandidate(candidate);

        if (resolvedPath) {
            logSelectedMpvPath(mode, resolvedPath, candidate.source);
            return resolvedPath;
        }
    }

    mpvLog({
        action: 'No explicit MPV binary resolved; allowing node-mpv to use system PATH',
        type: 'warning',
    });
    return undefined;
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

const createMpv = async (data: {
    binaryPath?: string;
    extraParameters?: string[];
    properties?: Record<string, any>;
}): Promise<MpvAPI> => {
    const { binaryPath, extraParameters, properties } = data;

    const params = uniq([...DEFAULT_MPV_PARAMETERS(extraParameters), ...(extraParameters || [])]);
    const binary = resolveMpvBinaryPath(binaryPath);

    mpvLog({
        action: binary ? `Starting mpv from ${binary}` : 'Starting mpv from system PATH',
        type: 'debug',
    });

    const mpv = new MpvAPI(
        {
            audio_only: true,
            auto_restart: false,
            binary,
            socket: socketPath,
            time_update: 1,
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

    mpv.on('status', (status) => {
        if (status.property === 'playlist-pos') {
            // mpv uses playlist-pos = -1 when nothing is playing (ended, cleared, load failure, etc).
            if (status.value === -1) {
                mpv?.pause();
                return;
            }

            // In our 2-item queue model, playlist-pos should normally be 0.
            // When mpv auto-advances to the next track it becomes > 0 (typically 1).
            if (typeof status.value === 'number' && status.value > 0) {
                getMainWindow()?.webContents.send('renderer-player-auto-next');
            }
        }
    });

    // Automatically updates the play button when the player is playing
    mpv.on('resumed', () => {
        getMainWindow()?.webContents.send('renderer-player-play');
    });

    // Automatically updates the play button when the player is stopped
    mpv.on('stopped', () => {
        getMainWindow()?.webContents.send('renderer-player-stop');
    });

    // Automatically updates the play button when the player is paused
    mpv.on('paused', () => {
        getMainWindow()?.webContents.send('renderer-player-pause');
    });

    // Event output every interval set by time_update, used to update the current time
    mpv.on('timeposition', (time: number) => {
        getMainWindow()?.webContents.send('renderer-player-current-time', time);
    });

    return mpv;
};

export const getMpvInstance = () => {
    return mpvInstance;
};

const wait = (timeout: number) =>
    new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });

const getMpvChildProcess = (instance: MpvAPI) => {
    const mpvProcess =
        (instance as any).process || (instance as any).mpvProcess || (instance as any)._mpvProcess;

    return mpvProcess && typeof mpvProcess.kill === 'function' ? mpvProcess : null;
};

const getMpvChildPid = (instance: MpvAPI | null | undefined) => {
    const mpvProcess = instance ? getMpvChildProcess(instance) : null;
    return typeof mpvProcess?.pid === 'number' ? mpvProcess.pid : undefined;
};

const logMpvChildProcess = (action: string, instance: MpvAPI | null | undefined) => {
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

const hasMpvChildProcessExited = (mpvProcess: any) => {
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

const quit = async (instance?: MpvAPI | null) => {
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
                await rm(socketPath);
            } catch {
                // Ignore errors when removing socket file
            }
        }
    }
};

const runMpvLifecycle = async <T>(task: () => Promise<T>): Promise<T> => {
    const run = mpvLifecyclePromise.then(task, task);

    mpvLifecyclePromise = run.then(
        () => undefined,
        () => undefined,
    );

    return run;
};

const shutdownMpvInstance = async (
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
    } catch (error: any | NodeMpvError) {
        mpvLog({ action: `Failed to clean up MPV ${reason}` }, error);
        await terminateMpvProcess(instance, `after ${reason} cleanup failure`);
    }
};

const setAudioPlayerFallback = (isError: boolean) => {
    getMainWindow()?.webContents.send('renderer-player-fallback', isError);
};

ipcMain.on('player-set-properties', async (_event, data: Record<string, any>) => {
    mpvLog({ action: `Setting properties: ${JSON.stringify(data)}` });

    const entries = Object.entries(data);

    if (entries.length === 0) {
        return;
    }

    try {
        if (entries.length === 1) {
            getMpvInstance()?.setProperty(entries[0][0], entries[0][1]);
        } else {
            getMpvInstance()?.setMultipleProperties(data);
        }
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: `Failed to set properties: ${JSON.stringify(data)}` }, err);
    }
});

ipcMain.handle(
    'player-restart',
    async (_event, data: { extraParameters?: string[]; properties?: Record<string, any> }) => {
        try {
            await runMpvLifecycle(async () => {
                mpvLog({
                    action: `Attempting to restart mpv with parameters: ${JSON.stringify(data)}`,
                });

                const existingInstance = getMpvInstance();
                await shutdownMpvInstance(existingInstance, 'before restart');
                mpvInstance = null;

                mpvInstance = await createMpv(data);
                mpvState = MpvState.STARTED;
                mpvLog({ action: 'Restarted mpv', toast: 'success' });
                setAudioPlayerFallback(false);
            });
        } catch (err: any | NodeMpvError) {
            mpvLog({ action: 'Failed to restart native MPV playback' }, err);
            setAudioPlayerFallback(true);
        }
    },
);

ipcMain.handle(
    'player-initialize',
    async (_event, data: { extraParameters?: string[]; properties?: Record<string, any> }) => {
        try {
            await runMpvLifecycle(async () => {
                mpvLog({
                    action: `Attempting to initialize mpv with parameters: ${JSON.stringify(data)}`,
                });

                const existingInstance = getMpvInstance();
                await shutdownMpvInstance(existingInstance, 'before initialize');
                mpvInstance = null;

                mpvInstance = await createMpv(data);
                mpvState = MpvState.STARTED;
                setAudioPlayerFallback(false);
            });
        } catch (err: any | NodeMpvError) {
            mpvLog({ action: 'Failed to initialize native MPV playback' }, err);
            setAudioPlayerFallback(true);
        }
    },
);

ipcMain.on('player-quit', async () => {
    void runMpvLifecycle(async () => {
        try {
            await shutdownMpvInstance(getMpvInstance(), 'from player quit');
        } catch (err: any | NodeMpvError) {
            mpvLog({ action: 'Failed to quit mpv' }, err);
        } finally {
            currentPlayerData = null;
            mpvInstance = null;
        }
    });
});

ipcMain.handle('player-is-running', async () => {
    return getMpvInstance()?.isRunning();
});

ipcMain.handle('player-clean-up', async () => {
    await runMpvLifecycle(async () => {
        await shutdownMpvInstance(getMpvInstance(), 'from renderer cleanup', {
            clearPlaylist: true,
        });
        currentPlayerData = null;
        mpvInstance = null;
    });
});

ipcMain.on('player-start', async () => {
    try {
        await getMpvInstance()?.play();
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: 'Failed to start mpv playback' }, err);
    }
});

// Starts the player
ipcMain.on('player-play', async () => {
    try {
        await getMpvInstance()?.play();
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: 'Failed to start mpv playback' }, err);
    }
});

// Pauses the player
ipcMain.on('player-pause', async () => {
    try {
        await getMpvInstance()?.pause();
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: 'Failed to pause mpv playback' }, err);
    }
});

// Stops the player
ipcMain.on('player-stop', async () => {
    try {
        await getMpvInstance()?.stop();
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: 'Failed to stop mpv playback' }, err);
    }
});

// Goes to the next track in the playlist
ipcMain.on('player-next', async () => {
    try {
        await getMpvInstance()?.next();
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: 'Failed to go to next track' }, err);
    }
});

// Goes to the previous track in the playlist
ipcMain.on('player-previous', async () => {
    try {
        await getMpvInstance()?.prev();
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: 'Failed to go to previous track' }, err);
    }
});

// Seeks forward or backward by the given amount of seconds
ipcMain.on('player-seek', async (_event, time: number) => {
    try {
        await getMpvInstance()?.seek(time);
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: `Failed to seek by ${time} seconds` }, err);
    }
});

// Seeks to the given time in seconds
ipcMain.on('player-seek-to', async (_event, time: number) => {
    try {
        await getMpvInstance()?.goToPosition(time);
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: `Failed to seek to ${time} seconds` }, err);
    }
});

// Sets the queue in position 0 and 1 to the given data. Used when manually starting a song or using the next/prev buttons
ipcMain.on('player-set-queue', async (_event, current?: string, next?: string, pause?: boolean) => {
    if (!current && !next) {
        try {
            await getMpvInstance()?.clearPlaylist();
            await getMpvInstance()?.pause();
            return;
        } catch (err: any | NodeMpvError) {
            mpvLog({ action: `Failed to clear play queue` }, err);
        }
    }

    try {
        if (current) {
            try {
                await getMpvInstance()?.load(current, 'replace');
            } catch (error: any | NodeMpvError) {
                mpvLog({ action: `Failed to load current song` }, error);
                throw error;
            }

            if (next) {
                await getMpvInstance()?.load(next, 'append');
            }
        }

        if (pause) {
            await getMpvInstance()?.pause();
        } else if (pause === false) {
            // Only force play if pause is explicitly false
            await getMpvInstance()?.play();
        }
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: `Failed to set play queue` }, err);
    }
});

// Replaces the queue in position 1 to the given data
ipcMain.on('player-set-queue-next', async (_event, url?: string) => {
    try {
        const size = await getMpvInstance()?.getPlaylistSize();

        if (size && size > 1) {
            await getMpvInstance()?.playlistRemove(1);
        }

        if (url) {
            getMpvInstance()?.load(url, 'append');
        }
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: `Failed to set play queue` }, err);
    }
});

// Sets the next song in the queue when reaching the end of the queue
ipcMain.on('player-auto-next', async (_event, url?: string) => {
    // Always keep the current song as position 0 in the mpv queue
    // This allows us to easily set update the next song in the queue without
    // disturbing the currently playing song

    try {
        await getMpvInstance()
            ?.playlistRemove(0)
            .catch(() => {
                getMpvInstance()?.pause();
            });

        if (url) {
            await getMpvInstance()?.load(url, 'append');
        }
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: `Failed to load next song` }, err);
    }
});

// Sets the volume to the given value (0-100)
ipcMain.on('player-volume', async (_event, value: number) => {
    try {
        if (value === undefined || value < 0 || value > 100) {
            return;
        }

        await getMpvInstance()?.volume(value);
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: `Failed to set volume to ${value}` }, err);
    }
});

// Toggles the mute status
ipcMain.on('player-mute', async (_event, mute: boolean) => {
    try {
        await getMpvInstance()?.mute(mute);
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: `Failed to set mute status` }, err);
    }
});

ipcMain.handle('player-get-time', async (): Promise<number | undefined> => {
    try {
        const mpv = getMpvInstance();
        if (!mpv) {
            return undefined;
        }
        return await mpv.getTimePosition();
    } catch (err: any | NodeMpvError) {
        // Err 3: IPC command invalid — e.g. time-pos unavailable when idle / between tracks
        if (err?.errcode === 3) {
            return undefined;
        }
        mpvLog({ action: `Failed to get current time` }, err);
        return undefined;
    }
});

// Updates the current player metadata (song data)
ipcMain.on('player-update-metadata', (_event, data: PlayerData) => {
    currentPlayerData = data;
});

// Returns the current player metadata (song data)
ipcMain.handle('player-metadata', async (): Promise<null | PlayerData> => {
    return currentPlayerData;
});

// Returns the stream metadata from mpv (for radio streams)

const parseIcyStreamTitle = (
    raw: string,
): null | { artist: null | string; title: null | string } => {
    const streamTitleMatch =
        raw.match(/StreamTitle='([^']*)'/i) || raw.match(/StreamTitle="([^"]*)"/i);
    const streamTitle = streamTitleMatch?.[1]?.trim();

    if (!streamTitle) {
        return null;
    }

    const splitMatch = streamTitle.match(/^(.*?)\s*[-–—]\s*(.+)$/);

    if (splitMatch) {
        return {
            artist: splitMatch[1].trim() || null,
            title: splitMatch[2].trim() || null,
        };
    }

    return {
        artist: null,
        title: streamTitle,
    };
};

const fetchIcyMetadata = (
    streamUrl: string,
    redirectCount = 0,
): Promise<null | { artist: null | string; title: null | string }> => {
    return new Promise((resolve) => {
        let settled = false;

        const finish = (value: null | { artist: null | string; title: null | string }) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };

        try {
            const url = new URL(streamUrl);
            const client = url.protocol === 'https:' ? https : http;

            const request = client.request(
                url,
                {
                    headers: {
                        'Icy-MetaData': '1',
                        'User-Agent': 'samo',
                    },
                    timeout: 12000,
                },
                (response) => {
                    const location = response.headers.location;

                    if (
                        location &&
                        response.statusCode &&
                        response.statusCode >= 300 &&
                        response.statusCode < 400 &&
                        redirectCount < 5
                    ) {
                        response.destroy();
                        const redirectedUrl = new URL(location, streamUrl).toString();
                        fetchIcyMetadata(redirectedUrl, redirectCount + 1).then(finish);
                        return;
                    }

                    const metaintHeader = response.headers['icy-metaint'];
                    const metaint = Array.isArray(metaintHeader)
                        ? Number(metaintHeader[0])
                        : Number(metaintHeader);

                    const icyName = Array.isArray(response.headers['icy-name'])
                        ? response.headers['icy-name'][0]
                        : response.headers['icy-name'];

                    if (!Number.isFinite(metaint) || metaint <= 0) {
                        response.destroy();
                        finish(
                            typeof icyName === 'string' && icyName.trim()
                                ? { artist: null, title: icyName.trim() }
                                : null,
                        );
                        return;
                    }

                    let audioBytesUntilMetadata = metaint;
                    let metadataLength: null | number = null;
                    let metadataBuffer = Buffer.alloc(0);

                    response.on('data', (chunk: Buffer) => {
                        let offset = 0;

                        while (offset < chunk.length) {
                            if (audioBytesUntilMetadata > 0) {
                                const consume = Math.min(
                                    audioBytesUntilMetadata,
                                    chunk.length - offset,
                                );
                                audioBytesUntilMetadata -= consume;
                                offset += consume;
                                continue;
                            }

                            if (metadataLength === null) {
                                metadataLength = chunk[offset] * 16;
                                offset += 1;

                                if (metadataLength === 0) {
                                    audioBytesUntilMetadata = metaint;
                                    metadataLength = null;
                                }

                                continue;
                            }

                            const remainingMetadataBytes = metadataLength - metadataBuffer.length;
                            const consume = Math.min(remainingMetadataBytes, chunk.length - offset);

                            metadataBuffer = Buffer.concat([
                                metadataBuffer,
                                chunk.subarray(offset, offset + consume),
                            ]);

                            offset += consume;

                            if (metadataBuffer.length >= metadataLength) {
                                const rawMetadata = metadataBuffer
                                    .toString('utf8')
                                    .replace(/\0+$/g, '')
                                    .trim();

                                response.destroy();

                                const parsedMetadata = parseIcyStreamTitle(rawMetadata);

                                finish(
                                    parsedMetadata ||
                                        (typeof icyName === 'string' && icyName.trim()
                                            ? { artist: null, title: icyName.trim() }
                                            : null),
                                );
                                return;
                            }
                        }
                    });

                    response.on('end', () => finish(null));
                    response.on('error', () => finish(null));
                },
            );

            request.on('timeout', () => {
                request.destroy();
                finish(null);
            });

            request.on('error', () => finish(null));
            request.end();
        } catch {
            finish(null);
        }
    });
};

ipcMain.handle(
    'player-stream-metadata',
    async (
        _event,
        streamUrl?: string,
    ): Promise<null | { artist: null | string; title: null | string }> => {
        try {
            if (streamUrl) {
                const metadata = await fetchIcyMetadata(streamUrl);
                return metadata;
            }

            return null;
        } catch (err: any | NodeMpvError) {
            mpvLog({ action: `Failed to get stream metadata` }, err);
            return null;
        }
    },
);

ipcMain.handle(
    'player-get-audio-devices',
    async (): Promise<{ label: string; value: string }[]> => {
        try {
            const instance = getMpvInstance();
            let tempInstance: MpvAPI | null = null;
            let mpvToUse: MpvAPI | null = null;

            if (instance && instance.isRunning()) {
                mpvToUse = instance;
            } else {
                try {
                    tempInstance = await createMpv({});
                    mpvToUse = tempInstance;
                } catch (err: any | NodeMpvError) {
                    mpvLog(
                        { action: 'Failed to create temporary MPV instance for audio device list' },
                        err,
                    );
                    return [];
                }
            }

            try {
                const deviceList = await mpvToUse.getProperty('audio-device-list');

                if (!deviceList || !Array.isArray(deviceList)) {
                    return [];
                }

                const devices = deviceList.map((device: any) => {
                    const name = device.name || device.description || 'Unknown Device';
                    const description = device.description || '';
                    const label = description ? `${name} (${description})` : name;
                    return {
                        label,
                        value: name,
                    };
                });

                return devices;
            } finally {
                if (tempInstance && tempInstance !== instance) {
                    try {
                        await quit(tempInstance);
                    } catch {
                        // Ignore
                    }
                }
            }
        } catch (err: any | NodeMpvError) {
            mpvLog({ action: 'Failed to get audio devices' }, err);
            return [];
        }
    },
);

enum MpvState {
    STARTED,
    IN_PROGRESS,
    DONE,
}

let mpvState = MpvState.STARTED;

// Cleanup function that can be called from multiple places
const cleanupMpv = async (force = false) => {
    if (mpvState === MpvState.DONE && !force) {
        return;
    }

    await runMpvLifecycle(async () => {
        await shutdownMpvInstance(getMpvInstance(), 'before app quit', { force });
        mpvInstance = null;
    });
};

app.on('before-quit', async (event) => {
    switch (mpvState) {
        case MpvState.DONE:
            return;
        case MpvState.IN_PROGRESS:
            event.preventDefault();
            break;
        case MpvState.STARTED: {
            try {
                mpvState = MpvState.IN_PROGRESS;
                event.preventDefault();
                await cleanupMpv();
            } catch (err: any | NodeMpvError) {
                mpvLog({ action: `Failed to cleanly before-quit` }, err);
            } finally {
                mpvState = MpvState.DONE;
                app.quit();
            }
            break;
        }
    }
});

// Handle process exit events to ensure mpv is killed even if app crashes
process.on('exit', () => {
    const instance = getMpvInstance();
    if (instance) {
        const mpvProcess = getMpvChildProcess(instance);
        if (mpvProcess && typeof mpvProcess.kill === 'function') {
            try {
                mpvLog({
                    action:
                        typeof mpvProcess.pid === 'number'
                            ? `Process exit force killing mpv child process pid=${mpvProcess.pid}`
                            : 'Process exit force killing mpv child process pid unavailable',
                    type: 'warning',
                });
                mpvProcess.kill('SIGKILL');
            } catch {
                // Ignore errors during exit
            }
        }
    }
});

// Handle signals that can terminate the process
process.on('SIGINT', async () => {
    await cleanupMpv(true);
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await cleanupMpv(true);
    process.exit(0);
});

// Handle uncaught exceptions - cleanup mpv before crashing
process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await cleanupMpv(true).catch(() => {
        // Ignore cleanup errors during crash
    });
});

// Handle unhandled rejections - cleanup mpv
process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled rejection:', reason);
    await cleanupMpv(true).catch(() => {
        // Ignore cleanup errors
    });
});
