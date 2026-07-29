import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge } from 'electron';

import { autodiscover } from './autodiscover';
import { browser } from './browser';
import { cast } from './cast';
import { localSettings } from './local-settings';
import { lyrics } from './lyrics';
import { mpris } from './mpris';
import { mpvPlayer, mpvPlayerListener } from './mpv-player';
import { playerState } from './player-state';
import { remote } from './remote';
import { samo } from './samo';
import { utils } from './utils';

// Custom APIs for renderer
const api = {
    autodiscover,
    browser,
    cast,
    localSettings,
    lyrics,
    mpris,
    mpvPlayer,
    mpvPlayerListener,
    playerState,
    remote,
    samo,
    utils,
};

export type PreloadApi = typeof api;

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI);
        contextBridge.exposeInMainWorld('api', api);
    } catch (error) {
        console.error(error);
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI;
    // @ts-ignore (define in dts)
    window.api = api;
}
