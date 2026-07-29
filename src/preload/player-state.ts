import { ipcRenderer } from 'electron';

import { PlayerRepeat, PlayerStatus } from '/@/shared/types/types';

// Pushes renderer-owned state into main's player-state broadcast, which is what
// the dock menu, tray and native menu bar render from. Distinct from the mpris
// and remote namespaces: those are only present on some platforms/settings,
// whereas the native menus always need the current state.

const updatePlayback = (status: PlayerStatus) => {
    ipcRenderer.send('update-playback', status);
};

const updatePrivateMode = (privateMode: boolean) => {
    ipcRenderer.send('update-private-mode', privateMode);
};

const updateRepeat = (repeat: PlayerRepeat) => {
    ipcRenderer.send('update-repeat', repeat);
};

const updateShuffle = (shuffle: boolean) => {
    ipcRenderer.send('update-shuffle', shuffle);
};

const updateSidebarCollapsed = (collapsed: boolean) => {
    ipcRenderer.send('update-sidebar-collapsed', collapsed);
};

export const playerState = {
    updatePlayback,
    updatePrivateMode,
    updateRepeat,
    updateShuffle,
    updateSidebarCollapsed,
};

export type PlayerState = typeof playerState;
