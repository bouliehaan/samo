import type { SamoIpcResult, SamoUserInfo } from '/@/shared/api/samo/samo-http-errors';
import type { ServerAuthenticationResult } from '@samo/core/server';

import { ipcRenderer } from 'electron';

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

export const samo = {
    authenticate,
    clearMediaCredential,
    getUserInfo,
    registerMediaCredential,
    request,
};

export type Samo = typeof samo;
