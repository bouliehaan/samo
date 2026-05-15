import { type SamoFetch } from './server-http';

export interface SubsonicGetUserBody {
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

export const getSubsonicUser = async (
    fetcher: SamoFetch,
    baseUrl: string,
    credential: string,
    username: string,
) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        username,
        v: '1.13.0',
    });
    const response = await fetcher(
        `${baseUrl}/rest/getUser.view?${params.toString()}&${credential}`,
    );

    if (!response.ok) {
        throw new Error(`Subsonic user check failed (${response.status})`);
    }

    const body = (await response.json()) as SubsonicGetUserBody;
    const subsonic = body['subsonic-response'];

    if (subsonic?.status !== 'ok') {
        throw new Error(subsonic?.error?.message ?? 'Subsonic user check did not return ok');
    }

    return subsonic;
};
