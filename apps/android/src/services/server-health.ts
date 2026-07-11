import {
    checkServerConnectionHealth,
    getServerConnectionKey,
    type ServerAuthenticationResult,
    type ServerConnectionHealthResult,
    ServerConnectionHealthStatus,
} from '@samo/core/server';

export type AndroidServerHealthMap = Record<string, AndroidServerHealthStatus>;

export type AndroidServerHealthStatus =
    | ServerConnectionHealthResult
    | { message: string; status: 'checking' };

export interface AndroidServerHealthSummary {
    authentication: ServerAuthenticationResult | null;
    statuses: AndroidServerHealthMap;
}

// Boot-time check of a saved server connection. Runs in the background after
// the splash has already lifted on the local (offline-first) read, so it
// isn't blocking a visible spinner — 8s was tuned for a LAN box and made a
// perfectly healthy Cloudflare-Tunnel round trip look "unreachable," which
// then surfaced as a scary "Saved server session needs attention" message for
// a server that was just slow, not down.
const ANDROID_SERVER_HEALTH_TIMEOUT_MS = 15_000;

const checkAndroidServerConnectionWithTimeout = (
    authentication: ServerAuthenticationResult,
): Promise<ServerConnectionHealthResult> => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutResult = new Promise<ServerConnectionHealthResult>((resolve) => {
        timeout = setTimeout(() => {
            resolve({
                authentication,
                checkedAt: Date.now(),
                message: 'Server health check timed out.',
                ok: false,
                status: ServerConnectionHealthStatus.UNREACHABLE,
            });
        }, ANDROID_SERVER_HEALTH_TIMEOUT_MS);
    });

    return Promise.race([
        checkServerConnectionHealth({ authentication }),
        timeoutResult,
    ]).finally(() => {
        if (timeout) {
            clearTimeout(timeout);
        }
    });
};

export const createCheckingServerHealthMap = (
    authentication: ServerAuthenticationResult | null,
): AndroidServerHealthMap => {
    if (!authentication) return {};
    return {
        [getServerConnectionKey(authentication)]: {
            message: 'Checking saved session',
            status: 'checking',
        },
    };
};

export const createConnectedServerHealthStatus = (
    authentication: ServerAuthenticationResult,
): ServerConnectionHealthResult => {
    return {
        authentication,
        checkedAt: Date.now(),
        message: authentication.details,
        ok: true,
        status: ServerConnectionHealthStatus.HEALTHY,
    };
};

export const checkAndroidServerConnection = async (
    authentication: ServerAuthenticationResult | null,
): Promise<AndroidServerHealthSummary> => {
    if (!authentication) {
        return { authentication: null, statuses: {} };
    }
    const result = await checkAndroidServerConnectionWithTimeout(authentication);
    return {
        authentication: result.status === ServerConnectionHealthStatus.UNAUTHORIZED ? null : result.authentication,
        statuses: { [getServerConnectionKey(result.authentication)]: result },
    };
};
