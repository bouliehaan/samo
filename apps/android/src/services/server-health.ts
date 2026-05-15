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
        authentications.map((authentication) => checkServerConnectionHealth({ authentication })),
    );

    return {
        authentications: results.map((result) => result.authentication),
        statuses: Object.fromEntries(
            results.map((result) => [getServerConnectionKey(result.authentication), result]),
        ),
    };
};
