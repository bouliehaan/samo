import { ipcRenderer } from 'electron';
const updatePosition = (timeSec) => {
    ipcRenderer.send('update-position', timeSec);
};
const updateSeek = (timeSec) => {
    ipcRenderer.send('update-seek', timeSec);
};
const updateVolume = (volume) => {
    ipcRenderer.send('update-volume', volume);
};
const updateStatus = (status) => {
    ipcRenderer.send('update-playback', status);
};
const updateRepeat = (repeat) => {
    ipcRenderer.send('update-repeat', repeat);
};
const updateShuffle = (shuffle) => {
    ipcRenderer.send('update-shuffle', shuffle);
};
const updateSong = (song, imageUrl) => {
    ipcRenderer.send('update-song', song, imageUrl);
};
const requestSeek = (cb) => {
    ipcRenderer.on('request-seek', cb);
};
const requestPosition = (cb) => {
    ipcRenderer.on('request-position', cb);
};
const requestToggleRepeat = (cb) => {
    ipcRenderer.on('mpris-request-toggle-repeat', cb);
};
const requestToggleShuffle = (cb) => {
    ipcRenderer.on('mpris-request-toggle-shuffle', cb);
};
const requestVolume = (cb) => {
    ipcRenderer.on('request-volume', cb);
};
export const mpris = {
    requestPosition,
    requestSeek,
    requestToggleRepeat,
    requestToggleShuffle,
    requestVolume,
    updatePosition,
    updateRepeat,
    updateSeek,
    updateShuffle,
    updateSong,
    updateStatus,
    updateVolume,
};
