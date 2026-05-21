import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSuspenseQuery } from '@tanstack/react-query';
import { forwardRef, Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import styles from './album-artist-detail-header.module.css';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { getArtistAlbumsGrouped } from '/@/renderer/features/artists/hooks/use-artist-albums-grouped';
import { useDeleteArtistImage } from '/@/renderer/features/artists/mutations/delete-artist-image-mutation';
import { useUploadArtistImage } from '/@/renderer/features/artists/mutations/upload-artist-image-mutation';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { LibraryHeader, LibraryHeaderMenu, } from '/@/renderer/features/shared/components/library-header';
import { useSetFavorite } from '/@/renderer/features/shared/hooks/use-set-favorite';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentArtist, useAppStore, useCurrentServer } from '/@/renderer/store';
import { useArtistReleaseTypeItems, usePlayButtonBehavior } from '/@/renderer/store/settings.store';
import { formatDurationString } from '/@/renderer/utils';
import { hasFeature, SEPARATOR_STRING, sortAlbumList } from '/@/shared/api/utils';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { FileButton } from '/@/shared/components/file-button/file-button';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem, } from '/@/shared/types/domain-types';
import { ServerFeature } from '/@/shared/types/features-types';
import { Play } from '/@/shared/types/types';
function ArtistImageUploadOverlay({ data, onUploadFile, }) {
    const deleteArtistImageMutation = useDeleteArtistImage({});
    const server = useCurrentServer();
    if (!data)
        return null;
    if (!hasFeature(server, ServerFeature.ARTIST_IMAGE_UPLOAD))
        return null;
    return (_jsxs(Group, { gap: "xs", children: [_jsx(FileButton, { accept: "image/*", onChange: async (file) => {
                    if (!file)
                        return;
                    await onUploadFile(file);
                }, children: (props) => (_jsx(ActionIcon, { icon: "uploadImage", iconProps: { size: 'lg' }, radius: "xl", size: "xs", variant: "default", ...props })) }), _jsx(ActionIcon, { disabled: !data?.uploadedImage, icon: "delete", iconProps: { size: 'lg' }, onClick: (e) => {
                    e.stopPropagation();
                    if (!data?._serverId)
                        return;
                    deleteArtistImageMutation.mutate({
                        apiClientProps: {
                            serverId: data._serverId,
                        },
                        query: { id: data.id },
                    });
                }, radius: "xl", size: "xs", variant: "default" })] }));
}
export const AlbumArtistDetailHeader = forwardRef(({ albumsQuery }, ref) => {
    const { albumArtistId, artistId } = useParams();
    const routeId = (artistId || albumArtistId);
    const server = useCurrentServer();
    const { t } = useTranslation();
    const detailQuery = useSuspenseQuery(artistsQueries.albumArtistDetail({
        query: { id: routeId },
        serverId: server?.id,
    }));
    const albumCount = detailQuery.data?.albumCount;
    const songCount = detailQuery.data?.songCount;
    const duration = detailQuery.data?.duration;
    const durationEnabled = duration !== null && duration !== undefined;
    const metadataItems = [
        {
            enabled: albumCount !== null && albumCount !== undefined,
            id: 'albumCount',
            secondary: false,
            value: t('entity.albumWithCount', { count: albumCount || 0 }),
        },
        {
            enabled: songCount !== null && songCount !== undefined,
            id: 'songCount',
            secondary: false,
            value: t('entity.trackWithCount', { count: songCount || 0 }),
        },
        {
            enabled: durationEnabled,
            id: 'duration',
            secondary: true,
            value: durationEnabled && formatDurationString(duration),
        },
    ];
    const { addToQueueByFetch } = usePlayer();
    const playButtonBehavior = usePlayButtonBehavior();
    const setFavorite = useSetFavorite();
    const uploadArtistImageMutation = useUploadArtistImage({});
    const albumArtistDetailSort = useAppStore((state) => state.albumArtistDetailSort);
    const sortBy = albumArtistDetailSort.sortBy;
    const sortOrder = albumArtistDetailSort.sortOrder;
    const groupingType = albumArtistDetailSort.groupingType;
    const artistReleaseTypeItems = useArtistReleaseTypeItems();
    const handlePlay = useCallback((type) => {
        if (!server?.id || !routeId)
            return;
        if (detailQuery.data) {
            recordRecentArtist(detailQuery.data);
        }
        const albums = albumsQuery.data?.items || [];
        const sortedAlbums = sortAlbumList(albums, sortBy, sortOrder);
        const { flatSortedAlbums } = getArtistAlbumsGrouped(sortedAlbums, routeId, groupingType, artistReleaseTypeItems, t);
        const albumIds = flatSortedAlbums.map((album) => album.id);
        if (albumIds.length === 0)
            return;
        addToQueueByFetch(server.id, albumIds, LibraryItem.ALBUM, type || playButtonBehavior);
    }, [
        addToQueueByFetch,
        albumsQuery.data?.items,
        artistReleaseTypeItems,
        detailQuery.data,
        groupingType,
        playButtonBehavior,
        routeId,
        server.id,
        sortBy,
        sortOrder,
        t,
    ]);
    const handleFavorite = useCallback(() => {
        if (!detailQuery.data)
            return;
        setFavorite(detailQuery.data._serverId, [detailQuery.data.id], LibraryItem.ALBUM_ARTIST, !detailQuery.data.userFavorite);
    }, [detailQuery.data, setFavorite]);
    const handleMoreOptions = useCallback((e) => {
        if (!detailQuery.data)
            return;
        ContextMenuController.call({
            cmd: { items: [detailQuery.data], type: LibraryItem.ALBUM_ARTIST },
            event: e,
        });
    }, [detailQuery.data]);
    const headerImageUrl = useItemImageUrl({
        id: detailQuery.data?.imageId || undefined,
        imageUrl: detailQuery.data?.imageUrl,
        itemType: LibraryItem.ALBUM_ARTIST,
        type: 'header',
    });
    const canUploadArtistImage = hasFeature(server, ServerFeature.ARTIST_IMAGE_UPLOAD) &&
        Boolean(detailQuery.data?._serverId);
    const handleArtistImageUpload = useCallback(async (file) => {
        const artist = detailQuery.data;
        if (!artist?._serverId)
            return;
        const buffer = await file.arrayBuffer();
        uploadArtistImageMutation.mutate({
            apiClientProps: {
                serverId: artist._serverId,
            },
            body: { image: new Uint8Array(buffer) },
            query: { id: artist.id },
        });
    }, [detailQuery.data, uploadArtistImageMutation]);
    return (_jsx(LibraryHeader, { imageOverlay: _jsx(ArtistImageUploadOverlay, { data: detailQuery.data, onUploadFile: handleArtistImageUpload }), imageUrl: headerImageUrl, item: {
            imageId: detailQuery.data?.imageId,
            imageUrl: detailQuery.data?.imageUrl,
            route: AppRoute.LIBRARY_ALBUM_ARTISTS,
            type: LibraryItem.ALBUM_ARTIST,
        }, onImageFileDrop: canUploadArtistImage ? handleArtistImageUpload : undefined, ref: ref, title: detailQuery.data?.name || '', children: _jsxs(Stack, { gap: "md", w: "100%", children: [_jsx(Group, { className: styles.metadataGroup, children: metadataItems
                        .filter((i) => i.enabled)
                        .map((item, index) => (_jsxs(Fragment, { children: [index > 0 && (_jsx(Text, { isMuted: true, isNoSelect: true, children: SEPARATOR_STRING })), _jsx(Text, { isMuted: item.secondary, children: item.value })] }, `item-${item.id}-${index}`))) }), _jsx(LibraryHeaderMenu, { favorite: detailQuery.data?.userFavorite, onFavorite: handleFavorite, onMore: handleMoreOptions, onPlay: (type) => handlePlay(type), onShuffle: () => handlePlay(Play.SHUFFLE) })] }) }));
});
