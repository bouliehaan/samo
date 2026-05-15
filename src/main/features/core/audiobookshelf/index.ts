import { normalizeBaseUrl } from '@samo/core/server';
import { app, ipcMain } from 'electron';
import log from 'electron-log/main';
import { randomUUID } from 'node:crypto';
import { createServer, Server, ServerResponse } from 'node:http';

type AudiobookshelfProxySession = {
    baseUrl: string;
    cleanupTimer: ReturnType<typeof setTimeout>;
    ownerSessionId: string;
    token: string;
};

const PROXY_SESSION_TTL_MS = 6 * 60 * 60 * 1000;

const audiobookshelfProxySessions = new Map<string, AudiobookshelfProxySession>();
let audiobookshelfProxyServer: null | Server = null;
let audiobookshelfProxyPort: null | number = null;

const sendAudiobookshelfProxyResponse = (
    response: ServerResponse,
    statusCode: number,
    body: string,
) => {
    response.writeHead(statusCode, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
    });
    response.end(body);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const releaseProxySession = (proxySessionId: string) => {
    const session = audiobookshelfProxySessions.get(proxySessionId);

    if (!session) {
        return;
    }

    clearTimeout(session.cleanupTimer);
    audiobookshelfProxySessions.delete(proxySessionId);
};

const releaseProxySessionsForOwner = (ownerSessionId: string) => {
    for (const [proxySessionId, session] of audiobookshelfProxySessions) {
        if (session.ownerSessionId === ownerSessionId) {
            releaseProxySession(proxySessionId);
        }
    }
};

const scheduleProxySessionCleanup = (proxySessionId: string) => {
    const timer = setTimeout(() => {
        releaseProxySession(proxySessionId);
    }, PROXY_SESSION_TTL_MS);

    const nodeTimer = timer as NodeJS.Timeout;
    nodeTimer.unref?.();

    return timer;
};

const touchProxySession = (proxySessionId: string, session: AudiobookshelfProxySession) => {
    clearTimeout(session.cleanupTimer);
    session.cleanupTimer = scheduleProxySessionCleanup(proxySessionId);
};

const ensureAudiobookshelfProxyServer = async () => {
    if (audiobookshelfProxyServer && audiobookshelfProxyPort) {
        return audiobookshelfProxyPort;
    }

    audiobookshelfProxyServer = createServer(async (request, response) => {
        try {
            if (!request.url) {
                sendAudiobookshelfProxyResponse(response, 400, 'Missing request URL');
                return;
            }

            const requestUrl = new URL(request.url, 'http://127.0.0.1');
            const match = requestUrl.pathname.match(/^\/audiobookshelf-hls\/([^/]+)(\/.*)$/);

            if (!match) {
                sendAudiobookshelfProxyResponse(response, 404, 'Not found');
                return;
            }

            const [, proxySessionId, upstreamPath] = match;
            const session = audiobookshelfProxySessions.get(proxySessionId);

            if (!session) {
                sendAudiobookshelfProxyResponse(
                    response,
                    404,
                    'Unknown Audiobookshelf proxy session',
                );
                return;
            }

            touchProxySession(proxySessionId, session);

            const fetchUpstream = (path: string) =>
                fetch(`${session.baseUrl}${path}${requestUrl.search}`, {
                    headers: {
                        Authorization: `Bearer ${session.token}`,
                    },
                });

            let upstreamResponse = await fetchUpstream(upstreamPath);

            if (!upstreamResponse.ok && upstreamPath.endsWith('.ts')) {
                await new Promise((resolve) => setTimeout(resolve, 250));
                upstreamResponse = await fetchUpstream(upstreamPath);
            }

            if (
                !upstreamResponse.ok &&
                upstreamPath.endsWith('.ts') &&
                upstreamPath.startsWith('/hls/')
            ) {
                const pathWithoutHlsPrefix = upstreamPath.replace(/^\/hls\//, '/');
                upstreamResponse = await fetchUpstream(pathWithoutHlsPrefix);
            }

            if (!upstreamResponse.ok) {
                sendAudiobookshelfProxyResponse(
                    response,
                    upstreamResponse.status,
                    `Audiobookshelf proxy request failed: ${upstreamResponse.status}`,
                );
                return;
            }

            const contentType =
                upstreamResponse.headers.get('content-type') ?? 'application/octet-stream';

            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Cache-Control', 'no-store');
            response.setHeader('Content-Type', contentType);

            if (contentType.includes('mpegurl') || upstreamPath.endsWith('.m3u8')) {
                const text = await upstreamResponse.text();
                const localPrefix = `http://127.0.0.1:${audiobookshelfProxyPort}/audiobookshelf-hls/${proxySessionId}`;
                const rewritten = text
                    .replace(new RegExp(escapeRegExp(session.baseUrl), 'g'), localPrefix)
                    .replace(/^\/hls\//gm, `${localPrefix}/`);

                response.end(rewritten);
                return;
            }

            const arrayBuffer = await upstreamResponse.arrayBuffer();
            response.end(Buffer.from(arrayBuffer));
        } catch (error) {
            log.error('Audiobookshelf proxy error', error);
            sendAudiobookshelfProxyResponse(response, 500, 'Audiobookshelf proxy error');
        }
    });

    await new Promise<void>((resolve) => {
        audiobookshelfProxyServer?.listen(0, '127.0.0.1', () => {
            const address = audiobookshelfProxyServer?.address();

            if (typeof address === 'object' && address) {
                audiobookshelfProxyPort = address.port;
            }

            resolve();
        });
    });

    if (!audiobookshelfProxyPort) {
        throw new Error('Failed to start Audiobookshelf proxy server');
    }

    return audiobookshelfProxyPort;
};

const createAudiobookshelfProxyUrl = async (
    baseUrl: string,
    token: string,
    contentUrl: string,
    ownerSessionId: string,
) => {
    const port = await ensureAudiobookshelfProxyServer();
    const proxySessionId = randomUUID();
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
    const url =
        contentUrl.startsWith('http://') || contentUrl.startsWith('https://')
            ? new URL(contentUrl)
            : new URL(contentUrl, normalizedBaseUrl);

    audiobookshelfProxySessions.set(proxySessionId, {
        baseUrl: normalizedBaseUrl,
        cleanupTimer: scheduleProxySessionCleanup(proxySessionId),
        ownerSessionId,
        token,
    });

    return `http://127.0.0.1:${port}/audiobookshelf-hls/${proxySessionId}${url.pathname}${url.search}`;
};

const shutdownAudiobookshelfProxy = () => {
    for (const proxySessionId of audiobookshelfProxySessions.keys()) {
        releaseProxySession(proxySessionId);
    }

    audiobookshelfProxyServer?.close();
    audiobookshelfProxyServer = null;
    audiobookshelfProxyPort = null;
};

ipcMain.handle(
    'audiobookshelf-play-item',
    async (
        _event,
        data: {
            // Optional — when present, /play/:episodeId is hit (podcasts).
            episodeId?: string;
            itemId: string;
            token: string;
            url: string;
        },
    ) => {
        const baseUrl = normalizeBaseUrl(data.url);
        const playPath = data.episodeId
            ? `/api/items/${data.itemId}/play/${data.episodeId}`
            : `/api/items/${data.itemId}/play`;
        const response = await fetch(`${baseUrl}${playPath}`, {
            body: JSON.stringify({}),
            headers: {
                Authorization: `Bearer ${data.token}`,
                'Content-Type': 'application/json',
            },
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`Audiobookshelf play request failed: ${response.status}`);
        }

        const playbackSession = await response.json();
        const ownerSessionId =
            typeof playbackSession.id === 'string' && playbackSession.id.trim()
                ? playbackSession.id
                : randomUUID();

        if (Array.isArray(playbackSession.audioTracks)) {
            playbackSession.audioTracks = await Promise.all(
                playbackSession.audioTracks.map(async (track: { contentUrl?: string }) => {
                    if (!track.contentUrl) {
                        return track;
                    }

                    return {
                        ...track,
                        contentUrl: await createAudiobookshelfProxyUrl(
                            baseUrl,
                            data.token,
                            track.contentUrl,
                            ownerSessionId,
                        ),
                    };
                }),
            );
        }

        return playbackSession;
    },
);

ipcMain.handle(
    'audiobookshelf-sync-playback-session',
    async (
        _event,
        data: {
            body: {
                currentTime: number;
                duration: number;
                timeListened: number;
            };
            sessionId: string;
            token: string;
            url: string;
        },
    ) => {
        const baseUrl = normalizeBaseUrl(data.url);
        const response = await fetch(
            `${baseUrl}/api/session/${encodeURIComponent(data.sessionId)}/sync`,
            {
                body: JSON.stringify(data.body),
                headers: {
                    Authorization: `Bearer ${data.token}`,
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
        );

        if (!response.ok) {
            throw new Error(`Audiobookshelf session sync failed: ${response.status}`);
        }

        await response.text();
    },
);

ipcMain.handle(
    'audiobookshelf-close-playback-session',
    async (
        _event,
        data: {
            body: {
                currentTime: number;
                duration: number;
                timeListened: number;
            };
            sessionId: string;
            token: string;
            url: string;
        },
    ) => {
        const baseUrl = normalizeBaseUrl(data.url);

        try {
            const response = await fetch(
                `${baseUrl}/api/session/${encodeURIComponent(data.sessionId)}/close`,
                {
                    body: JSON.stringify(data.body),
                    headers: {
                        Authorization: `Bearer ${data.token}`,
                        'Content-Type': 'application/json',
                    },
                    method: 'POST',
                },
            );

            if (!response.ok) {
                throw new Error(`Audiobookshelf session close failed: ${response.status}`);
            }
        } finally {
            releaseProxySessionsForOwner(data.sessionId);
        }
    },
);

ipcMain.handle(
    'audiobookshelf-get-item-cover-data-url',
    async (
        _event,
        data: {
            itemId: string;
            token: string;
            url: string;
        },
    ) => {
        const baseUrl = normalizeBaseUrl(data.url);
        const response = await fetch(`${baseUrl}/api/items/${data.itemId}/cover`, {
            headers: {
                Authorization: `Bearer ${data.token}`,
            },
            method: 'GET',
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Audiobookshelf cover request failed: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') ?? 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        return `data:${contentType};base64,${base64}`;
    },
);

ipcMain.handle(
    'audiobookshelf-get-libraries',
    async (
        _event,
        data: {
            token: string;
            url: string;
        },
    ) => {
        const baseUrl = normalizeBaseUrl(data.url);
        const response = await fetch(`${baseUrl}/api/libraries`, {
            headers: {
                Authorization: `Bearer ${data.token}`,
            },
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Audiobookshelf libraries request failed: ${response.status}`);
        }

        return response.json();
    },
);

ipcMain.handle(
    'audiobookshelf-get-library-items',
    async (
        _event,
        data: {
            libraryId: string;
            token: string;
            url: string;
        },
    ) => {
        const baseUrl = normalizeBaseUrl(data.url);
        const response = await fetch(`${baseUrl}/api/libraries/${data.libraryId}/items`, {
            headers: {
                Authorization: `Bearer ${data.token}`,
            },
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Audiobookshelf library items request failed: ${response.status}`);
        }

        return response.json();
    },
);

ipcMain.handle(
    'audiobookshelf-get-item',
    async (
        _event,
        data: {
            itemId: string;
            token: string;
            url: string;
        },
    ) => {
        const baseUrl = normalizeBaseUrl(data.url);
        // ?expanded=1 ensures media.episodes / media.chapters are returned.
        const response = await fetch(`${baseUrl}/api/items/${data.itemId}?expanded=1`, {
            headers: {
                Authorization: `Bearer ${data.token}`,
            },
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Audiobookshelf item request failed: ${response.status}`);
        }

        return response.json();
    },
);

ipcMain.handle(
    'audiobookshelf-login',
    async (
        _event,
        data: {
            password: string;
            url: string;
            username: string;
        },
    ) => {
        const baseUrl = normalizeBaseUrl(data.url);
        const response = await fetch(`${baseUrl}/login`, {
            body: JSON.stringify({
                password: data.password,
                username: data.username,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`Audiobookshelf authentication failed: ${response.status}`);
        }

        return response.json();
    },
);

app.on('before-quit', shutdownAudiobookshelfProxy);
