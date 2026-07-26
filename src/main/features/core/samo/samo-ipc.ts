import type { SamoIpcResult, SamoUserInfo } from '/@/shared/api/samo/samo-http-errors';

import {
    adaptNativeFetch,
    authenticateSamo,
    getFetch,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import { ipcMain, net } from 'electron';

// Route ALL desktop Samo traffic through Electron's `net.fetch` (Chromium's
// network stack), NOT Node's global `fetch` (undici). The renderer already
// proxies every Samo call here via IPC, so this one client governs auth,
// health, catalog AND progress sync. undici was the cause of "server
// unavailable" / "TypeError: fetch failed" even when the server loads fine in
// a browser: undici ignores the app's `ignore-certificate-errors` switch,
// resolves `localhost`/mDNS IPv6-first against an IPv4-only box, and bypasses
// the system proxy/DNS — all of which Chromium (and therefore `net.fetch`)
// handles, which is exactly why the same URL works in the browser. `net.fetch`
// is invoked lazily per-request so it runs after `app` is ready.
const samoFetch = adaptNativeFetch((url, init) => net.fetch(url, init));

/**
 * `net.fetch`/undici surface the real reason on `error.cause`, but Electron's
 * IPC only serializes an error's `message`/`stack` — so the renderer just saw
 * "fetch failed". Fold the cause into the message so auth failures are
 * actionable (e.g. "... (net::ERR_CONNECTION_REFUSED)").
 */
const withFetchDiagnostics = async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof Error) {
            const cause = (error as { cause?: unknown }).cause;
            const causeText =
                cause instanceof Error
                    ? cause.message
                    : typeof cause === 'string'
                      ? cause
                      : cause && typeof cause === 'object' && 'code' in cause
                        ? String((cause as { code: unknown }).code)
                        : undefined;
            if (causeText && !error.message.includes(causeText)) {
                throw new Error(`${error.message} (${causeText})`);
            }
        }
        throw error;
    }
};

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
            withFetchDiagnostics(() =>
                authenticateSamo({
                    deviceLabel: data.deviceLabel,
                    fetch: samoFetch,
                    password: data.password,
                    url: data.url,
                    username: data.username,
                }),
            ),
    );

    ipcMain.handle(
        'samo-get-user-info',
        async (
            _event,
            data: {
                credential: string;
                url: string;
            },
        ): Promise<SamoIpcResult<SamoUserInfo>> => {
            const response = await withFetchDiagnostics(() =>
                getFetch(samoFetch)(`${data.url.replace(/\/+$/, '')}/api/v1/users/me`, {
                    headers: { Authorization: `Bearer ${data.credential}` },
                    method: 'GET',
                }),
            );

            // Return the status rather than throwing: `ipcRenderer.invoke`
            // flattens a thrown Error to its message, which dropped the status
            // and left the renderer unable to tell a dead session (401/403) from
            // an unreachable server. The renderer rebuilds the error from this.
            if (!response.ok) {
                return { ok: false, status: response.status };
            }

            const body = (await response.json()) as {
                displayName?: string;
                id?: string;
                role?: string;
                username?: string;
            };

            return {
                ok: true,
                value: {
                    id: body.id ?? '',
                    isAdmin: body.role === 'admin',
                    name: body.displayName ?? body.username ?? '',
                },
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
            const response = await withFetchDiagnostics(() =>
                getFetch(samoFetch)(data.url, {
                    body: data.body,
                    headers: data.headers,
                    method: data.method,
                }),
            );

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
