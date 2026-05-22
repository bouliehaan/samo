import { app, ipcMain } from 'electron';
import MpvAPI from 'node-mpv';

import { getMainWindow } from '/@/main/index';
import { PlayerData } from '/@/shared/types/domain-types';

import { fetchIcyMetadata } from './icy-metadata';
import {
    cleanupMpv,
    createMpv,
    getCurrentPlayerData,
    getMpvInstance,
    getMpvState,
    mpvLog,
    MpvState,
    type NodeMpvError,
    quit,
    runMpvLifecycle,
    setCurrentPlayerData,
    setMpvInstance,
    setMpvState,
    shutdownMpvInstance,
} from './mpv-lifecycle';

export { getMpvInstance } from './mpv-lifecycle';

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
                setMpvInstance(null);

                setMpvInstance(await createMpv(data));
                setMpvState(MpvState.STARTED);
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
                setMpvInstance(null);

                setMpvInstance(await createMpv(data));
                setMpvState(MpvState.STARTED);
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
            setCurrentPlayerData(null);
            setMpvInstance(null);
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
        setCurrentPlayerData(null);
        setMpvInstance(null);
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
    setCurrentPlayerData(data);
});

// Returns the current player metadata (song data)
ipcMain.handle('player-metadata', async (): Promise<null | PlayerData> => {
    return getCurrentPlayerData();
});

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

type AudioDevice = { label: string; value: string };

const AUDIO_DEVICES_CACHE_TTL_MS = 60_000;
let audioDevicesCache: { expiresAt: number; value: AudioDevice[] } | null = null;

const invalidateAudioDevicesCache = () => {
    audioDevicesCache = null;
};

const enumerateAudioDevices = async (): Promise<AudioDevice[]> => {
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

        return deviceList.map((device: any) => {
            const name = device.name || device.description || 'Unknown Device';
            const description = device.description || '';
            const label = description ? `${name} (${description})` : name;
            return { label, value: name };
        });
    } finally {
        if (tempInstance && tempInstance !== instance) {
            try {
                await quit(tempInstance);
            } catch {
                // Ignore
            }
        }
    }
};

ipcMain.handle('player-get-audio-devices', async (): Promise<AudioDevice[]> => {
    const now = Date.now();
    if (audioDevicesCache && audioDevicesCache.expiresAt > now) {
        return audioDevicesCache.value;
    }

    try {
        const value = await enumerateAudioDevices();
        audioDevicesCache = { expiresAt: now + AUDIO_DEVICES_CACHE_TTL_MS, value };
        return value;
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: 'Failed to get audio devices' }, err);
        return [];
    }
});

ipcMain.handle('player-refresh-audio-devices', async (): Promise<AudioDevice[]> => {
    invalidateAudioDevicesCache();
    try {
        const value = await enumerateAudioDevices();
        audioDevicesCache = {
            expiresAt: Date.now() + AUDIO_DEVICES_CACHE_TTL_MS,
            value,
        };
        return value;
    } catch (err: any | NodeMpvError) {
        mpvLog({ action: 'Failed to refresh audio devices' }, err);
        return [];
    }
});

app.on('before-quit', async (event) => {
    switch (getMpvState()) {
        case MpvState.DONE:
            return;
        case MpvState.IN_PROGRESS:
            event.preventDefault();
            break;
        case MpvState.STARTED: {
            try {
                setMpvState(MpvState.IN_PROGRESS);
                event.preventDefault();
                await cleanupMpv();
            } catch (err: any | NodeMpvError) {
                mpvLog({ action: `Failed to cleanly before-quit` }, err);
            } finally {
                setMpvState(MpvState.DONE);
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
        const mpvProcess =
            (instance as any).process ||
            (instance as any).mpvProcess ||
            (instance as any)._mpvProcess;
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
