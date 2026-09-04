import { type ServerAuthenticationResult } from './server-auth';
import { formatServerCapabilities } from './server-capabilities';
import { getFetch, normalizeBaseUrl, type SamoFetch } from './server-http';
import { getSamoBearerToken, getSamoCapabilities, getSamoSetupStatus } from './server-samo';

export enum ServerConnectionHealthStatus {
    ERROR = 'error',
    HEALTHY = 'healthy',
    UNAUTHORIZED = 'unauthorized',
    UNREACHABLE = 'unreachable',
    UNSUPPORTED = 'unsupported',
}

export interface ServerConnectionHealthInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    now?: () => number;
}

export interface ServerConnectionHealthResult {
    authentication: ServerAuthenticationResult;
    checkedAt: number;
    message: string;
    ok: boolean;
    status: ServerConnectionHealthStatus;
}

class ServerHealthResponseError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

const getResponseFailureStatus = (statusCode: number) => {
    if (statusCode === 401 || statusCode === 403) {
        return ServerConnectionHealthStatus.UNAUTHORIZED;
    }

    return ServerConnectionHealthStatus.ERROR;
};

const getNetworkFailureStatus = (error: unknown) => {
    if (error instanceof ServerHealthResponseError) {
        return getResponseFailureStatus(error.statusCode);
    }

    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (
        message.includes('network') ||
        message.includes('failed to fetch') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('offline')
    ) {
        return ServerConnectionHealthStatus.UNREACHABLE;
    }

    return ServerConnectionHealthStatus.ERROR;
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof ServerHealthResponseError) {
        return error.message;
    }

    return error instanceof Error ? error.message : 'Server health check failed';
};

const assertOkResponse = (response: { ok: boolean; status: number }, label: string) => {
    if (!response.ok) {
        throw new ServerHealthResponseError(
            `${label} failed (${response.status})`,
            response.status,
        );
    }
};

const checkSamoHealth = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
) => {
    const baseUrl = normalizeBaseUrl(authentication.url);
    const setup = await getSamoSetupStatus(fetcher, baseUrl);

    if (setup.needsSetup) {
        throw new ServerHealthResponseError('samo Server setup is not finished.', 503);
    }

    const response = await fetcher(`${baseUrl}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${getSamoBearerToken(authentication)}` },
        method: 'GET',
    });

    assertOkResponse(response, 'samo Server user check');

    const capabilities = getSamoCapabilities();

    return {
        ...authentication,
        capabilities,
        details: `samo Server: ${formatServerCapabilities(capabilities)}`,
        url: baseUrl,
    };
};

const checkServerHealth = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
) => {
    return checkSamoHealth(authentication, fetcher);
};

export const checkServerConnectionHealth = async ({
    authentication,
    fetch,
    now = Date.now,
}: ServerConnectionHealthInput): Promise<ServerConnectionHealthResult> => {
    const checkedAt = now();
    const request = getFetch(fetch);

    try {
        const refreshedAuthentication = await checkServerHealth(authentication, request);

        if (!refreshedAuthentication) {
            return {
                authentication,
                checkedAt,
                message: `Session health checks are not implemented for ${authentication.type}.`,
                ok: false,
                status: ServerConnectionHealthStatus.UNSUPPORTED,
            };
        }

        return {
            authentication: refreshedAuthentication,
            checkedAt,
            message: refreshedAuthentication.details,
            ok: true,
            status: ServerConnectionHealthStatus.HEALTHY,
        };
    } catch (error) {
        return {
            authentication,
            checkedAt,
            message: getErrorMessage(error),
            ok: false,
            status: getNetworkFailureStatus(error),
        };
    }
};
