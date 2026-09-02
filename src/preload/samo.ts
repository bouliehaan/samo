import type { SamoIpcResult, SamoUserInfo } from '/@/shared/api/samo/samo-http-errors';
import type { ServerAuthenticationResult } from '@samo/core/server';

import { ipcRenderer, IpcRendererEvent } from 'electron';

const authenticate = (payload: {
    deviceLabel?: string;
    password: string;
    url: string;
    username: string;
}): Promise<ServerAuthenticationResult> => ipcRenderer.invoke('samo-authenticate', payload);

// Resolves to a result rather than rejecting on HTTP failure — a rejection
// would arrive in the renderer as a bare message with the status stripped.
const getUserInfo = (payload: {
    credential: string;
    url: string;
}): Promise<SamoIpcResult<SamoUserInfo>> => ipcRenderer.invoke('samo-get-user-info', payload);

const request = (payload: {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
    url: string;
}): Promise<{
    body: string;
    headers: Record<string, string>;
    ok: boolean;
    status: number;
    statusText: string;
}> => ipcRenderer.invoke('samo-request', payload);

/**
 * Register a server's bearer with the main process so plain `<img>` requests to
 * it authenticate by header. Artwork URLs then need no `stream_token`, which is
 * what makes them stable enough for the HTTP cache to survive a relaunch.
 */
const registerMediaCredential = (payload: { credential: string; url: string }): void =>
    ipcRenderer.send('samo-register-media-credential', payload);

const clearMediaCredential = (payload: { url: string }): void =>
    ipcRenderer.send('samo-clear-media-credential', payload);

/**
 * Open samo's live catalog-change stream and call `callback` for each event.
 *
 * Separate from `request` because this response never ends: `request` buffers a
 * whole body before replying, which for Server-Sent Events means never
 * replying. The main process owns the connection and pushes frames over here.
 *
 * Returns an unsubscribe function that detaches the listener AND closes the
 * upstream connection, so a signed-out renderer leaves nothing dialling.
 */
const subscribeCatalogEvents = (
    payload: { credential: string; url: string },
    callback: (event: { data: unknown; type: string }) => void,
): (() => void) => {
    const listener = (_event: IpcRendererEvent, value: { data: unknown; type: string }) =>
        callback(value);
    ipcRenderer.on('samo-catalog-event', listener);
    ipcRenderer.send('samo-subscribe-catalog-events', payload);
    return () => {
        ipcRenderer.off('samo-catalog-event', listener);
        ipcRenderer.send('samo-unsubscribe-catalog-events');
    };
};

export const samo = {
    authenticate,
    clearMediaCredential,
    getUserInfo,
    registerMediaCredential,
    request,
    subscribeCatalogEvents,
};

export type Samo = typeof samo;
