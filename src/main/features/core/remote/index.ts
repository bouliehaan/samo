import { ipcMain } from 'electron';
import { createServer, IncomingMessage, Server } from 'http';
import { WebSocket, WebSocketServer, Server as WsServer } from 'ws';

import { serveFile } from './http-static';
import manifest from './manifest.json';

import { subscribePlayerStateEvent } from '/@/main/features/core/player-state-broadcast';
import { getMainWindow } from '/@/main/index';
import { isLinux } from '/@/main/utils';
import { ClientEvent, ServerEvent } from '/@/shared/types/remote-types';
import { PlayerRepeat, SongState } from '/@/shared/types/types';

let mprisPlayer: any | undefined;

async function initMpris() {
    if (isLinux()) {
        const mpris = await import('../../linux/mpris');
        mprisPlayer = mpris.mprisPlayer;
    }
}

initMpris();

interface RemoteConfig {
    enabled: boolean;
    password: string;
    port: number;
    username: string;
}

declare class StatefulWebSocket extends WebSocket {
    alive: boolean;
    auth: boolean;
}

let server: Server | undefined;
let wsServer: undefined | WsServer<typeof StatefulWebSocket>;

const settings: RemoteConfig = {
    enabled: false,
    password: '',
    port: 4333,
    username: '',
};

type SendData = ServerEvent & {
    client: StatefulWebSocket;
};

function broadcast(message: ServerEvent): void {
    if (wsServer) {
        for (const client of wsServer.clients) {
            send({ client, ...message });
        }
    }
}

function send({ client, data, event }: SendData): void {
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

const PING_TIMEOUT_MS = 10000;
const UP_TIMEOUT_MS = 5000;

const currentState: SongState = {};

function authorize(req: IncomingMessage): boolean {
    if (settings.username || settings.password) {
        // https://stackoverflow.com/questions/23616371/basic-http-authentication-with-node-and-express-4

        const authorization = req.headers.authorization?.split(' ')[1] || '';
        const [login, password] = Buffer.from(authorization, 'base64').toString().split(':');

        return login === settings.username && password === settings.password;
    }

    return true;
}

const enableServer = (config: RemoteConfig): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
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
                            } else {
                                res.statusCode = 404;
                                res.setHeader('Content-Type', 'text/plain');
                                res.end('Not Found');
                            }
                        }
                    }
                } catch (error) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end((error as Error).message);
                }
            });

            server.listen(config.port, resolve);
            wsServer = new WebSocketServer<typeof StatefulWebSocket>({ server });

            wsServer!.on('connection', (ws: StatefulWebSocket) => {
                let authFail: number | undefined;
                ws.alive = true;

                if (!settings.username && !settings.password) {
                    ws.auth = true;
                } else {
                    authFail = setTimeout(() => {
                        if (!ws.auth) {
                            ws.close();
                        }
                    }, 10000) as unknown as number;
                }

                ws.on('error', console.error);

                ws.on('message', (data) => {
                    try {
                        const json = JSON.parse(data.toString()) as ClientEvent;
                        const event = json.event;

                        if (!ws.auth) {
                            if (event === 'authenticate') {
                                const auth = json.header.split(' ')[1];
                                const [login, password] = Buffer.from(auth, 'base64')
                                    .toString()
                                    .split(':');

                                if (login === settings.username && password === settings.password) {
                                    ws.auth = true;
                                } else {
                                    ws.close();
                                }

                                clearTimeout(authFail);
                            } else {
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
                                const toFetch = currentState.song?.imageUrl?.replaceAll(
                                    /&(size|width|height)=\d+/g,
                                    '',
                                );

                                if (!toFetch) return;

                                fetch(toFetch)
                                    .then(async (resp) => {
                                        if (!resp.ok)
                                            throw new Error(`HTTP error! status: ${resp.status}`);
                                        const arrayBuffer = await resp.arrayBuffer();
                                        if (ws.readyState === WebSocket.OPEN) {
                                            send({
                                                client: ws,
                                                data: Buffer.from(arrayBuffer).toString('base64'),
                                                event: 'proxy',
                                            });
                                        }
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
                                } else if (volume < 0) {
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
                    } catch (error) {
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

            wsServer!.on('close', () => {
                clearInterval(heartBeat);
            });

            setTimeout(() => {
                reject(new Error('Server did not come up'));
            }, UP_TIMEOUT_MS);
        } catch (error) {
            reject(error);
            shutdownServer();
        }
    });
};

ipcMain.handle('remote-enable', async (_event, enabled: boolean) => {
    settings.enabled = enabled;

    if (enabled) {
        try {
            await enableServer(settings);
        } catch (error) {
            return (error as Error).message;
        }
    } else {
        shutdownServer();
    }

    return null;
});

ipcMain.handle('remote-port', async (_event, port: number) => {
    settings.port = port;
});

ipcMain.on('remote-password', (_event, password: string) => {
    settings.password = password;
    wsServer?.clients.forEach((client) => client.close(4002));
});

ipcMain.handle(
    'remote-settings',
    async (_event, enabled: boolean, port: number, username: string, password: string) => {
        settings.enabled = enabled;
        settings.password = password;
        settings.port = port;
        settings.username = username;

        if (enabled) {
            try {
                await enableServer(settings);
            } catch (error) {
                return (error as Error).message;
            }
        } else {
            shutdownServer();
        }

        return null;
    },
);

ipcMain.on('remote-username', (_event, username: string) => {
    settings.username = username;
    wsServer?.clients.forEach((client) => client.close(4002));
});

subscribePlayerStateEvent('favorite', ({ favorite, ids, serverId }) => {
    if (currentState.song?._serverId !== serverId) return;

    const id = currentState.song.id;

    for (const songId of ids) {
        if (songId === id) {
            currentState.song.userFavorite = favorite;
            broadcast({ data: { favorite, id: songId }, event: 'favorite' });
            return;
        }
    }
});

subscribePlayerStateEvent('repeat', (repeat) => {
    currentState.repeat = repeat;
    broadcast({ data: repeat, event: 'repeat' });
});

subscribePlayerStateEvent('shuffle', (shuffle) => {
    currentState.shuffle = shuffle;
    broadcast({ data: shuffle, event: 'shuffle' });
});

subscribePlayerStateEvent('playback', (status) => {
    currentState.status = status;
    broadcast({ data: status, event: 'playback' });
});

subscribePlayerStateEvent('song', ({ imageUrl, song }) => {
    const songChanged = song?.id !== currentState.song?.id;
    if (song) {
        song.imageUrl = imageUrl || null;
    }
    currentState.song = song;

    if (songChanged) {
        broadcast({ data: song || null, event: 'song' });
    }
});

subscribePlayerStateEvent('volume', (volume) => {
    currentState.volume = volume;
    broadcast({ data: volume, event: 'volume' });
});

if (mprisPlayer) {
    mprisPlayer.on('loopStatus', (event: string) => {
        const repeat = event === 'Playlist' ? 'all' : event === 'Track' ? 'one' : 'none';

        currentState.repeat = repeat as PlayerRepeat;
        broadcast({ data: repeat, event: 'repeat' } as ServerEvent);
    });

    mprisPlayer.on('shuffle', (shuffle: boolean) => {
        currentState.shuffle = shuffle;
        broadcast({ data: shuffle, event: 'shuffle' });
    });

    mprisPlayer.on('volume', (vol: number) => {
        let volume = Math.round(vol * 100);

        if (volume > 100) {
            volume = 100;
        } else if (volume < 0) {
            volume = 0;
        }
        currentState.volume = volume;
        broadcast({ data: volume, event: 'volume' });
        getMainWindow()?.webContents.send('request-volume', {
            volume,
        });
    });
}

subscribePlayerStateEvent('position', (position) => {
    currentState.position = position;
    broadcast({ data: position, event: 'position' });
});
