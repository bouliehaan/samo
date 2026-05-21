import axios from 'axios';
import { app, ipcMain } from 'electron';
import { promises } from 'fs';
import { readFile } from 'fs/promises';
import { createServer } from 'http';
import { join } from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { deflate, gzip } from 'zlib';
import manifest from './manifest.json';
import { getMainWindow } from '/@/main/index';
import { isLinux } from '/@/main/utils';
let mprisPlayer;
async function initMpris() {
    if (isLinux()) {
        const mpris = await import('../../linux/mpris');
        mprisPlayer = mpris.mprisPlayer;
    }
}
initMpris();
let server;
let wsServer;
const settings = {
    enabled: false,
    password: '',
    port: 4333,
    username: '',
};
function broadcast(message) {
    if (wsServer) {
        for (const client of wsServer.clients) {
            send({ client, ...message });
        }
    }
}
function send({ client, data, event }) {
    if (client.readyState === WebSocket.OPEN) {
        if (client.alive && client.auth) {
            client.send(JSON.stringify({ data, event }));
        }
    }
}
export const shutdownServer = () => {
    if (wsServer) {
        wsServer.clients.forEach((client) => client.close(4000));
        wsServer.close();
        wsServer = undefined;
    }
    if (server) {
        server.close();
        server = undefined;
    }
};
const MIME_TYPES = {
    css: 'text/css',
    html: 'text/html; charset=UTF-8',
    ico: 'image/x-icon',
    js: 'application/javascript',
    png: 'image/png',
    svg: 'image/svg+xml',
};
const PING_TIMEOUT_MS = 10000;
const UP_TIMEOUT_MS = 5000;
var Encoding;
(function (Encoding) {
    Encoding["GZIP"] = "gzip";
    Encoding["NONE"] = "none";
    Encoding["ZLIB"] = "deflate";
})(Encoding || (Encoding = {}));
const GZIP_REGEX = /\bgzip\b/;
const ZLIB_REGEX = /bdeflate\b/;
const currentState = {};
const getEncoding = (encoding) => {
    const encodingArray = Array.isArray(encoding) ? encoding : [encoding];
    for (const code of encodingArray) {
        if (code.match(GZIP_REGEX)) {
            return Encoding.GZIP;
        }
        if (code.match(ZLIB_REGEX)) {
            return Encoding.ZLIB;
        }
    }
    return Encoding.NONE;
};
const cache = new Map();
function authorize(req) {
    if (settings.username || settings.password) {
        // https://stackoverflow.com/questions/23616371/basic-http-authentication-with-node-and-express-4
        const authorization = req.headers.authorization?.split(' ')[1] || '';
        const [login, password] = Buffer.from(authorization, 'base64').toString().split(':');
        return login === settings.username && password === settings.password;
    }
    return true;
}
async function serveFile(req, file, extension, res) {
    const fileName = `${file}.${extension}`;
    const path = app.isPackaged
        ? join(__dirname, '../remote', fileName)
        : join(__dirname, '../../out/remote', fileName);
    let stats;
    try {
        stats = await promises.stat(path);
    }
    catch (error) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end(error.message);
        // This is a resolve, even though it is an error, because we want specific (non 500) status
        return Promise.resolve();
    }
    const encodings = req.headers['accept-encoding'] ?? '';
    const selectedEncoding = getEncoding(encodings);
    const ifMatch = req.headers['if-none-match'];
    const fileInfo = cache.get(fileName);
    let cached = fileInfo?.get(selectedEncoding);
    if (cached && cached[0] !== stats.mtimeMs) {
        cache.get(fileName).delete(selectedEncoding);
        cached = undefined;
    }
    if (ifMatch && cached) {
        const options = ifMatch.split(',');
        for (const option of options) {
            const mTime = Number(option.replaceAll('"', '').trim());
            if (cached[0] === mTime) {
                setOk(res, cached[0], extension, selectedEncoding);
                return Promise.resolve();
            }
        }
    }
    if (!cached || cached[0] !== stats.mtimeMs) {
        const content = await readFile(path);
        switch (selectedEncoding) {
            case Encoding.GZIP:
                return new Promise((resolve, reject) => {
                    gzip(content, (error, result) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        const newEntry = [stats.mtimeMs, result];
                        if (fileInfo) {
                            fileInfo.set(selectedEncoding, newEntry);
                        }
                        else {
                            cache.set(fileName, new Map([[selectedEncoding, newEntry]]));
                        }
                        setOk(res, stats.mtimeMs, extension, selectedEncoding, result);
                        resolve();
                    });
                });
            case Encoding.ZLIB:
                return new Promise((resolve, reject) => {
                    deflate(content, (error, result) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        const newEntry = [stats.mtimeMs, result];
                        if (fileInfo) {
                            fileInfo.set(selectedEncoding, newEntry);
                        }
                        else {
                            cache.set(fileName, new Map([[selectedEncoding, newEntry]]));
                        }
                        setOk(res, stats.mtimeMs, extension, selectedEncoding, result);
                        resolve();
                    });
                });
            default: {
                const newEntry = [stats.mtimeMs, content];
                if (fileInfo) {
                    fileInfo.set(selectedEncoding, newEntry);
                }
                else {
                    cache.set(fileName, new Map([[selectedEncoding, newEntry]]));
                }
                setOk(res, stats.mtimeMs, extension, selectedEncoding, content);
                return Promise.resolve();
            }
        }
    }
    setOk(res, cached[0], extension, selectedEncoding, cached[1]);
    return Promise.resolve();
}
function setOk(res, mtimeMs, extension, encoding, data) {
    res.statusCode = data ? 200 : 304;
    res.setHeader('Content-Type', MIME_TYPES[extension]);
    res.setHeader('ETag', `"${mtimeMs}"`);
    res.setHeader('Cache-Control', 'public');
    if (encoding !== 'none')
        res.setHeader('Content-Encoding', encoding);
    res.end(data);
}
const enableServer = (config) => {
    return new Promise((resolve, reject) => {
        try {
            if (server) {
                server.close();
            }
            server = createServer({}, async (req, res) => {
                if (!authorize(req)) {
                    res.statusCode = 401;
                    res.setHeader('WWW-Authenticate', 'Basic realm="401"');
                    res.end('Authorization required');
                    return;
                }
                try {
                    switch (req.url) {
                        case '/': {
                            await serveFile(req, 'index', 'html', res);
                            break;
                        }
                        case '/credentials': {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'text/plain');
                            res.end(req.headers.authorization);
                            break;
                        }
                        case '/manifest.json': {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(manifest));
                            break;
                        }
                        case '/remote.css': {
                            await serveFile(req, 'remote', 'css', res);
                            break;
                        }
                        case '/remote.js': {
                            await serveFile(req, 'remote', 'js', res);
                            break;
                        }
                        case '/samologo.png': {
                            await serveFile(req, 'samologo', 'png', res);
                            break;
                        }
                        case '/samologo.svg': {
                            await serveFile(req, 'samologo', 'svg', res);
                            break;
                        }
                        default: {
                            if (req.url?.startsWith('/worker.js')) {
                                await serveFile(req, 'worker', 'js', res);
                            }
                            else {
                                res.statusCode = 404;
                                res.setHeader('Content-Type', 'text/plain');
                                res.end('Not Found');
                            }
                        }
                    }
                }
                catch (error) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end(error.message);
                }
            });
            server.listen(config.port, resolve);
            wsServer = new WebSocketServer({ server });
            wsServer.on('connection', (ws) => {
                let authFail;
                ws.alive = true;
                if (!settings.username && !settings.password) {
                    ws.auth = true;
                }
                else {
                    authFail = setTimeout(() => {
                        if (!ws.auth) {
                            ws.close();
                        }
                    }, 10000);
                }
                ws.on('error', console.error);
                ws.on('message', (data) => {
                    try {
                        const json = JSON.parse(data.toString());
                        const event = json.event;
                        if (!ws.auth) {
                            if (event === 'authenticate') {
                                const auth = json.header.split(' ')[1];
                                const [login, password] = Buffer.from(auth, 'base64')
                                    .toString()
                                    .split(':');
                                if (login === settings.username && password === settings.password) {
                                    ws.auth = true;
                                }
                                else {
                                    ws.close();
                                }
                                clearTimeout(authFail);
                            }
                            else {
                                return;
                            }
                        }
                        switch (event) {
                            case 'favorite': {
                                const { favorite, id } = json;
                                if (id && id === currentState.song?.id) {
                                    getMainWindow()?.webContents.send('request-favorite', {
                                        favorite,
                                        id,
                                        serverId: currentState.song._serverId,
                                    });
                                }
                                break;
                            }
                            case 'next': {
                                getMainWindow()?.webContents.send('renderer-player-next');
                                break;
                            }
                            case 'pause': {
                                getMainWindow()?.webContents.send('renderer-player-pause');
                                break;
                            }
                            case 'play': {
                                getMainWindow()?.webContents.send('renderer-player-play');
                                break;
                            }
                            case 'previous': {
                                getMainWindow()?.webContents.send('renderer-player-previous');
                                break;
                            }
                            case 'proxy': {
                                const toFetch = currentState.song?.imageUrl?.replaceAll(/&(size|width|height)=\d+/g, '');
                                if (!toFetch)
                                    return;
                                axios
                                    .get(toFetch, { responseType: 'arraybuffer' })
                                    .then((resp) => {
                                    if (ws.readyState === WebSocket.OPEN) {
                                        send({
                                            client: ws,
                                            data: Buffer.from(resp.data, 'binary').toString('base64'),
                                            event: 'proxy',
                                        });
                                    }
                                    return null;
                                })
                                    .catch((error) => {
                                    if (ws.readyState === WebSocket.OPEN) {
                                        send({
                                            client: ws,
                                            data: error.message,
                                            event: 'error',
                                        });
                                    }
                                });
                                break;
                            }
                            case 'rating': {
                                const { id, rating } = json;
                                if (id && id === currentState.song?.id) {
                                    getMainWindow()?.webContents.send('request-rating', {
                                        id,
                                        rating,
                                        serverId: currentState.song._serverId,
                                    });
                                }
                                break;
                            }
                            case 'repeat': {
                                getMainWindow()?.webContents.send('renderer-player-toggle-repeat');
                                break;
                            }
                            case 'shuffle': {
                                getMainWindow()?.webContents.send('renderer-player-toggle-shuffle');
                                break;
                            }
                            case 'volume': {
                                let volume = Number(json.volume);
                                if (volume > 100) {
                                    volume = 100;
                                }
                                else if (volume < 0) {
                                    volume = 0;
                                }
                                currentState.volume = volume;
                                broadcast({ data: volume, event: 'volume' });
                                getMainWindow()?.webContents.send('request-volume', {
                                    volume,
                                });
                                if (mprisPlayer) {
                                    mprisPlayer.volume = volume / 100;
                                }
                                break;
                            }
                            case 'position': {
                                const { position } = json;
                                if (mprisPlayer) {
                                    mprisPlayer.getPosition = () => position * 1e6;
                                }
                                getMainWindow()?.webContents.send('request-position', {
                                    position,
                                });
                            }
                        }
                    }
                    catch (error) {
                        console.error(error);
                    }
                });
                ws.on('pong', () => {
                    ws.alive = true;
                });
                ws.send(JSON.stringify({ data: currentState, event: 'state' }));
            });
            const heartBeat = setInterval(() => {
                wsServer?.clients.forEach((ws) => {
                    if (!ws.alive) {
                        ws.terminate();
                        return;
                    }
                    ws.alive = false;
                    ws.ping();
                });
            }, PING_TIMEOUT_MS);
            wsServer.on('close', () => {
                clearInterval(heartBeat);
            });
            setTimeout(() => {
                reject(new Error('Server did not come up'));
            }, UP_TIMEOUT_MS);
        }
        catch (error) {
            reject(error);
            shutdownServer();
        }
    });
};
ipcMain.handle('remote-enable', async (_event, enabled) => {
    settings.enabled = enabled;
    if (enabled) {
        try {
            await enableServer(settings);
        }
        catch (error) {
            return error.message;
        }
    }
    else {
        shutdownServer();
    }
    return null;
});
ipcMain.handle('remote-port', async (_event, port) => {
    settings.port = port;
});
ipcMain.on('remote-password', (_event, password) => {
    settings.password = password;
    wsServer?.clients.forEach((client) => client.close(4002));
});
ipcMain.handle('remote-settings', async (_event, enabled, port, username, password) => {
    settings.enabled = enabled;
    settings.password = password;
    settings.port = port;
    settings.username = username;
    if (enabled) {
        try {
            await enableServer(settings);
        }
        catch (error) {
            return error.message;
        }
    }
    else {
        shutdownServer();
    }
    return null;
});
ipcMain.on('remote-username', (_event, username) => {
    settings.username = username;
    wsServer?.clients.forEach((client) => client.close(4002));
});
ipcMain.on('update-favorite', (_event, favorite, serverId, ids) => {
    if (currentState.song?._serverId !== serverId)
        return;
    const id = currentState.song.id;
    for (const songId of ids) {
        if (songId === id) {
            currentState.song.userFavorite = favorite;
            broadcast({ data: { favorite, id: songId }, event: 'favorite' });
            return;
        }
    }
});
ipcMain.on('update-rating', (_event, rating, serverId, ids) => {
    if (currentState.song?._serverId !== serverId)
        return;
    const id = currentState.song.id;
    for (const songId of ids) {
        if (songId === id) {
            currentState.song.userRating = rating;
            broadcast({ data: { id: songId, rating }, event: 'rating' });
            return;
        }
    }
});
ipcMain.on('update-repeat', (_event, repeat) => {
    currentState.repeat = repeat;
    broadcast({ data: repeat, event: 'repeat' });
});
ipcMain.on('update-shuffle', (_event, shuffle) => {
    currentState.shuffle = shuffle;
    broadcast({ data: shuffle, event: 'shuffle' });
});
ipcMain.on('update-playback', (_event, status) => {
    currentState.status = status;
    broadcast({ data: status, event: 'playback' });
});
ipcMain.on('update-song', (_event, song, imageUrl) => {
    const songChanged = song?.id !== currentState.song?.id;
    if (song) {
        song.imageUrl = imageUrl || null;
    }
    currentState.song = song;
    if (songChanged) {
        broadcast({ data: song || null, event: 'song' });
    }
});
ipcMain.on('update-volume', (_event, volume) => {
    currentState.volume = volume;
    broadcast({ data: volume, event: 'volume' });
});
if (mprisPlayer) {
    mprisPlayer.on('loopStatus', (event) => {
        const repeat = event === 'Playlist' ? 'all' : event === 'Track' ? 'one' : 'none';
        currentState.repeat = repeat;
        broadcast({ data: repeat, event: 'repeat' });
    });
    mprisPlayer.on('shuffle', (shuffle) => {
        currentState.shuffle = shuffle;
        broadcast({ data: shuffle, event: 'shuffle' });
    });
    mprisPlayer.on('volume', (vol) => {
        let volume = Math.round(vol * 100);
        if (volume > 100) {
            volume = 100;
        }
        else if (volume < 0) {
            volume = 0;
        }
        currentState.volume = volume;
        broadcast({ data: volume, event: 'volume' });
        getMainWindow()?.webContents.send('request-volume', {
            volume,
        });
    });
}
ipcMain.on('update-position', (_event, position) => {
    currentState.position = position;
    broadcast({ data: position, event: 'position' });
});
