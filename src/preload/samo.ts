import type { ServerAuthenticationResult } from '@samo/core/server';

import { ipcRenderer } from 'electron';

const authenticate = (payload: {
    deviceLabel?: string;
    password: string;
    url: string;
    username: string;
}): Promise<ServerAuthenticationResult> => ipcRenderer.invoke('samo-authenticate', payload);

const getUserInfo = (payload: {
    credential: string;
    url: string;
}): Promise<{ id: string; isAdmin: boolean; name: string }> =>
    ipcRenderer.invoke('samo-get-user-info', payload);

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
