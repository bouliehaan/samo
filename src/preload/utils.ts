import { ipcRenderer, IpcRendererEvent } from 'electron';

import { disableAutoUpdates, isLinux, isMacOS, isWindows } from '../main/utils';
import { subscribe } from './subscribe';

const openItem = async (path: string) => {
    return ipcRenderer.invoke('open-item', path);
};

const openApplicationDirectory = async () => {
    return ipcRenderer.invoke('open-application-directory');
};

const playerErrorListener = (cb: (event: IpcRendererEvent, data: { code: number }) => void) => {
    ipcRenderer.on('player-error-listener', cb);
};

const mainMessageListener = (
    cb: (
        event: IpcRendererEvent,
        data: { message: string; type: 'error' | 'info' | 'success' | 'warning' },
    ) => void,
) => {
    ipcRenderer.on('toast-from-main', cb);
};

const download = (url: string) => {
    ipcRenderer.send('download-url', url);
};

const checkForUpdates = (): Promise<{ updateAvailable: boolean; version?: string }> => {
    return ipcRenderer.invoke('app-check-for-updates');
};

const rendererOpenSettings = (cb: (event: IpcRendererEvent) => void) =>
    subscribe('renderer-open-settings', cb);

const rendererOpenCommandPalette = (cb: (event: IpcRendererEvent) => void) =>
    subscribe('renderer-open-command-palette', cb);

const rendererOpenManageServers = (cb: (event: IpcRendererEvent) => void) =>
    subscribe('renderer-open-manage-servers', cb);

const rendererTogglePrivateMode = (cb: (event: IpcRendererEvent) => void) =>
    subscribe('renderer-toggle-private-mode', cb);

const rendererToggleSidebar = (cb: (event: IpcRendererEvent) => void) =>
    subscribe('renderer-toggle-sidebar', cb);

const rendererOpenReleaseNotes = (cb: (event: IpcRendererEvent) => void) =>
    subscribe('renderer-open-release-notes', cb);

const powerSaveBlockerStart = (): Promise<number> => {
    return ipcRenderer.invoke('power-save-blocker-start');
};

const powerSaveBlockerStop = (): Promise<boolean> => {
    return ipcRenderer.invoke('power-save-blocker-stop');
};

const onUpdateAvailable = (cb: (event: IpcRendererEvent, version: string) => void) => {
    ipcRenderer.on('update-available', cb);
    return () => {
        ipcRenderer.removeListener('update-available', cb);
    };
};

const fetchMedia = (data: {
    headers?: Record<string, string>;
    url: string;
}): Promise<{ contentType: string; data: string }> => {
    return ipcRenderer.invoke('fetch-media', data);
};

export const utils = {
    checkForUpdates,
    disableAutoUpdates,
    download,
    fetchMedia,
    isLinux,
    isMacOS,
    isWindows,
    mainMessageListener,
    onUpdateAvailable,
    openApplicationDirectory,
    openItem,
    playerErrorListener,
    powerSaveBlockerStart,
    powerSaveBlockerStop,
    rendererOpenCommandPalette,
    rendererOpenManageServers,
    rendererOpenReleaseNotes,
    rendererOpenSettings,
    rendererTogglePrivateMode,
    rendererToggleSidebar,
};

export type Utils = typeof utils;
