import { ipcRenderer } from 'electron';
const requestFavorite = (cb) => {
    ipcRenderer.on('request-favorite', cb);
};
const requestPosition = (cb) => {
    ipcRenderer.on('request-position', cb);
};
const requestRating = (cb) => {
    ipcRenderer.on('request-rating', cb);
};
const requestSeek = (cb) => {
    ipcRenderer.on('request-seek', cb);
};
const requestVolume = (cb) => {
    ipcRenderer.on('request-volume', cb);
};
const setRemoteEnabled = (enabled) => {
    const result = ipcRenderer.invoke('remote-enable', enabled);
    return result;
};
const setRemotePort = (port) => {
    const result = ipcRenderer.invoke('remote-port', port);
    return result;
};
const updateFavorite = (favorite, serverId, ids) => {
    ipcRenderer.send('update-favorite', favorite, serverId, ids);
};
const updatePassword = (password) => {
    ipcRenderer.send('remote-password', password);
};
const updatePlayback = (playback) => {
    ipcRenderer.send('update-playback', playback);
};
const updateSetting = (enabled, port, username, password) => {
    return ipcRenderer.invoke('remote-settings', enabled, port, username, password);
};
const updateRating = (rating, serverId, ids) => {
    ipcRenderer.send('update-rating', rating, serverId, ids);
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
const updateUsername = (username) => {
    ipcRenderer.send('remote-username', username);
};
const updateVolume = (volume) => {
    ipcRenderer.send('update-volume', volume);
};
const updatePosition = (timeSec) => {
    ipcRenderer.send('update-position', timeSec);
};
export const remote = {
    requestFavorite,
    requestPosition,
    requestRating,
    requestSeek,
    requestVolume,
    setRemoteEnabled,
    setRemotePort,
    updateFavorite,
    updatePassword,
    updatePlayback,
    updatePosition,
    updateRating,
    updateRepeat,
    updateSetting,
    updateShuffle,
    updateSong,
    updateUsername,
    updateVolume,
};
