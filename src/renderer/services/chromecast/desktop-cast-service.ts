import { needsChromecastCompatibleStream } from '@samo/core/mobile';
import isElectron from 'is-electron';

import { getSongUrl } from '/@/renderer/features/player/audio-player/hooks/use-stream-url';
import { loadCastFramework } from '/@/renderer/services/chromecast/cast-framework-loader';
import {
    type DesktopCastDevice,
    type DesktopCastState,
    useCastStore,
} from '/@/renderer/store/cast.store';
import { QueueSong } from '/@/shared/types/domain-types';

/** Google Default Media Receiver — plays standard HTTP audio streams on the TV. */
const DEFAULT_RECEIVER_APP_ID = 'CC1AD845';

const getCastFramework = () => window.cast?.framework;

let initialized = false;
let context: cast.framework.CastContext | null = null;
let sessionListenerInstalled = false;

const setCastState = (next: Partial<DesktopCastState>) => {
    useCastStore.getState().setCast(next);
};

const mapCastState = (): DesktopCastState => {
    const framework = getCastFramework();
    if (!context || !framework) {
        return {
            deviceName: null,
            devices: [],
            isConnected: false,
            isScanning: false,
            status: 'unavailable',
        };
    }

    const castState = context.getCastState();
    const session = context.getCurrentSession();
    const deviceName = session?.getCastDevice()?.friendlyName ?? null;
    const isConnected = castState === framework.CastState.CONNECTED;

    const devices: DesktopCastDevice[] = [];
    if (deviceName && session) {
        devices.push({
            id: session.getSessionId(),
            isSelected: true,
            name: deviceName,
        });
    }

    let status: DesktopCastState['status'] = 'disconnected';
    if (!isElectron()) {
        status = 'unavailable';
    } else if (castState === framework.CastState.CONNECTING) {
        status = 'connecting';
false
        status = 'no-devices';
    } else if (isConnected) {
        status = 'connected';
    } else if (castState === framework.CastState.NOT_CONNECTED) {
        status = 'disconnected';
    }

    return {
        deviceName,
        devices,
        isConnected,
        isScanning: castState === framework.CastState.CONNECTING,
        status,
    };
};

const refreshCastState = () => {
    setCastState(mapCastState());
};

const installSessionListener = () => {
    const framework = getCastFramework();
    if (!context || !framework || sessionListenerInstalled) return;
    sessionListenerInstalled = true;
    context.addEventListener(framework.CastContextEventType.CAST_STATE_CHANGED, refreshCastState);
    context.addEventListener(
        framework.CastContextEventType.SESSION_STATE_CHANGED,
        refreshCastState,
    );
};

export const initializeDesktopCast = async () => {
    if (!isElectron()) {
        setCastState({ status: 'unavailable' });
        return false;
    }

    const loaded = await loadCastFramework();
    const framework = getCastFramework();
    if (!loaded || !framework) {
        setCastState({ status: 'unavailable' });
        return false;
    }

    context = framework.CastContext.getInstance();
    const options = new framework.CastOptions();
    options.receiverApplicationId = DEFAULT_RECEIVER_APP_ID;
    options.autoJoinPolicy = framework.AutoJoinPolicy.ORIGIN_SCOPED;

    if (!initialized) {
        context.setOptions(options);
        installSessionListener();
        initialized = true;
    } else {
        context.setOptions(options);
    }

    refreshCastState();
    return true;
};

export const requestDesktopCastSession = async () => {
    if (!context) {
        throw new Error('Chromecast is not available in this environment.');
    }
    setCastState({ isScanning: true, status: 'connecting' });
    try {
        await context.requestSession();
        refreshCastState();
    } catch (error) {
        refreshCastState();
        throw error;
    }
};

export const stopDesktopCastSession = async () => {
    const session = context?.getCurrentSession();
    if (!session) return;
    await session.endSession(true);
    refreshCastState();
};

const getRemoteMediaClient = (): cast.framework.RemoteMediaClient | null => {
    const session = context?.getCurrentSession() ?? null;
    return session?.getMediaClient() ?? null;
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

    const castTranscode = needsTranscode
        ? {
              bitrate: transcode.bitrate,
              enabled: true,
              format: transcode.format,
          }
        : {
              bitrate: transcode.bitrate,
              enabled: false,
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
    const client = getRemoteMediaClient();
    if (!client || !globalThis.chrome?.cast?.media) {
        throw new Error('No active Chromecast session.');
    }

    const contentUrl = await buildCastStreamUrl(song, transcode);
    if (!contentUrl || !/^https?:\/\//i.test(contentUrl)) {
        throw new Error('Chromecast requires a network stream URL for the current track.');
    }

    const mediaInfo = new chrome.cast.media.MediaInfo(contentUrl, song.container || 'audio/mpeg');
    mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED;
    mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
    mediaInfo.metadata.title = song.name;
    mediaInfo.metadata.artist = song.artistName || song.albumArtistName;
    mediaInfo.metadata.albumName = song.album ?? undefined;
    if (artworkUrl) {
        mediaInfo.metadata.images = [new chrome.cast.Image(artworkUrl)];
    }

    const request = new chrome.cast.media.LoadRequest(mediaInfo);
    request.currentTime = Math.max(0, positionMs / 1000);
    request.autoplay = true;

    return new Promise<void>((resolve, reject) => {
        client.loadMedia(
            request,
            () => resolve(),
            (error) => reject(error ?? new Error('Chromecast load failed')),
        );
    });
};

export const pauseDesktopCast = async () => {
    const client = getRemoteMediaClient();
    if (!client) return;
    await new Promise<void>((resolve, reject) => {
        client.pause(null, resolve, reject);
    });
};

export const playDesktopCast = async () => {
    const client = getRemoteMediaClient();
    if (!client) return;
    await new Promise<void>((resolve, reject) => {
        client.play(null, resolve, reject);
    });
};

export const seekDesktopCast = async (positionMs: number) => {
    const client = getRemoteMediaClient();
    if (!client || !globalThis.chrome?.cast?.media) return;
    const seekRequest = new chrome.cast.media.SeekRequest();
    seekRequest.currentTime = Math.max(0, positionMs / 1000);
    await new Promise<void>((resolve, reject) => {
        client.seek(seekRequest, resolve, reject);
    });
};

export const getDesktopCastSnapshot = () => mapCastState();

export const isDesktopCastConnected = () => {
    const framework = getCastFramework();
    if (!context || !framework) return false;
    return context.getCastState() === framework.CastState.CONNECTED;
};

/** Pre-warm CastContext so devices appear before the output sheet opens. */
export const warmDesktopCastDiscovery = async () => {
    await initializeDesktopCast();
};
