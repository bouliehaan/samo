import { ipcRenderer, IpcRendererEvent } from 'electron';

export interface PreloadCastDevice {
    id: string;
    isSelected: boolean;
    name: string;
}

export interface PreloadCastLoadPayload {
    album?: null | string;
    artist?: null | string;
    artworkUrl?: null | string;
    contentType: string;
    contentUrl: string;
    positionSeconds?: number;
    title: string;
}

export interface PreloadCastState {
    deviceName: null | string;
    devices: PreloadCastDevice[];
    isConnected: boolean;
    isScanning: boolean;
    status: 'blocked' | 'connected' | 'connecting' | 'disconnected' | 'no-devices' | 'unavailable';
}

const startDiscovery = (): Promise<PreloadCastState> => ipcRenderer.invoke('cast:start-discovery');

const stopDiscovery = (): Promise<void> => ipcRenderer.invoke('cast:stop-discovery');

const getState = (): Promise<PreloadCastState> => ipcRenderer.invoke('cast:get-state');

const connect = (deviceId?: string): Promise<void> => ipcRenderer.invoke('cast:connect', deviceId);

const disconnect = (): Promise<void> => ipcRenderer.invoke('cast:disconnect');

const load = (payload: PreloadCastLoadPayload): Promise<void> =>
    ipcRenderer.invoke('cast:load', payload);

const play = (): Promise<void> => ipcRenderer.invoke('cast:play');

const pause = (): Promise<void> => ipcRenderer.invoke('cast:pause');

const seek = (positionSeconds: number): Promise<void> =>
    ipcRenderer.invoke('cast:seek', positionSeconds);

const openNetworkSettings = (): Promise<void> => ipcRenderer.invoke('cast:open-network-settings');

/** Subscribe to main-pushed state; returns an unsubscribe fn. */
const onState = (cb: (state: PreloadCastState) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, state: PreloadCastState) => cb(state);
    ipcRenderer.on('cast:state', handler);
    return () => ipcRenderer.removeListener('cast:state', handler);
};

export const cast = {
    connect,
    disconnect,
    getState,
    load,
    onState,
    openNetworkSettings,
    pause,
    play,
    seek,
    startDiscovery,
    stopDiscovery,
};

export type Cast = typeof cast;
