import { ipcRenderer, IpcRendererEvent, OpenDialogOptions, webFrame } from 'electron';

import { HotkeyBindings } from '/@/shared/types/hotkeys';
import { TitleTheme } from '/@/shared/types/types';

const set = (
    property: string,
    value: boolean | Record<string, unknown> | string | string[] | undefined,
) => {
    ipcRenderer.send('settings-set', { property, value });
};

const get = async (property: string) => {
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

// Re-registers every global accelerator in main and rebuilds the native menu
// accelerators, so it has to be sent the complete binding map, not a delta.
const setGlobalShortcuts = (bindings: HotkeyBindings) => {
    ipcRenderer.send('set-global-shortcuts', bindings);
};

const passwordGet = async (server: string): Promise<null | string> => {
    return ipcRenderer.invoke('password-get', server);
};

const passwordRemove = (server: string) => {
    ipcRenderer.send('password-remove', server);
};

const passwordSet = async (password: string, server: string): Promise<boolean> => {
    return ipcRenderer.invoke('password-set', password, server);
};

const authPersistGet = async (name: string): Promise<null | string> =>
    ipcRenderer.invoke('auth-persist-get', name);

const authPersistSet = async (name: string, value: string): Promise<void> =>
    ipcRenderer.invoke('auth-persist-set', name, value);

const authPersistRemove = (name: string) => {
    ipcRenderer.send('auth-persist-remove', name);
};

const setZoomFactor = (zoomFactor: number) => {
    webFrame.setZoomFactor(zoomFactor / 100);
};

const fontError = (cb: (event: IpcRendererEvent, file: string) => void) => {
    ipcRenderer.on('custom-font-error', cb);
};

const themeSet = (theme: TitleTheme): void => {
    ipcRenderer.send('theme-set', theme);
};

const openFileSelector = async (options?: OpenDialogOptions) => {
    const result = await ipcRenderer.invoke('open-file-selector', options);
    return result;
};

export const toServerType = (value?: string): null | string => {
    switch (value?.toLowerCase()) {
        case 'samo':
            return 'samo';
        default:
            return null;
    }
};

const SERVER_TYPE = toServerType(process.env.SERVER_TYPE);

const env = {
    LEGACY_AUTHENTICATION:
        SERVER_TYPE !== null
            ? process.env.LEGACY_AUTHENTICATION?.toLocaleLowerCase() === 'true'
            : false,
    REMOTE_URL: process.env.REMOTE_URL ?? '',
    SERVER_LOCK:
        SERVER_TYPE !== null ? process.env.SERVER_LOCK?.toLocaleLowerCase() === 'true' : false,
    SERVER_NAME: process.env.SERVER_NAME ?? '',
    SERVER_TYPE,
    SERVER_URL: process.env.SERVER_URL ?? 'http://',
};

export const localSettings = {
    authPersistGet,
    authPersistRemove,
    authPersistSet,
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
    setGlobalShortcuts,
    setZoomFactor,
    themeSet,
};

export type LocalSettings = typeof localSettings;
