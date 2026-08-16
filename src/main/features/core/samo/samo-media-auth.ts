import { session } from 'electron';

/**
 * Authenticate renderer-issued Samo media requests with a header instead of a
 * `stream_token` query parameter.
 *
 * An `<img>` cannot carry an `Authorization` header, so the display path used to
 * append a stream token to every artwork URL. That authenticates fine, but the
 * token is *part of the URL*, and Samo's tokens are in-process and short-lived
 * (`internal/users/streamtokens.go` holds them in a map with a 30 minute TTL and
 * drops them on restart). Every re-mint therefore produced a brand new URL for
 * unchanged bytes, and Chromium's disk cache — which the server explicitly opts
 * into with `Cache-Control: public, max-age=31536000, immutable` — could never
 * be reused. A measured reload re-downloaded 4.39 MB of artwork while 162
 * already-cached entries sat unused.
 *
 * Injecting the bearer here lets the renderer emit token-free, stable artwork
 * URLs: same album, same URL, forever, so the second launch pays nothing. The
 * server's `authenticateRequest()` already tries the Authorization bearer before
 * falling back to `stream_token`, so nothing changes server-side.
 *
 * Audio stream URLs deliberately keep their token: mpv is a separate process
 * with its own network stack and never passes through this listener.
 */

/** origin (e.g. `http://192.168.1.10:6969`) -> bearer credential */
const credentialsByOrigin = new Map<string, string>();

/** The filter currently installed on the session, so re-registration is cheap. */
let installedFilter: null | string = null;

const toOrigin = (url: string): null | string => {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
};

const install = () => {
    const origins = [...credentialsByOrigin.keys()].sort();
    const filter = origins.join('|');

    if (filter === installedFilter) {
        return;
    }

    installedFilter = filter;

    // Electron keeps a single `onBeforeSendHeaders` listener per session, so
    // re-registering replaces the previous one rather than stacking. Scope the
    // URL filter to the known Samo origins: a catch-all would run this callback
    // for every request the app makes, and it would risk attaching the
    // credential to a host that has no business seeing it.
    if (origins.length === 0) {
        // A null listener removes the previous one outright, rather than leaving
        // a pass-through callback in the path of every request.
        session.defaultSession.webRequest.onBeforeSendHeaders(null);
        return;
    }

    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: origins.map((origin) => `${origin}/*`) },
        (details, callback) => {
            const origin = toOrigin(details.url);
            const credential = origin ? credentialsByOrigin.get(origin) : undefined;

            // Never overwrite an explicit header — a caller that set one knows
            // better than this blanket rule.
            if (!credential || details.requestHeaders.Authorization) {
                callback({ requestHeaders: details.requestHeaders });
                return;
            }

            callback({
                requestHeaders: {
                    ...details.requestHeaders,
                    Authorization: `Bearer ${credential}`,
                },
            });
        },
    );
};

/**
 * Teach the session how to authenticate one Samo server. Safe to call on every
 * auth pass; it only touches the session when the origin set actually changes.
 */
export const registerSamoMediaCredential = (url: string, credential: string): void => {
    const origin = toOrigin(url);

    if (!origin || !credential) {
        return;
    }

    const known = credentialsByOrigin.get(origin);
    credentialsByOrigin.set(origin, credential);

    if (known === undefined) {
        install();
    }
};

/** Forget a server's credential (sign-out, or the server was removed). */
export const clearSamoMediaCredential = (url: string): void => {
    const origin = toOrigin(url);

    if (origin && credentialsByOrigin.delete(origin)) {
        install();
    }
};
