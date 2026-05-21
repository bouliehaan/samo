import { jsx as _jsx } from "react/jsx-runtime";
import { memo, useMemo } from 'react';
import { api } from '/@/renderer/api';
import { getActiveMusicServer, getServerById, useAuthStore, useCurrentServerId, useGeneralSettings, useImageRes, useSettingsStore, } from '/@/renderer/store';
import { BaseImage } from '/@/shared/components/image/image';
import { ExplicitStatus, LibraryItem } from '/@/shared/types/domain-types';
const getUnloaderIcon = (itemType) => {
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
const BaseItemImage = (props) => {
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
    return (_jsx(BaseImage, { imageRequest: imageRequest, isExplicit: isExplicit, src: imageUrl, unloaderIcon: getUnloaderIcon(props.itemType), ...rest, id: props.id || undefined }));
};
export const ItemImage = memo(BaseItemImage);
export const useItemImageUrl = (args) => {
    const { id, imageUrl, itemType, size, type, useRemoteUrl } = args;
    const serverId = useCurrentServerId();
    const imageRes = useImageRes();
    const sizeByType = type ? imageRes[type] : undefined;
    return useMemo(() => {
        if (imageUrl) {
            return imageUrl;
        }
        if (!id) {
            return undefined;
        }
        const targetServerId = args.serverId || serverId;
        let baseUrl;
        if (useRemoteUrl) {
            const server = getServerById(targetServerId);
            baseUrl = server?.remoteUrl || server?.url;
        }
        return (api.controller.getImageUrl({
            apiClientProps: { serverId: targetServerId },
            baseUrl,
            query: { id, itemType, size: size ?? sizeByType },
        }) || undefined);
    }, [args.serverId, id, imageUrl, itemType, serverId, size, sizeByType, useRemoteUrl]);
};
export const useItemImageRequest = (args) => {
    const { id, imageUrl, itemType, size, type, useRemoteUrl } = args;
    const serverId = useCurrentServerId();
    const imageRes = useImageRes();
    const sizeByType = type ? imageRes[type] : undefined;
    return useMemo(() => {
        if (imageUrl) {
            return {
                cacheKey: imageUrl,
                url: imageUrl,
            };
        }
        if (!id) {
            return undefined;
        }
        const targetServerId = args.serverId || serverId;
        let baseUrl;
        if (useRemoteUrl) {
            const server = getServerById(targetServerId);
            baseUrl = server?.remoteUrl || server?.url;
        }
        return (api.controller.getImageRequest({
            apiClientProps: { serverId: targetServerId },
            baseUrl,
            query: { id, itemType, size: size ?? sizeByType },
        }) || undefined);
    }, [args.serverId, id, imageUrl, itemType, serverId, size, sizeByType, useRemoteUrl]);
};
export function getItemImageRequest(args) {
    const { id, imageUrl, itemType, size, type, useRemoteUrl } = args;
    const authStore = useAuthStore.getState();
    const currentServerId = getActiveMusicServer(authStore)?.id;
    const serverId = (args.serverId || currentServerId);
    const imageRes = useSettingsStore.getState().general.imageRes;
    const sizeByType = type ? imageRes[type] : undefined;
    if (imageUrl) {
        return {
            cacheKey: imageUrl,
            url: imageUrl,
        };
    }
    if (!id) {
        return undefined;
    }
    let baseUrl;
    if (useRemoteUrl) {
        const server = getServerById(serverId);
        baseUrl = server?.remoteUrl || server?.url;
    }
    return (api.controller.getImageRequest({
        apiClientProps: { serverId },
        baseUrl,
        query: { id, itemType, size: size ?? sizeByType },
    }) || undefined);
}
export function getItemImageUrl(args) {
    const { id, imageUrl, itemType, size, type, useRemoteUrl } = args;
    const authStore = useAuthStore.getState();
    const currentServerId = getActiveMusicServer(authStore)?.id;
    const serverId = (args.serverId || currentServerId);
    const imageRes = useSettingsStore.getState().general.imageRes;
    const sizeByType = type ? imageRes[type] : undefined;
    if (imageUrl) {
        return imageUrl;
    }
    if (!id) {
        return undefined;
    }
    let baseUrl;
    if (useRemoteUrl) {
        const server = getServerById(serverId);
        baseUrl = server?.remoteUrl || server?.url;
    }
    return (api.controller.getImageUrl({
        apiClientProps: { serverId },
        baseUrl,
        query: { id, itemType, size: size ?? sizeByType },
    }) || undefined);
}
