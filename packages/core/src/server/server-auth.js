import { formatServerCapabilities, getAudiobookshelfCapabilitiesFromLibraries, getDefaultServerCapabilities, } from './server-capabilities';
import { getFetch, normalizeBaseUrl } from './server-http';
import { getSubsonicUser } from './server-subsonic';
import { ServerType } from './server-types';
export var ServerAuthenticationKind;
(function (ServerAuthenticationKind) {
    ServerAuthenticationKind["AUDIOBOOKSHELF_TOKEN"] = "audiobookshelf-token";
    ServerAuthenticationKind["NAVIDROME_TOKEN"] = "navidrome-token";
    ServerAuthenticationKind["SUBSONIC_LEGACY_PASSWORD"] = "subsonic-legacy-password";
})(ServerAuthenticationKind || (ServerAuthenticationKind = {}));
export const getServerAuthenticationErrorMessage = (error) => {
    return error instanceof Error ? error.message : 'Connection failed';
};
const authenticateAudiobookshelf = async ({ fetch: fetcher, password, url, username, }) => {
    const baseUrl = normalizeBaseUrl(url);
    const request = getFetch(fetcher);
    const loginResponse = await request(`${baseUrl}/login`, {
        body: JSON.stringify({ password, username }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    if (!loginResponse.ok) {
        throw new Error(`Audiobookshelf login failed (${loginResponse.status})`);
    }
    const loginBody = (await loginResponse.json());
    const user = loginBody.user;
    if (!user?.token) {
        throw new Error('Audiobookshelf did not return an auth token');
    }
    const librariesResponse = await request(`${baseUrl}/api/libraries`, {
        headers: { Authorization: `Bearer ${user.token}` },
        method: 'GET',
    });
    if (!librariesResponse.ok) {
        throw new Error(`Audiobookshelf library check failed (${librariesResponse.status})`);
    }
    const librariesBody = (await librariesResponse.json());
    const capabilities = getAudiobookshelfCapabilitiesFromLibraries(librariesBody.libraries ?? []);
    return {
        capabilities,
        credential: user.token,
        details: `Audiobookshelf libraries: ${formatServerCapabilities(capabilities)}`,
        isAdmin: user.type === 'admin',
        kind: ServerAuthenticationKind.AUDIOBOOKSHELF_TOKEN,
        title: `Audiobookshelf: ${user.username ?? username}`,
        type: ServerType.AUDIOBOOKSHELF,
        url: baseUrl,
        userId: user.id,
        username: user.username ?? username,
    };
};
const authenticateNavidrome = async ({ fetch: fetcher, password, url, username, }) => {
    const baseUrl = normalizeBaseUrl(url);
    const response = await getFetch(fetcher)(`${baseUrl}/auth/login`, {
        body: JSON.stringify({ password, username }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error(`Navidrome login failed (${response.status})`);
    }
    const body = (await response.json());
    const data = body.data ?? body;
    if (!data?.token) {
        throw new Error('Navidrome did not return an auth token');
    }
    if (!data.subsonicSalt || !data.subsonicToken) {
        throw new Error('Navidrome did not return Subsonic-compatible credentials');
    }
    const resolvedUsername = data.username ?? username;
    const credential = `u=${encodeURIComponent(resolvedUsername)}&s=${encodeURIComponent(data.subsonicSalt)}&t=${encodeURIComponent(data.subsonicToken)}`;
    const subsonic = await getSubsonicUser(getFetch(fetcher), baseUrl, credential, resolvedUsername);
    const capabilities = getDefaultServerCapabilities(ServerType.NAVIDROME);
    return {
        capabilities,
        credential,
        details: `Navidrome Subsonic API ${subsonic.version ?? 'unknown version'}: ${formatServerCapabilities(capabilities)}`,
        isAdmin: Boolean(data.isAdmin),
        kind: ServerAuthenticationKind.NAVIDROME_TOKEN,
        ndCredential: data.token,
        serverVersion: subsonic.version,
        title: `Navidrome: ${resolvedUsername}`,
        type: ServerType.NAVIDROME,
        url: baseUrl,
        userId: data.id,
        username: resolvedUsername,
    };
};
const authenticateSubsonicLegacy = async ({ fetch: fetcher, password, url, username, }) => {
    const baseUrl = normalizeBaseUrl(url);
    const credential = `u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}`;
    const subsonic = await getSubsonicUser(getFetch(fetcher), baseUrl, credential, username);
    const capabilities = getDefaultServerCapabilities(ServerType.SUBSONIC);
    return {
        capabilities,
        credential,
        details: `Subsonic API ${subsonic.version ?? 'unknown version'}: ${formatServerCapabilities(capabilities)}`,
        isAdmin: Boolean(subsonic.user?.adminRole),
        kind: ServerAuthenticationKind.SUBSONIC_LEGACY_PASSWORD,
        serverVersion: subsonic.version,
        title: `Subsonic: ${subsonic.user?.username ?? username}`,
        type: ServerType.SUBSONIC,
        url: baseUrl,
        userId: subsonic.user?.username ?? username,
        username: subsonic.user?.username ?? username,
    };
};
export const authenticateServerConnection = async (input) => {
    if (input.type === ServerType.AUDIOBOOKSHELF) {
        return authenticateAudiobookshelf(input);
    }
    if (input.type === ServerType.NAVIDROME) {
        return authenticateNavidrome(input);
    }
    if (input.type === ServerType.SUBSONIC) {
        return authenticateSubsonicLegacy(input);
    }
    throw new Error('Jellyfin auth is not wired in this Android milestone');
};
