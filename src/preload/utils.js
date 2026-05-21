import { ipcRenderer, webFrame } from 'electron';
import { disableAutoUpdates, isLinux, isMacOS, isWindows } from '../main/utils';
const openItem = async (path) => {
    return ipcRenderer.invoke('open-item', path);
};
const openApplicationDirectory = async () => {
    return ipcRenderer.invoke('open-application-directory');
};
const playerErrorListener = (cb) => {
    ipcRenderer.on('player-error-listener', cb);
};
const mainMessageListener = (cb) => {
    ipcRenderer.on('toast-from-main', cb);
};
const logger = (cb) => {
    ipcRenderer.send('logger', cb);
};
const download = (url) => {
    ipcRenderer.send('download-url', url);
};
const checkForUpdates = () => {
    return ipcRenderer.invoke('app-check-for-updates');
};
const forceGarbageCollection = () => {
    try {
        if (typeof global.gc === 'function') {
            global.gc();
            webFrame.clearCache();
            return true;
        }
        if (typeof window.gc === 'function') {
            window.gc();
            webFrame.clearCache();
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
};
const rendererOpenSettings = (cb) => {
    ipcRenderer.on('renderer-open-settings', cb);
};
const rendererOpenCommandPalette = (cb) => {
    ipcRenderer.on('renderer-open-command-palette', cb);
};
const rendererOpenManageServers = (cb) => {
    ipcRenderer.on('renderer-open-manage-servers', cb);
};
const rendererTogglePrivateMode = (cb) => {
    ipcRenderer.on('renderer-toggle-private-mode', cb);
};
const rendererToggleSidebar = (cb) => {
    ipcRenderer.on('renderer-toggle-sidebar', cb);
};
const rendererOpenReleaseNotes = (cb) => {
    ipcRenderer.on('renderer-open-release-notes', cb);
};
export const utils = {
    checkForUpdates,
    disableAutoUpdates,
    download,
    forceGarbageCollection,
    isLinux,
    isMacOS,
    isWindows,
    logger,
    mainMessageListener,
    openApplicationDirectory,
    openItem,
    playerErrorListener,
    rendererOpenCommandPalette,
    rendererOpenManageServers,
    rendererOpenReleaseNotes,
    rendererOpenSettings,
    rendererTogglePrivateMode,
    rendererToggleSidebar,
};
