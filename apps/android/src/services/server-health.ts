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
    authentications: ServerAuthenticationResult[];
    statuses: AndroidServerHealthMap;
}

const ANDROID_SERVER_HEALTH_TIMEOUT_MS = 8_000;

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
    authentications: ServerAuthenticationResult[],
): AndroidServerHealthMap => {
    return Object.fromEntries(
        authentications.map((authentication) => [
            getServerConnectionKey(authentication),
            {
                message: 'Checking saved session',
                status: 'checking',
            },
        ]),
    );
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

export const checkAndroidServerConnections = async (
    authentications: ServerAuthenticationResult[],
): Promise<AndroidServerHealthSummary> => {
    const results = await Promise.all(
        authentications.map(checkAndroidServerConnectionWithTimeout),
    );

    return {
        authentications: results.map((result) => result.authentication),
        statuses: Object.fromEntries(
            results.map((result) => [getServerConnectionKey(result.authentication), result]),
        ),
    };
};
