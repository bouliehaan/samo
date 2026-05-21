import { normalizeBaseUrl } from '@samo/core/server';
import { webContents } from 'electron';
import log from 'electron-log/main';
import { randomUUID } from 'node:crypto';
import { createServer, Server, ServerResponse } from 'node:http';

const MAX_PROXY_SESSIONS = 48;
const PROXY_SESSION_TTL_MS = 6 * 60 * 60 * 1000;

type AudiobookshelfProxySession = {
    baseUrl: string;
    cleanupTimer: ReturnType<typeof setTimeout>;
    ownerSessionId: string;
    token: string;
    webContentsId: number;
};

const audiobookshelfProxySessions = new Map<string, AudiobookshelfProxySession>();
let audiobookshelfProxyServer: null | Server = null;
let audiobookshelfProxyPort: null | number = null;

const sendAudiobookshelfProxyResponse = (
    response: ServerResponse,
    statusCode: number,
    body: string,
    contentType = 'text/plain',
) => {
    response.writeHead(statusCode, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
    });
    response.end(body);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const releaseProxySession = (proxySessionId: string) => {
    const session = audiobookshelfProxySessions.get(proxySessionId);

    if (!session) {
        return;
    }

    clearTimeout(session.cleanupTimer);
    audiobookshelfProxySessions.delete(proxySessionId);
};

export const releaseProxySessionsForOwner = (ownerSessionId: string) => {
    for (const [proxySessionId, session] of audiobookshelfProxySessions) {
        if (session.ownerSessionId === ownerSessionId) {
            releaseProxySession(proxySessionId);
        }
    }
};

const releaseProxySessionsForWebContents = (webContentsId: number) => {
    for (const [proxySessionId, session] of audiobookshelfProxySessions) {
        if (session.webContentsId === webContentsId) {
            releaseProxySession(proxySessionId);
        }
    }
};

const registerWebContentsCleanup = (webContentsId: number) => {
    const contents = webContents.fromId(webContentsId);
    if (!contents || contents.isDestroyed()) {
        releaseProxySessionsForWebContents(webContentsId);
        return;
    }

    contents.once('destroyed', () => {
        releaseProxySessionsForWebContents(webContentsId);
    });
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

const evictOldestProxySessionIfNeeded = () => {
    if (audiobookshelfProxySessions.size < MAX_PROXY_SESSIONS) {
        return;
    }

    const oldest = audiobookshelfProxySessions.keys().next().value;
    if (typeof oldest === 'string') {
        releaseProxySession(oldest);
    }
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

            if (requestUrl.pathname === '/health') {
                sendAudiobookshelfProxyResponse(
                    response,
                    200,
                    JSON.stringify({
                        ok: true,
                        port: audiobookshelfProxyPort,
                        sessions: audiobookshelfProxySessions.size,
                    }),
                    'application/json',
                );
                return;
            }

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

export const createAudiobookshelfProxyUrl = async (
    baseUrl: string,
    token: string,
    contentUrl: string,
    ownerSessionId: string,
    webContentsId: number,
) => {
    const port = await ensureAudiobookshelfProxyServer();
    evictOldestProxySessionIfNeeded();

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
        webContentsId,
    });

    registerWebContentsCleanup(webContentsId);

    return `http://127.0.0.1:${port}/audiobookshelf-hls/${proxySessionId}${url.pathname}${url.search}`;
};

export const getAudiobookshelfProxyHealthUrl = async () => {
    const port = await ensureAudiobookshelfProxyServer();
    return `http://127.0.0.1:${port}/health`;
};

export const shutdownAudiobookshelfProxy = () => {
    for (const proxySessionId of audiobookshelfProxySessions.keys()) {
        releaseProxySession(proxySessionId);
    }

    audiobookshelfProxyServer?.close();
    audiobookshelfProxyServer = null;
    audiobookshelfProxyPort = null;
};
