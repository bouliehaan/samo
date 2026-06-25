import {
    adaptNativeFetch,
    authenticateSamo,
    getFetch,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import { ipcMain } from 'electron';

const samoFetch = adaptNativeFetch(fetch);

export const registerSamoIpcHandlers = () => {
    ipcMain.handle(
        'samo-authenticate',
        async (
            _event,
            data: {
                deviceLabel?: string;
                password: string;
                url: string;
                username: string;
            },
        ): Promise<ServerAuthenticationResult> =>
            authenticateSamo({
                deviceLabel: data.deviceLabel,
                fetch: samoFetch,
                password: data.password,
                url: data.url,
                username: data.username,
            }),
    );

    ipcMain.handle(
        'samo-get-user-info',
        async (
            _event,
            data: {
                credential: string;
                url: string;
            },
        ): Promise<{ id: string; isAdmin: boolean; name: string }> => {
            const response = await getFetch(samoFetch)(
                `${data.url.replace(/\/+$/, '')}/api/v1/users/me`,
                {
                    headers: { Authorization: `Bearer ${data.credential}` },
                    method: 'GET',
                },
            );

            if (!response.ok) {
                throw new Error(`Failed to reach Samo server (${response.status})`);
            }

            const body = (await response.json()) as {
                displayName?: string;
                id?: string;
                role?: string;
                username?: string;
            };

            return {
                id: body.id ?? '',
                isAdmin: body.role === 'admin',
                name: body.displayName ?? body.username ?? '',
            };
        },
    );

    ipcMain.handle(
        'samo-request',
        async (
            _event,
            data: {
                body?: string;
                headers?: Record<string, string>;
                method?: string;
                url: string;
            },
        ): Promise<{
            body: string;
            headers: Record<string, string>;
            ok: boolean;
            status: number;
            statusText: string;
        }> => {
            const response = await getFetch(samoFetch)(data.url, {
                body: data.body,
                headers: data.headers,
                method: data.method,
            });

            const body = response.text
                ? await response.text()
                : JSON.stringify(await response.json());

            const headers: Record<string, string> = {};
            if (response.headers?.get) {
                for (const name of ['content-type', 'content-length', 'content-disposition']) {
                    const value = response.headers.get(name);
                    if (value) {
                        headers[name] = value;
                    }
                }
            }

            return {
                body,
                headers,
                ok: response.ok,
                status: response.status,
                statusText: response.ok ? 'OK' : 'Error',
            };
        },
    );
};
