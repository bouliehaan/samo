import { type ServerAuthenticationResult } from './server-auth';
import {
    formatServerCapabilities,
    getAudiobookshelfCapabilitiesFromLibraries,
    getDefaultServerCapabilities,
} from './server-capabilities';
import { getFetch, normalizeBaseUrl, type SamoFetch } from './server-http';
import { getSubsonicUser } from './server-subsonic';
import { ServerType } from './server-types';

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

interface AudiobookshelfLibrariesBody {
    libraries?: Array<{
        mediaType?: string;
    }>;
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

const checkAudiobookshelfHealth = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
) => {
    const baseUrl = normalizeBaseUrl(authentication.url);
    const response = await fetcher(`${baseUrl}/api/libraries`, {
        headers: { Authorization: `Bearer ${authentication.credential}` },
        method: 'GET',
    });

    assertOkResponse(response, 'Audiobookshelf library check');

    const body = (await response.json()) as AudiobookshelfLibrariesBody;
    const capabilities = getAudiobookshelfCapabilitiesFromLibraries(body.libraries ?? []);

    return {
        ...authentication,
        capabilities,
        details: `Audiobookshelf libraries: ${formatServerCapabilities(capabilities)}`,
        url: baseUrl,
    };
};

const checkSubsonicCompatibleHealth = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
) => {
    const baseUrl = normalizeBaseUrl(authentication.url);
    const subsonic = await getSubsonicUser(
        fetcher,
        baseUrl,
        authentication.credential,
        authentication.username,
    );
    const capabilities = getDefaultServerCapabilities(authentication.type);
    const label =
        authentication.type === ServerType.NAVIDROME ? 'Navidrome Subsonic API' : 'Subsonic API';

    return {
        ...authentication,
        capabilities,
        details: `${label} ${subsonic.version ?? 'unknown version'}: ${formatServerCapabilities(capabilities)}`,
        isAdmin:
            typeof subsonic.user?.adminRole === 'boolean'
                ? subsonic.user.adminRole
                : authentication.isAdmin,
        serverVersion: subsonic.version,
        url: baseUrl,
    };
};

const checkServerHealth = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
) => {
    if (authentication.type === ServerType.AUDIOBOOKSHELF) {
        return checkAudiobookshelfHealth(authentication, fetcher);
    }

    if (
        authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC
    ) {
        return checkSubsonicCompatibleHealth(authentication, fetcher);
    }

    return null;
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
