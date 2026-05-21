import { ipcRenderer, webFrame } from 'electron';
const set = (property, value) => {
    ipcRenderer.send('settings-set', { property, value });
};
const get = async (property) => {
    return ipcRenderer.invoke('settings-get', { property });
};
const restart = () => {
    ipcRenderer.send('app-restart');
};
const enableMediaKeys = () => {
    ipcRenderer.send('global-media-keys-enable');
};
const disableMediaKeys = () => {
    ipcRenderer.send('global-media-keys-disable');
};
const passwordGet = async (server) => {
    return ipcRenderer.invoke('password-get', server);
};
const passwordRemove = (server) => {
    ipcRenderer.send('password-remove', server);
};
const passwordSet = async (password, server) => {
    return ipcRenderer.invoke('password-set', password, server);
};
const setZoomFactor = (zoomFactor) => {
    webFrame.setZoomFactor(zoomFactor / 100);
};
const fontError = (cb) => {
    ipcRenderer.on('custom-font-error', cb);
};
const themeSet = (theme) => {
    ipcRenderer.send('theme-set', theme);
};
const openFileSelector = async (options) => {
    const result = await ipcRenderer.invoke('open-file-selector', options);
    return result;
};
export const toServerType = (value) => {
    switch (value?.toLowerCase()) {
        case 'jellyfin':
            return 'jellyfin';
        case 'navidrome':
            return 'navidrome';
        case 'subsonic':
            return 'subsonic';
        default:
            return null;
    }
};
const SERVER_TYPE = toServerType(process.env.SERVER_TYPE);
const env = {
    LEGACY_AUTHENTICATION: SERVER_TYPE !== null
        ? process.env.LEGACY_AUTHENTICATION?.toLocaleLowerCase() === 'true'
        : false,
    REMOTE_URL: process.env.REMOTE_URL ?? '',
    SERVER_LOCK: SERVER_TYPE !== null ? process.env.SERVER_LOCK?.toLocaleLowerCase() === 'true' : false,
    SERVER_NAME: process.env.SERVER_NAME ?? '',
    SERVER_TYPE,
    SERVER_URL: process.env.SERVER_URL ?? 'http://',
    START_MAXIMIZED: undefined,
};
get('maximized').then((value) => {
    env.START_MAXIMIZED = value;
});
export const localSettings = {
    disableMediaKeys,
    enableMediaKeys,
    env,
    fontError,
    get,
    openFileSelector,
    passwordGet,
    passwordRemove,
    passwordSet,
    restart,
    set,
    setZoomFactor,
    themeSet,
};
