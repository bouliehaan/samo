import { ipcRenderer } from 'electron';
const removeAllListeners = (channel) => {
    ipcRenderer.removeAllListeners(channel);
};
const send = (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
};
const invoke = (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
};
const on = (channel, listener) => {
    ipcRenderer.on(channel, listener);
};
const removeListener = (channel, listener) => {
    ipcRenderer.removeListener(channel, listener);
};
export const ipc = {
    invoke,
    on,
    removeAllListeners,
    removeListener,
    send,
};
