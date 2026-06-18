import {
    createSamoInternetRadioStation,
    uploadSamoInternetRadioCover,
    type ServerAuthenticationResult,
} from '@samo/core/server';

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

const addSamoRadioStation = async ({
    authentication,
    homepageUrl,
    name,
    streamUrl,
    thumbnailFile,
    thumbnailUrl,
}: AddAndroidRadioStationInput): Promise<AddAndroidRadioStationResult> => {
    const station = await createSamoInternetRadioStation(fetch, authentication, {
        homepageUrl,
        imageUrl: thumbnailUrl?.trim() || undefined,
        name: name.trim(),
        streamUrl: streamUrl.trim(),
    });

    if (!thumbnailFile) {
        return { imageUploaded: Boolean(thumbnailUrl?.trim()), stationId: station.id };
    }

    if (!station.id) {
        return {
            imageUploaded: false,
            warning: 'Station was added, but Samo did not return an id for thumbnail upload.',
        };
    }

    try {
        await uploadSamoInternetRadioCover(
            fetch,
            authentication,
            station.id,
            thumbnailFile.blob,
            thumbnailFile.name,
        );
        return { imageUploaded: true, stationId: station.id };
    } catch (error) {
        return {
            imageUploaded: false,
            stationId: station.id,
            warning:
                error instanceof Error
                    ? `Station was added, but thumbnail sync failed: ${error.message}`
                    : 'Station was added, but thumbnail sync failed.',
        };
    }
};

export const addAndroidRadioStation = async (
    input: AddAndroidRadioStationInput,
): Promise<AddAndroidRadioStationResult> => {
    return addSamoRadioStation(input);
};

export const canAddAndroidRadioStation = (authentication: ServerAuthenticationResult) =>
    Boolean(authentication);
