import { getFetch, normalizeBaseUrl, type SamoFetch } from './server-http';
import { ServerType } from './server-types';

export enum ServerAuthenticationKind {
    AUDIOBOOKSHELF_TOKEN = 'audiobookshelf-token',
    NAVIDROME_TOKEN = 'navidrome-token',
    SUBSONIC_LEGACY_PASSWORD = 'subsonic-legacy-password',
}

export interface ServerAuthenticationInput {
    fetch?: SamoFetch;
    password: string;
    type: ServerType;
    url: string;
    username: string;
}

export interface ServerAuthenticationResult {
    credential: string;
    details: string;
    isAdmin?: boolean;
    kind: ServerAuthenticationKind;
    ndCredential?: string;
    serverVersion?: string;
    title: string;
    type: ServerType;
    url: string;
    userId?: string;
    username: string;
}

interface AudiobookshelfLoginBody {
    user?: {
        id?: string;
        token?: string;
        type?: string;
        username?: string;
    };
}

interface NavidromeLoginBody {
    data?: NavidromeLoginData;
    id?: string;
    isAdmin?: boolean;
    name?: string;
    subsonicSalt?: string;
    subsonicToken?: string;
    token?: string;
    username?: string;
}

interface NavidromeLoginData {
    id?: string;
    isAdmin?: boolean;
    name?: string;
    subsonicSalt?: string;
    subsonicToken?: string;
    token?: string;
    username?: string;
}

interface SubsonicGetUserBody {
    'subsonic-response'?: {
        error?: {
            message?: string;
        };
        status?: string;
        user?: {
            adminRole?: boolean;
            username?: string;
        };
        version?: string;
    };
}

export const getServerAuthenticationErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Connection failed';
};

const authenticateAudiobookshelf = async ({
    fetch: fetcher,
    password,
    url,
    username,
}: ServerAuthenticationInput): Promise<ServerAuthenticationResult> => {
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

    const loginBody = (await loginResponse.json()) as AudiobookshelfLoginBody;
    const user = loginBody.user;

    if (!user?.token) {
        throw new Error('Audiobookshelf did not return an auth token');
    }

    const librariesResponse = await request(`${baseUrl}/api/libraries`, {
        headers: { Authorization: `Bearer ${user.token}` },
        method: 'GET',
    });

    return {
        credential: user.token,
        details: librariesResponse.ok
            ? `Libraries endpoint responded ${librariesResponse.status}`
            : 'Login succeeded',
        isAdmin: user.type === 'admin',
        kind: ServerAuthenticationKind.AUDIOBOOKSHELF_TOKEN,
        title: `Audiobookshelf: ${user.username ?? username}`,
        type: ServerType.AUDIOBOOKSHELF,
        url: baseUrl,
        userId: user.id,
        username: user.username ?? username,
    };
};

const authenticateNavidrome = async ({
    fetch: fetcher,
    password,
    url,
    username,
}: ServerAuthenticationInput): Promise<ServerAuthenticationResult> => {
    const baseUrl = normalizeBaseUrl(url);
    const response = await getFetch(fetcher)(`${baseUrl}/auth/login`, {
        body: JSON.stringify({ password, username }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`Navidrome login failed (${response.status})`);
    }

    const body = (await response.json()) as NavidromeLoginBody;
    const data = body.data ?? body;

    if (!data?.token) {
        throw new Error('Navidrome did not return an auth token');
    }

    if (!data.subsonicSalt || !data.subsonicToken) {
        throw new Error('Navidrome did not return Subsonic-compatible credentials');
    }

    return {
        credential: `u=${encodeURIComponent(data.username ?? username)}&s=${encodeURIComponent(data.subsonicSalt)}&t=${encodeURIComponent(data.subsonicToken)}`,
        details: 'Navidrome auth endpoint accepted the credentials',
        isAdmin: Boolean(data.isAdmin),
        kind: ServerAuthenticationKind.NAVIDROME_TOKEN,
        ndCredential: data.token,
        title: `Navidrome: ${data.username ?? username}`,
        type: ServerType.NAVIDROME,
        url: baseUrl,
        userId: data.id,
        username: data.username ?? username,
    };
};

const authenticateSubsonicLegacy = async ({
    fetch: fetcher,
    password,
    url,
    username,
}: ServerAuthenticationInput): Promise<ServerAuthenticationResult> => {
    const baseUrl = normalizeBaseUrl(url);
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        p: password,
        u: username,
        username,
        v: '1.13.0',
    });
    const response = await getFetch(fetcher)(`${baseUrl}/rest/getUser.view?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`Subsonic user check failed (${response.status})`);
    }

    const body = (await response.json()) as SubsonicGetUserBody;
    const subsonic = body['subsonic-response'];

    if (subsonic?.status !== 'ok') {
        throw new Error(subsonic?.error?.message ?? 'Subsonic user check did not return ok');
    }

    return {
        credential: `u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}`,
        details: `Subsonic API ${subsonic.version ?? 'unknown version'}`,
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

export const authenticateServerConnection = async (
    input: ServerAuthenticationInput,
): Promise<ServerAuthenticationResult> => {
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
