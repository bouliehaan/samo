import { formatServerCapabilities, getAudiobookshelfCapabilitiesFromLibraries, getDefaultServerCapabilities, } from './server-capabilities';
import { getFetch, normalizeBaseUrl } from './server-http';
import { getSubsonicUser } from './server-subsonic';
import { ServerType } from './server-types';
export var ServerConnectionHealthStatus;
(function (ServerConnectionHealthStatus) {
    ServerConnectionHealthStatus["ERROR"] = "error";
    ServerConnectionHealthStatus["HEALTHY"] = "healthy";
    ServerConnectionHealthStatus["UNAUTHORIZED"] = "unauthorized";
    ServerConnectionHealthStatus["UNREACHABLE"] = "unreachable";
    ServerConnectionHealthStatus["UNSUPPORTED"] = "unsupported";
})(ServerConnectionHealthStatus || (ServerConnectionHealthStatus = {}));
class ServerHealthResponseError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
const getResponseFailureStatus = (statusCode) => {
    if (statusCode === 401 || statusCode === 403) {
        return ServerConnectionHealthStatus.UNAUTHORIZED;
    }
    return ServerConnectionHealthStatus.ERROR;
};
const getNetworkFailureStatus = (error) => {
    if (error instanceof ServerHealthResponseError) {
        return getResponseFailureStatus(error.statusCode);
    }
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('network') ||
        message.includes('failed to fetch') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('offline')) {
        return ServerConnectionHealthStatus.UNREACHABLE;
    }
    return ServerConnectionHealthStatus.ERROR;
};
const getErrorMessage = (error) => {
    if (error instanceof ServerHealthResponseError) {
        return error.message;
    }
    return error instanceof Error ? error.message : 'Server health check failed';
};
const assertOkResponse = (response, label) => {
    if (!response.ok) {
        throw new ServerHealthResponseError(`${label} failed (${response.status})`, response.status);
    }
};
const checkAudiobookshelfHealth = async (authentication, fetcher) => {
    const baseUrl = normalizeBaseUrl(authentication.url);
    const response = await fetcher(`${baseUrl}/api/libraries`, {
        headers: { Authorization: `Bearer ${authentication.credential}` },
        method: 'GET',
    });
    assertOkResponse(response, 'Audiobookshelf library check');
    const body = (await response.json());
    const capabilities = getAudiobookshelfCapabilitiesFromLibraries(body.libraries ?? []);
    return {
        ...authentication,
        capabilities,
        details: `Audiobookshelf libraries: ${formatServerCapabilities(capabilities)}`,
        url: baseUrl,
    };
};
const checkSubsonicCompatibleHealth = async (authentication, fetcher) => {
    const baseUrl = normalizeBaseUrl(authentication.url);
    const subsonic = await getSubsonicUser(fetcher, baseUrl, authentication.credential, authentication.username);
    const capabilities = getDefaultServerCapabilities(authentication.type);
    const label = authentication.type === ServerType.NAVIDROME ? 'Navidrome Subsonic API' : 'Subsonic API';
    return {
        ...authentication,
        capabilities,
        details: `${label} ${subsonic.version ?? 'unknown version'}: ${formatServerCapabilities(capabilities)}`,
        isAdmin: typeof subsonic.user?.adminRole === 'boolean'
            ? subsonic.user.adminRole
            : authentication.isAdmin,
        serverVersion: subsonic.version,
        url: baseUrl,
    };
};
const checkServerHealth = async (authentication, fetcher) => {
    if (authentication.type === ServerType.AUDIOBOOKSHELF) {
        return checkAudiobookshelfHealth(authentication, fetcher);
    }
    if (authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC) {
        return checkSubsonicCompatibleHealth(authentication, fetcher);
    }
    return null;
};
export const checkServerConnectionHealth = async ({ authentication, fetch, now = Date.now, }) => {
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
    }
    catch (error) {
        return {
            authentication,
            checkedAt,
            message: getErrorMessage(error),
            ok: false,
            status: getNetworkFailureStatus(error),
        };
    }
};
