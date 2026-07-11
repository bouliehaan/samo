import { ipcRenderer } from 'electron';

// NOTE — this is the wide IPC escape hatch from the original feishin design (audit
// finding D4). Long-term it should be deleted in favor of the typed namespaces
// (mpvPlayer, mpris, …); leave it here until every caller using
// the `const ipc = isElectron() ? window.api.ipc : null;` pattern has been
// retyped to a specific namespace.

const removeAllListeners = (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
};

const send = (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
};

const invoke = (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
};

const on = (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, listener);
};

const removeListener = (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, listener);
};

export const ipc = {
    invoke,
    on,
    removeAllListeners,
    removeListener,
    send,
};

export type Ipc = typeof ipc;
