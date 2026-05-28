import { memo, useMemo } from 'react';
import z from 'zod';

import {
    buildSamoAuthenticatedImageRequest,
    isSamoApiMediaUrl,
    normalizeBaseUrl,
    ServerType,
} from '@samo/core/server';
import { api } from '/@/renderer/api';
import {
    GeneralSettingsSchema,
    getActiveMusicServer,
    getServerById,
    useAuthStore,
    useCurrentServerId,
    useGeneralSettings,
    useImageRes,
    useSettingsStore,
} from '/@/renderer/store';
import { BaseImage, ImageProps } from '/@/shared/components/image/image';
import { ExplicitStatus, ImageRequest, LibraryItem } from '/@/shared/types/domain-types';

const getUnloaderIcon = (itemType: LibraryItem) => {
    switch (itemType) {
        case LibraryItem.ALBUM:
            return 'emptyAlbumImage';
        case LibraryItem.ALBUM_ARTIST:
            return 'emptyArtistImage';
        case LibraryItem.ARTIST:
            return 'emptyArtistImage';
        case LibraryItem.GENRE:
            return 'emptyGenreImage';
        case LibraryItem.PLAYLIST:
            return 'emptyPlaylistImage';
        case LibraryItem.SONG:
            return 'emptySongImage';
        default:
            return 'emptyImage';
    }
};

const BaseItemImage = (
    props: Omit<ImageProps, 'id' | 'src'> & {
        explicitStatus?: ExplicitStatus | null;
        id?: null | string;
        itemType: LibraryItem;
        serverId?: null | string;
        src?: null | string;
        type?: keyof z.infer<typeof GeneralSettingsSchema>['imageRes'];
    },
) => {
    const { explicitStatus, serverId, src, ...rest } = props;
    const { blurExplicitImages } = useGeneralSettings();

    const imageUrl = useItemImageUrl({
        id: props.id,
        imageUrl: src,
        itemType: props.itemType,
        serverId: serverId || undefined,
        type: props.type,
    });

    const imageRequest = useItemImageRequest({
        id: props.id,
        imageUrl: src,
        itemType: props.itemType,
        serverId: serverId || undefined,
        type: props.type,
    });

    const isExplicit = blurExplicitImages && explicitStatus === ExplicitStatus.EXPLICIT;

    return (
        <BaseImage
            imageRequest={imageRequest}
            isExplicit={isExplicit}
            src={imageUrl}
            unloaderIcon={getUnloaderIcon(props.itemType)}
            {...rest}
            id={props.id || undefined}
        />
    );
};

export const ItemImage = memo(BaseItemImage);

interface UseItemImageUrlProps {
    id?: null | string;
    imageUrl?: null | string;
    itemType: LibraryItem;
    serverId?: string;
    size?: number;
    type?: keyof z.infer<typeof GeneralSettingsSchema>['imageRes'];
    useRemoteUrl?: boolean;
}

const hasConfiguredServerUrl = (server: ReturnType<typeof getServerById>) =>
    Boolean(server?.url && normalizeBaseUrl(server.url));

const resolveItemImageRequest = (
    args: UseItemImageUrlProps & { serverId: string; sizeByType?: number },
): ImageRequest | undefined => {
    const { id, imageUrl, itemType, serverId, size, sizeByType, useRemoteUrl } = args;

    if (imageUrl && !isSamoApiMediaUrl(imageUrl)) {
        return {
            cacheKey: imageUrl,
            url: imageUrl,
        };
    }

    if (imageUrl && isSamoApiMediaUrl(imageUrl)) {
        const server = getServerById(serverId);
        if (server?.type === ServerType.SAMO && hasConfiguredServerUrl(server)) {
            return buildSamoAuthenticatedImageRequest(
                {
                    credential: server.credential,
                    ndCredential: server.ndCredential,
                    type: ServerType.SAMO,
                    url: server.url,
                },
                imageUrl,
                ['samo', server.id, 'url', imageUrl].join(':'),
            );
        }
    }

    if (id) {
        const server = getServerById(serverId);
        if (!hasConfiguredServerUrl(server)) {
            return undefined;
        }

        let baseUrl: string | undefined;

        if (useRemoteUrl) {
            baseUrl = server?.remoteUrl || server?.url;
        }

        const request =
            api.controller.getImageRequest({
                apiClientProps: { serverId },
                baseUrl,
                query: { id, itemType, size: size ?? sizeByType },
            }) ?? undefined;

        if (request) {
            return request;
        }
    }

    return undefined;
};

export const useItemImageUrl = (args: UseItemImageUrlProps) => {
    const { id, imageUrl, itemType, size, type, useRemoteUrl } = args;
    const serverId = useCurrentServerId();

    const imageRes = useImageRes();
    const sizeByType: number | undefined = type ? imageRes[type] : undefined;

    return useMemo(() => {
        const targetServerId = args.serverId || serverId;
        if (!targetServerId) {
            return undefined;
        }

        return resolveItemImageRequest({
            ...args,
            serverId: targetServerId,
            sizeByType,
        })?.url;
    }, [args.serverId, id, imageUrl, itemType, serverId, size, sizeByType, type, useRemoteUrl]);
};

export const useItemImageRequest = (args: UseItemImageUrlProps) => {
    const { id, imageUrl, itemType, size, type, useRemoteUrl } = args;
    const serverId = useCurrentServerId();

    const imageRes = useImageRes();
    const sizeByType: number | undefined = type ? imageRes[type] : undefined;

    return useMemo(() => {
        const targetServerId = args.serverId || serverId;
        if (!targetServerId) {
            return undefined;
        }

        return resolveItemImageRequest({
            ...args,
            serverId: targetServerId,
            sizeByType,
        });
    }, [args, id, imageUrl, itemType, serverId, size, sizeByType, type, useRemoteUrl]);
};

export function getItemImageRequest(args: UseItemImageUrlProps) {
    const authStore = useAuthStore.getState();
    const currentServerId = getActiveMusicServer(authStore)?.id;
    const serverId = (args.serverId || currentServerId) as string;

    const imageRes = useSettingsStore.getState().general.imageRes;
    const sizeByType: number | undefined = args.type ? imageRes[args.type] : undefined;

    if (!serverId) {
        return undefined;
    }

    return resolveItemImageRequest({
        ...args,
        serverId,
        sizeByType,
    });
}

export function getItemImageUrl(args: UseItemImageUrlProps) {
    return getItemImageRequest(args)?.url;
}
