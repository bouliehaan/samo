import { app, ipcMain, shell } from 'electron';

import {
    type CastLoadPayload,
    connectToDevice,
    disconnect,
    getCastState,
    loadMedia,
    onCastState,
    pause,
    play,
    seek,
    shutdownCast,
    startDiscovery,
    stopDiscovery,
} from './cast-service';

import { getMainWindow } from '/@/main/index';

// Push every engine state change to the renderer, which mirrors it into the
// cast store. `webContents.send` no-ops safely if the window is gone.
onCastState((state) => {
    getMainWindow()?.webContents.send('cast:state', state);
});

ipcMain.handle('cast:start-discovery', () => startDiscovery());
ipcMain.handle('cast:stop-discovery', () => {
    stopDiscovery();
});
ipcMain.handle('cast:get-state', () => getCastState());
ipcMain.handle('cast:connect', (_event, deviceId?: string) => connectToDevice(deviceId));
ipcMain.handle('cast:disconnect', () => disconnect());
ipcMain.handle('cast:load', (_event, payload: CastLoadPayload) => loadMedia(payload));
ipcMain.handle('cast:play', () => play());
ipcMain.handle('cast:pause', () => pause());
ipcMain.handle('cast:seek', (_event, positionSeconds: number) => seek(positionSeconds));

// Deep-link to the pane that owns the permission Cast needs; there is no API to
// request the grant, so the picker can only take the user to the switch.
ipcMain.handle('cast:open-network-settings', async () => {
    if (process.platform !== 'darwin') return;
    await shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_LocalNetwork',
    );
});

app.on('before-quit', () => shutdownCast());
