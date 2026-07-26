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

export const samo = {
    authenticate,
    getUserInfo,
    request,
};

export type Samo = typeof samo;
