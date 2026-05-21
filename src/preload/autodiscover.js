import { ipcRenderer } from 'electron';
const discover = (onReply) => {
    const { port1: local, port2: remote } = new MessageChannel();
    ipcRenderer.postMessage('autodiscover-ping', {}, [remote]);
    local.onmessage = (ev) => {
        onReply(ev.data);
    };
    return new Promise((resolve) => {
        local.addEventListener('close', () => resolve());
    });
};
export const autodiscover = {
    discover,
};
