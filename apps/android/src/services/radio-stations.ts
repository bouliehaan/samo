import { type ServerAuthenticationResult, ServerType } from '@samo/core/server';

interface SubsonicError {
    message?: string;
}

interface SubsonicRadioStation {
    id?: string;
    name?: string;
    streamUrl?: string;
}

interface SubsonicRadioBody {
    'subsonic-response'?: {
        error?: SubsonicError;
        internetRadioStations?: {
            internetRadioStation?: SubsonicRadioStation[];
        };
        status?: string;
    };
}

export interface AddAndroidRadioStationInput {
    authentication: ServerAuthenticationResult;
    homepageUrl?: string;
    name: string;
    streamUrl: string;
    thumbnailFile?: {
        blob: Blob;
        name?: string;
    };
    thumbnailUrl?: string;
}

export interface AddAndroidRadioStationResult {
    imageUploaded: boolean;
    stationId?: string;
    warning?: string;
}

const subsonicUrl = (
    authentication: ServerAuthenticationResult,
    path: string,
    query: Record<string, string | undefined> = {},
) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });

    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value.trim().length > 0) {
            params.set(key, value.trim());
        }
    }

    return `${authentication.url}/rest/${path}?${params.toString()}&${authentication.credential}`;
};

const assertSubsonicOk = (
    response: undefined | { error?: SubsonicError; status?: string },
    fallback: string,
) => {
    if (response?.status === 'ok') {
        return;
    }

    throw new Error(response?.error?.message ?? fallback);
};

const loadRadioStations = async (
    authentication: ServerAuthenticationResult,
): Promise<SubsonicRadioStation[]> => {
    const response = await fetch(subsonicUrl(authentication, 'getInternetRadioStations.view'));

    if (!response.ok) {
        throw new Error(`Failed to reload radio stations (${response.status})`);
    }

    const body = (await response.json()) as SubsonicRadioBody;
    const subsonic = body['subsonic-response'];
    assertSubsonicOk(subsonic, 'Failed to reload radio stations');
    return subsonic?.internetRadioStations?.internetRadioStation ?? [];
};

const findCreatedStation = (
    stations: SubsonicRadioStation[],
    input: Pick<AddAndroidRadioStationInput, 'name' | 'streamUrl'>,
): SubsonicRadioStation | undefined => {
    const targetName = input.name.trim();
    const targetStreamUrl = input.streamUrl.trim();

    return [...stations]
        .reverse()
        .find(
            (station) =>
                station.name?.trim() === targetName &&
                station.streamUrl?.trim() === targetStreamUrl,
        );
};

const uploadNavidromeRadioThumbnail = async (
    authentication: ServerAuthenticationResult,
    stationId: string,
    thumbnail: {
        blob?: Blob;
        name?: string;
        url?: string;
    },
): Promise<void> => {
    if (!authentication.ndCredential) {
        throw new Error('Navidrome image upload requires a Navidrome token.');
    }

    let imageBlob = thumbnail.blob;
    const filename = thumbnail.name?.trim() || 'radio-image';
    const thumbnailUrl = thumbnail.url?.trim();

    if (!imageBlob) {
        if (!thumbnailUrl) {
            throw new Error('No thumbnail image was provided.');
        }

        const imageResponse = await fetch(thumbnailUrl);
        if (!imageResponse.ok) {
            throw new Error(`Thumbnail download failed (${imageResponse.status})`);
        }

        imageBlob = await imageResponse.blob();
    }

    const form = new FormData();
    form.append('image', imageBlob, filename);

    const uploadResponse = await fetch(
        `${authentication.url}/api/radio/${encodeURIComponent(stationId)}/image`,
        {
            body: form,
            headers: {
                'x-nd-authorization': `Bearer ${authentication.ndCredential}`,
            },
            method: 'POST',
        },
    );

    if (!uploadResponse.ok) {
        throw new Error(`Thumbnail upload failed (${uploadResponse.status})`);
    }
};

export const addAndroidRadioStation = async ({
    authentication,
    homepageUrl,
    name,
    streamUrl,
    thumbnailFile,
    thumbnailUrl,
}: AddAndroidRadioStationInput): Promise<AddAndroidRadioStationResult> => {
    if (authentication.type !== ServerType.NAVIDROME) {
        throw new Error('Adding radio stations from Android is currently wired for Navidrome.');
    }

    const response = await fetch(
        subsonicUrl(authentication, 'createInternetRadioStation.view', {
            homepageUrl,
            name,
            streamUrl,
        }),
    );

    if (!response.ok) {
        throw new Error(`Failed to add radio station (${response.status})`);
    }

    const body = (await response.json()) as SubsonicRadioBody;
    assertSubsonicOk(body['subsonic-response'], 'Failed to add radio station');

    if (!thumbnailFile && !thumbnailUrl?.trim()) {
        return { imageUploaded: false };
    }

    try {
        const stations = await loadRadioStations(authentication);
        const createdStation = findCreatedStation(stations, { name, streamUrl });

        if (!createdStation?.id) {
            return {
                imageUploaded: false,
                warning: 'Station was added, but Samo could not find it again to upload the thumbnail.',
            };
        }

        await uploadNavidromeRadioThumbnail(
            authentication,
            createdStation.id,
            thumbnailFile ?? { url: thumbnailUrl?.trim() },
        );

        return {
            imageUploaded: true,
            stationId: createdStation.id,
        };
    } catch (error) {
        return {
            imageUploaded: false,
            warning:
                error instanceof Error
                    ? `Station was added, but thumbnail sync failed: ${error.message}`
                    : 'Station was added, but thumbnail sync failed.',
        };
    }
};
