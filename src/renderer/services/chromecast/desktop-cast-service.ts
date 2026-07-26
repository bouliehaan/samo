import { needsChromecastCompatibleStream } from '@samo/core/mobile';
import isElectron from 'is-electron';

import { getSongUrl } from '/@/renderer/features/player/audio-player/hooks/use-stream-url';
import { type DesktopCastState, useCastStore } from '/@/renderer/store/cast.store';
import { QueueSong } from '/@/shared/types/domain-types';

/**
 * Renderer-side facade over the native Cast engine in the Electron main process
 * (`src/main/features/core/cast`). The main process owns mDNS discovery and the
 * Cast v2 protocol; this module just forwards intent over IPC and mirrors the
 * pushed state into the cast store. The Google web Sender SDK it replaced never
 * worked in Electron (no Chromium Media Router).
 */

const setCastState = (next: Partial<DesktopCastState>) => {
    useCastStore.getState().setCast(next);
};

let stateSubscribed = false;

/** Wire the main→renderer state push into the store exactly once. */
const ensureStateSubscription = () => {
    if (stateSubscribed || !isElectron()) return;
    stateSubscribed = true;
    window.api.cast.onState((state) => setCastState(state));
};

export const initializeDesktopCast = async (): Promise<boolean> => {
    if (!isElectron()) {
        setCastState({ status: 'unavailable' });
        return false;
    }
    ensureStateSubscription();
    try {
        const state = await window.api.cast.startDiscovery();
        setCastState(state);
        return true;
    } catch {
        setCastState({ status: 'unavailable' });
        return false;
    }
};

export const requestDesktopCastSession = async (deviceId?: string) => {
    if (!isElectron()) {
        throw new Error('Chromecast is only available in the desktop app.');
    }
    ensureStateSubscription();
    setCastState({ isScanning: true, status: 'connecting' });
    try {
        await window.api.cast.connect(deviceId);
    } catch (error) {
        // Refresh from the authoritative snapshot so a failed connect doesn't
        // leave the picker stuck on "connecting".
        try {
            setCastState(await window.api.cast.getState());
        } catch {
            setCastState({ status: 'unavailable' });
        }
        throw error;
    }
};

export const stopDesktopCastSession = async () => {
    if (!isElectron()) return;
    await window.api.cast.disconnect();
};

/** Open the OS pane holding the local-network grant Cast depends on. */
export const openDesktopCastNetworkSettings = async () => {
    if (!isElectron()) return;
    await window.api.cast.openNetworkSettings();
};

const buildCastStreamUrl = async (
    song: QueueSong,
    transcode: { bitrate?: number; enabled: boolean; format?: string },
) => {
    const needsTranscode = needsChromecastCompatibleStream({
        bitDepth: song.bitDepth ?? undefined,
        bitRate: song.bitRate,
        container: song.container ?? undefined,
        deliveryKind: 'web-direct',
        losslessRequired: false,
        sampleRate: song.sampleRate ?? undefined,
        serverTranscodeRequested: transcode.enabled,
    });

    const castTranscode = {
        bitrate: transcode.bitrate,
        enabled: needsTranscode ? true : false,
        format: transcode.format,
    };

    return getSongUrl(song, castTranscode, needsTranscode);
};

export const loadDesktopCastMedia = async ({
    artworkUrl,
    positionMs = 0,
    song,
    transcode,
}: {
    artworkUrl?: null | string;
    positionMs?: number;
    song: QueueSong;
    transcode: { bitrate?: number; enabled: boolean; format?: string };
}) => {
    if (!isElectron()) {
        throw new Error('No active Chromecast session.');
    }

    const contentUrl = await buildCastStreamUrl(song, transcode);
    if (!contentUrl || !/^https?:\/\//i.test(contentUrl)) {
        throw new Error('Chromecast requires a network stream URL for the current track.');
    }

    await window.api.cast.load({
        album: song.album ?? undefined,
        artist: song.artistName || song.albumArtistName || undefined,
        artworkUrl,
        contentType: song.container || 'audio/mpeg',
        contentUrl,
        positionSeconds: Math.max(0, positionMs / 1000),
        title: song.name,
    });
};

export const pauseDesktopCast = async () => {
    if (!isElectron()) return;
    await window.api.cast.pause();
};

export const playDesktopCast = async () => {
    if (!isElectron()) return;
    await window.api.cast.play();
};

export const seekDesktopCast = async (positionMs: number) => {
    if (!isElectron()) return;
    await window.api.cast.seek(Math.max(0, positionMs / 1000));
};

export const getDesktopCastSnapshot = (): DesktopCastState => useCastStore.getState().cast;

export const isDesktopCastConnected = (): boolean => useCastStore.getState().cast.isConnected;

/** Pre-warm discovery so devices appear before the output sheet opens. */
export const warmDesktopCastDiscovery = async () => {
    await initializeDesktopCast();
};
