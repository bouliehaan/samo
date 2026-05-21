import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useListContext } from '/@/renderer/context/list-context';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { PlaylistDetailSongListHeaderFilters } from '/@/renderer/features/playlists/components/playlist-detail-song-list-header-filters';
import { useDeletePlaylistImage } from '/@/renderer/features/playlists/mutations/delete-playlist-image-mutation';
import { useUploadPlaylistImage } from '/@/renderer/features/playlists/mutations/upload-playlist-image-mutation';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeader, LibraryHeaderMenu, } from '/@/renderer/features/shared/components/library-header';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentPlaylist, useCurrentServer } from '/@/renderer/store';
import { formatDurationString } from '/@/renderer/utils';
import { replaceURLWithHTMLLinks } from '/@/renderer/utils/linkify';
import { hasFeature } from '/@/shared/api/utils';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { FileButton } from '/@/shared/components/file-button/file-button';
import { Group } from '/@/shared/components/group/group';
import { Spoiler } from '/@/shared/components/spoiler/spoiler';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ServerFeature } from '/@/shared/types/features-types';
import { Play } from '/@/shared/types/types';
function ImageUploadOverlay({ data, onUploadFile, }) {
    const deletePlaylistImageMutation = useDeletePlaylistImage({});
    const server = useCurrentServer();
    if (!data)
        return null;
    if (!hasFeature(server, ServerFeature.PLAYLIST_IMAGE_UPLOAD))
        return null;
    return (_jsxs(Group, { gap: "xs", children: [_jsx(FileButton, { accept: "image/*", onChange: async (file) => {
                    if (!file)
                        return;
                    await onUploadFile(file);
                }, children: (props) => (_jsx(ActionIcon, { icon: "uploadImage", iconProps: { size: 'lg' }, radius: "xl", size: "xs", variant: "default", ...props })) }), _jsx(ActionIcon, { disabled: !data?.uploadedImage, icon: "delete", iconProps: { size: 'lg' }, onClick: (e) => {
                    e.stopPropagation();
                    if (!data?._serverId)
                        return;
                    deletePlaylistImageMutation.mutate({
                        apiClientProps: {
                            serverId: data._serverId,
                        },
                        query: { id: data.id },
                    });
                }, radius: "xl", size: "xs", variant: "default" })] }));
}
export const PlaylistDetailSongListHeader = ({ isSmartPlaylist, }) => {
    const { t } = useTranslation();
    const { playlistId } = useParams();
    const { itemCount, listData } = useListContext();
    const server = useCurrentServer();
    const location = useLocation();
    const detailQuery = useQuery({
        ...playlistsQueries.detail({ query: { id: playlistId }, serverId: server?.id }),
        placeholderData: location.state?.item,
    });
    const playlistDuration = detailQuery?.data?.duration;
    const playlistDescription = detailQuery?.data?.description?.trim();
    const [collapsed] = useLocalStorage({
        defaultValue: false,
        key: 'playlist-header-collapsed',
    });
    const player = usePlayer();
    const uploadPlaylistImageMutation = useUploadPlaylistImage({});
    const handlePlay = (type) => {
        const playlistServerId = detailQuery?.data?._serverId ?? server?.id;
        // Tag fresh-start plays with playlist context so the queue persists across launches.
        // Additive types (LAST/NEXT) ignore the context and preserve the prior intent.
        player.addToQueueByData(listData, type || Play.NOW, undefined, playlistServerId
            ? { kind: 'playlist', playlistId, serverId: playlistServerId }
            : undefined);
        if (detailQuery?.data) {
            recordRecentPlaylist(detailQuery.data);
        }
    };
    const canUploadPlaylistImage = hasFeature(server, ServerFeature.PLAYLIST_IMAGE_UPLOAD) &&
        Boolean(detailQuery?.data?._serverId);
    const handlePlaylistImageUpload = useCallback(async (file) => {
        const playlist = detailQuery?.data;
        if (!playlist?._serverId)
            return;
        const buffer = await file.arrayBuffer();
        uploadPlaylistImageMutation.mutate({
            apiClientProps: {
                serverId: playlist._serverId,
            },
            body: { image: new Uint8Array(buffer) },
            query: { id: playlist.id },
        });
    }, [detailQuery?.data, uploadPlaylistImageMutation]);
    const imageUrl = useItemImageUrl({
        id: detailQuery?.data?.imageId || undefined,
        itemType: LibraryItem.PLAYLIST,
        type: 'header',
    });
    return (_jsxs(Stack, { gap: 0, children: [collapsed ? (_jsxs(PageHeader, { children: [_jsxs(LibraryHeaderBar, { ignoreMaxWidth: true, children: [_jsx(LibraryHeaderBar.PlayButton, { context: detailQuery?.data?._serverId
                                    ? {
                                        kind: 'playlist',
                                        playlistId,
                                        serverId: detailQuery.data._serverId,
                                    }
                                    : undefined, itemType: LibraryItem.PLAYLIST, onBeforePlay: () => {
                                    if (detailQuery?.data) {
                                        recordRecentPlaylist(detailQuery.data);
                                    }
                                }, songs: listData }), _jsx(LibraryHeaderBar.Title, { children: detailQuery?.data?.name }), isSmartPlaylist && (_jsx(LibraryHeaderBar.Badge, { children: t('entity.smartPlaylist') })), !!playlistDuration && (_jsx(LibraryHeaderBar.Badge, { children: formatDurationString(playlistDuration) })), _jsx(LibraryHeaderBar.Badge, { isLoading: itemCount === null || itemCount === undefined, children: itemCount })] }), _jsx(ListSearchInput, {})] })) : (_jsx(LibraryHeader, { compact: true, imageOverlay: _jsx(ImageUploadOverlay, { data: detailQuery?.data, onUploadFile: handlePlaylistImageUpload }), imageUrl: imageUrl, item: {
                    imageId: detailQuery?.data?.imageId,
                    imageUrl: detailQuery?.data?.imageUrl,
                    route: AppRoute.PLAYLISTS,
                    type: LibraryItem.PLAYLIST,
                }, onImageFileDrop: canUploadPlaylistImage ? handlePlaylistImageUpload : undefined, title: detailQuery?.data?.name || '', topRight: _jsx(ListSearchInput, {}), children: _jsxs(Stack, { gap: "md", w: "100%", children: [playlistDescription ? (_jsx(Spoiler, { hideLabel: _jsx(_Fragment, {}), maxHeight: 16, showLabel: _jsx(_Fragment, {}), style: { marginBottom: 0 }, children: _jsx(Text, { isMuted: true, size: "sm", style: {
                                    maxWidth: '100%',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }, children: replaceURLWithHTMLLinks(playlistDescription) }) })) : null, _jsx(LibraryHeaderMenu, { onPlay: (type) => handlePlay(type), onShuffle: () => handlePlay(Play.SHUFFLE) })] }) })), _jsx(FilterBar, { children: _jsx(PlaylistDetailSongListHeaderFilters, { isSmartPlaylist: isSmartPlaylist }) })] }));
};
