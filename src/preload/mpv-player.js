import { ipcRenderer } from 'electron';
const initialize = (data) => {
    return ipcRenderer.invoke('player-initialize', data);
};
const restart = (data) => {
    return ipcRenderer.invoke('player-restart', data);
};
const isRunning = () => {
    return ipcRenderer.invoke('player-is-running');
};
const cleanup = () => {
    return ipcRenderer.invoke('player-clean-up');
};
const setProperties = (data) => {
    ipcRenderer.send('player-set-properties', data);
};
const autoNext = (url) => {
    ipcRenderer.send('player-auto-next', url);
};
const currentTime = () => {
    ipcRenderer.send('player-current-time');
};
const mute = (mute) => {
    ipcRenderer.send('player-mute', mute);
};
const next = () => {
    ipcRenderer.send('player-next');
};
const pause = () => {
    ipcRenderer.send('player-pause');
};
const play = () => {
    ipcRenderer.send('player-play');
};
const previous = () => {
    ipcRenderer.send('player-previous');
};
const seek = (seconds) => {
    ipcRenderer.send('player-seek', seconds);
};
const seekTo = (seconds) => {
    ipcRenderer.send('player-seek-to', seconds);
};
const setQueue = (current, next, pause) => {
    ipcRenderer.send('player-set-queue', current, next, pause);
};
const setQueueNext = (url) => {
    ipcRenderer.send('player-set-queue-next', url);
};
const stop = () => {
    ipcRenderer.send('player-stop');
};
const volume = (value) => {
    ipcRenderer.send('player-volume', value);
};
const quit = () => {
    ipcRenderer.send('player-quit');
};
const getCurrentTime = async () => {
    return ipcRenderer.invoke('player-get-time');
};
const updateMetadata = (data) => {
    ipcRenderer.send('player-update-metadata', data);
};
const getMetadata = async () => {
    return ipcRenderer.invoke('player-metadata');
};
const getStreamMetadata = async (streamUrl) => {
    return ipcRenderer.invoke('player-stream-metadata', streamUrl);
};
const getAudioDevices = async () => {
    return ipcRenderer.invoke('player-get-audio-devices');
};
const rendererAutoNext = (cb) => {
    ipcRenderer.on('renderer-player-auto-next', cb);
};
const rendererCurrentTime = (cb) => {
    ipcRenderer.on('renderer-player-current-time', cb);
};
const rendererNext = (cb) => {
    ipcRenderer.on('renderer-player-next', cb);
};
const rendererPause = (cb) => {
    ipcRenderer.on('renderer-player-pause', cb);
};
const rendererPlay = (cb) => {
    ipcRenderer.on('renderer-player-play', cb);
};
const rendererPlayPause = (cb) => {
    ipcRenderer.on('renderer-player-play-pause', cb);
};
const rendererPrevious = (cb) => {
    ipcRenderer.on('renderer-player-previous', cb);
};
const rendererStop = (cb) => {
    ipcRenderer.on('renderer-player-stop', cb);
};
const rendererSkipForward = (cb) => {
    ipcRenderer.on('renderer-player-skip-forward', cb);
};
const rendererSkipBackward = (cb) => {
    ipcRenderer.on('renderer-player-skip-backward', cb);
};
const rendererVolumeUp = (cb) => {
    ipcRenderer.on('renderer-player-volume-up', cb);
};
const rendererVolumeDown = (cb) => {
    ipcRenderer.on('renderer-player-volume-down', cb);
};
const rendererVolumeMute = (cb) => {
    ipcRenderer.on('renderer-player-volume-mute', cb);
};
const rendererToggleRepeat = (cb) => {
    ipcRenderer.on('renderer-player-toggle-repeat', cb);
};
const rendererToggleShuffle = (cb) => {
    ipcRenderer.on('renderer-player-toggle-shuffle', cb);
};
const rendererQuit = (cb) => {
    ipcRenderer.on('renderer-player-quit', cb);
};
const rendererError = (cb) => {
    ipcRenderer.on('renderer-player-error', cb);
};
const rendererPlayerFallback = (cb) => {
    ipcRenderer.on('renderer-player-fallback', cb);
};
export const mpvPlayer = {
    autoNext,
    cleanup,
    currentTime,
    getAudioDevices,
    getCurrentTime,
    getMetadata,
    getStreamMetadata,
    initialize,
    isRunning,
    mute,
    next,
    pause,
    play,
    previous,
    quit,
    restart,
    seek,
    seekTo,
    setProperties,
    setQueue,
    setQueueNext,
    stop,
    updateMetadata,
    volume,
};
export const mpvPlayerListener = {
    rendererAutoNext,
    rendererCurrentTime,
    rendererError,
    rendererNext,
    rendererPause,
    rendererPlay,
    rendererPlayerFallback,
    rendererPlayPause,
    rendererPrevious,
    rendererQuit,
    rendererSkipBackward,
    rendererSkipForward,
    rendererStop,
    rendererToggleRepeat,
    rendererToggleShuffle,
    rendererVolumeDown,
    rendererVolumeMute,
    rendererVolumeUp,
};
