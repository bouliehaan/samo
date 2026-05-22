import { ipcRenderer, IpcRendererEvent } from 'electron';

const exit = () => {
    ipcRenderer.send('window-close');
};

const maximize = () => {
    ipcRenderer.send('window-maximize');
};

const minimize = () => {
    ipcRenderer.send('window-minimize');
};

const unmaximize = () => {
    ipcRenderer.send('window-unmaximize');
};

const quit = () => {
    ipcRenderer.send('window-quit');
};

const devtools = () => {
    ipcRenderer.send('window-dev-tools');
};

const clearCache = (): Promise<void> => {
    return ipcRenderer.invoke('window-clear-cache');
};

const isMaximized = (): Promise<boolean> => {
    return ipcRenderer.invoke('window-is-maximized');
};

const onMaximizeStateChanged = (cb: (event: IpcRendererEvent, maximized: boolean) => void) => {
    ipcRenderer.on('window-maximize-state', cb);
    return () => {
        ipcRenderer.removeListener('window-maximize-state', cb);
    };
};

export const browser = {
    clearCache,
    devtools,
    exit,
    isMaximized,
    maximize,
    minimize,
    onMaximizeStateChanged,
    quit,
    setIgnoreMouseEvents: (ignore: boolean) => {
        ipcRenderer.send('set-ignore-mouse-events', ignore);
    },
    unmaximize,
};

export type Browser = typeof browser;
