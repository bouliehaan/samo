/**
 * Shared HTTP-failure vocabulary for the samo client paths.
 *
 * The desktop reaches the server two ways — through Electron IPC (main process)
 * and through `browserFetch` (renderer/remote). Those paths used to fail with
 * different, incompatible error shapes, and callers that branched on "is this an
 * auth failure?" only recognised one of them.
 *
 * The IPC path is the fragile one: `ipcRenderer.invoke` flattens a thrown `Error`
 * to its `message` string, so an HTTP status attached in the main process never
 * reaches the renderer. IPC handlers therefore *return* failures (see
 * `SamoIpcResult`) and the renderer rebuilds a `SamoHttpError` on this side of
 * the boundary, so both paths end up throwing the same thing.
 */

/**
 * Discriminated result for IPC handlers that perform an HTTP request.
 *
 * Handlers must return this rather than throw, so the status survives the
 * boundary. Distinguishing 401/403 from a transport failure is what lets the
 * renderer re-authenticate a dead session instead of tearing it down.
 */
export type SamoIpcResult<T> = { ok: false; status: number } | { ok: true; value: T };

export interface SamoUserInfo {
    id: string;
    isAdmin: boolean;
    name: string;
}

/** An HTTP failure that carries its status in a form callers can branch on. */
export class SamoHttpError extends Error {
    readonly response: { status: number };

    constructor(status: number, message?: string) {
        super(message ?? `samo server request failed (${status})`);
        this.name = 'SamoHttpError';
        this.response = { status };
    }
}

/**
 * Best-effort status extraction.
 *
 * Prefers a structured `error.response.status`, then falls back to a trailing
 * `(401)` in the message. The fallback exists for call sites that still throw
 * bare `Error`s — anything crossing IPC, where only the message survives.
 */
export const httpStatusFromError = (error: unknown): number | undefined => {
    const status = (error as undefined | { response?: { status?: unknown } })?.response?.status;
    if (typeof status === 'number') {
        return status;
    }

    const message = (error as undefined | { message?: unknown })?.message;
    if (typeof message !== 'string') {
        return undefined;
    }

    const match = message.match(/\((\d{3})\)/);
    return match ? Number(match[1]) : undefined;
};

/**
 * True when a failure means "this session is no longer valid" — as opposed to
 * "the server is unreachable", which must NOT discard saved credentials.
 */
export const isAuthFailure = (error: unknown): boolean => {
    const status = httpStatusFromError(error);
    if (status === 401 || status === 403) {
        return true;
    }

    const message = (error as undefined | { message?: unknown })?.message;
    return (
        typeof message === 'string' &&
        (message.toLowerCase().includes('forbidden') ||
            message.toLowerCase().includes('unauthorized'))
    );
};
