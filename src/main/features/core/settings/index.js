import { app, dialog, ipcMain, nativeTheme, safeStorage } from 'electron';
import Store from 'electron-store';
import path from 'path';
const getFrame = () => {
    const isWindows = process.platform === 'win32';
    const isMacOS = process.platform === 'darwin';
    if (isWindows) {
        return 'windows';
    }
    if (isMacOS) {
        return 'macos';
    }
    return 'linux';
};
const isDevelopment = process.env.NODE_ENV === 'development';
const defaultUserDataPath = app.getPath('userData');
const storePath = isDevelopment
    ? path.normalize(`${defaultUserDataPath}-dev`)
    : path.normalize(defaultUserDataPath);
export const store = new Store({
    beforeEachMigration: (_store, context) => {
        console.log(`settings migrate from ${context.fromVersion} → ${context.toVersion}`);
    },
    cwd: storePath,
    defaults: {
        disable_auto_updates: false,
        global_media_hotkeys: true,
        lyrics: ['lrclib.net'],
        mediaSession: false,
        offline_mode: false,
        playbackType: 'local',
        should_prompt_accessibility: true,
        shown_accessibility_warning: false,
        visualizer_system_audio_consent_granted: false,
        window_enable_tray: true,
        window_exit_to_tray: false,
        window_minimize_to_tray: false,
        window_start_minimized: false,
        window_window_bar_style: getFrame(),
    },
    migrations: {
        '>=0.21.2': (store) => {
            store.set('window_bar_style', 'linux');
        },
    },
});
ipcMain.handle('settings-get', (_event, data) => {
    return store.get(`${data.property}`);
});
ipcMain.on('settings-set', (__event, data) => {
    if (data.value === undefined) {
        store.delete(data.property);
    }
    else {
        store.set(data.property, data.value);
    }
});
ipcMain.handle('password-get', (_event, server) => {
    if (safeStorage.isEncryptionAvailable()) {
        const servers = store.get('server');
        if (!servers) {
            return null;
        }
        const encrypted = servers[server];
        if (!encrypted)
            return null;
        const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'hex'));
        return decrypted;
    }
    return null;
});
ipcMain.on('password-remove', (_event, server) => {
    const passwords = store.get('server', {});
    if (server in passwords) {
        delete passwords[server];
    }
    store.set({ server: passwords });
});
ipcMain.handle('password-set', (_event, password, server) => {
    if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(password);
        const passwords = store.get('server', {});
        passwords[server] = encrypted.toString('hex');
        store.set({ server: passwords });
        return true;
    }
    return false;
});
ipcMain.on('theme-set', (_event, theme) => {
    store.set('theme', theme);
    nativeTheme.themeSource = theme;
});
ipcMain.handle('open-file-selector', async (_event, options) => {
    const result = await dialog.showOpenDialog({
        ...options,
        properties: ['openFile'],
    });
    return result.filePaths[0] || null;
});
