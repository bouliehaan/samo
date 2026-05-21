import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate, useParams } from 'react-router';
import { ListContext, useListContext } from '/@/renderer/context/list-context';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { ClientSideSongFilters } from '/@/renderer/features/playlists/components/client-side-song-filters';
import { PlaylistDetailSongListContent } from '/@/renderer/features/playlists/components/playlist-detail-song-list-content';
import { PlaylistDetailSongListHeader } from '/@/renderer/features/playlists/components/playlist-detail-song-list-header';
import { PlaylistQueryEditor } from '/@/renderer/features/playlists/components/playlist-query-editor';
import { SaveAsPlaylistForm } from '/@/renderer/features/playlists/components/save-as-playlist-form';
import { usePlaylistSongListFilters } from '/@/renderer/features/playlists/hooks/use-playlist-song-list-filters';
import { useDeletePlaylist } from '/@/renderer/features/playlists/mutations/delete-playlist-mutation';
import { useUpdatePlaylist } from '/@/renderer/features/playlists/mutations/update-playlist-mutation';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { ListWithSidebarContainer } from '/@/renderer/features/shared/components/list-with-sidebar-container';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { PlaylistTarget, useCurrentServer, usePageSidebar, usePlaylistTarget, } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem, ServerType } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
const PlaylistSongListFiltersSidebar = () => {
    const { t } = useTranslation();
    const { setIsSidebarOpen } = useListContext();
    const { clear } = usePlaylistSongListFilters();
    return (_jsxs(Stack, { h: "100%", style: { minHeight: 0 }, children: [_jsxs(Group, { justify: "space-between", pb: 0, pl: "md", pr: "md", pt: "md", children: [_jsx(Text, { fw: 500, size: "xl", children: t('common.filters', { postProcess: 'sentenceCase' }) }), _jsxs(Group, { gap: "xs", children: [_jsx(Button, { onClick: clear, size: "compact-sm", variant: "subtle", children: t('common.reset', { postProcess: 'sentenceCase' }) }), setIsSidebarOpen && (_jsx(ActionIcon, { icon: "unpin", onClick: () => setIsSidebarOpen(false), size: "compact-sm", variant: "subtle" }))] })] }), _jsx(ScrollArea, { style: { flex: 1, minHeight: 0 }, children: _jsx(ClientSideSongFilters, {}) })] }));
};
const PlaylistDetailSongListRoute = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { playlistId } = useParams();
    const server = useCurrentServer();
    const detailQuery = useSuspenseQuery({
        ...playlistsQueries.detail({ query: { id: playlistId }, serverId: server?.id }),
    });
    const deletePlaylistMutation = useDeletePlaylist({});
    const updatePlaylistMutation = useUpdatePlaylist({});
    const handleSave = (filter, extraFilters) => {
        if (!detailQuery?.data)
            return;
        const sortValue = extraFilters.sortBy && extraFilters.sortBy.length > 0
            ? extraFilters.sortBy[0]
            : '+dateAdded';
        const rules = {
            ...filter,
            limit: extraFilters.limit ?? undefined,
            limitPercent: extraFilters.limitPercent ?? undefined,
            sort: sortValue,
        };
        updatePlaylistMutation.mutate({
            apiClientProps: { serverId: detailQuery?.data?._serverId },
            body: {
                comment: detailQuery?.data?.description || '',
                name: detailQuery?.data?.name,
                ownerId: detailQuery?.data?.ownerId || '',
                public: detailQuery?.data?.public || false,
                queryBuilderRules: rules,
                sync: detailQuery?.data?.sync || false,
            },
            query: { id: playlistId },
        }, {
            onSuccess: () => {
                toast.success({ message: 'Playlist has been saved' });
            },
        });
    };
    const handleSaveAs = (filter, extraFilters) => {
        if (!detailQuery?.data)
            return;
        const sortValue = extraFilters.sortBy && extraFilters.sortBy.length > 0
            ? extraFilters.sortBy[0]
            : '+dateAdded';
        const rules = {
            ...filter,
            limit: extraFilters.limit ?? undefined,
            limitPercent: extraFilters.limitPercent ?? undefined,
            sort: sortValue,
        };
        openModal({
            children: (_jsx(SaveAsPlaylistForm, { body: {
                    comment: detailQuery?.data?.description || '',
                    name: detailQuery?.data?.name,
                    ownerId: detailQuery?.data?.ownerId || '',
                    public: detailQuery?.data?.public || false,
                    queryBuilderRules: rules,
                    sync: detailQuery?.data?.sync || false,
                }, onCancel: closeAllModals, onSuccess: (data) => navigate(generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, {
                    playlistId: data?.id || '',
                })), serverId: detailQuery?.data?._serverId || '' })),
            title: t('common.saveAs', { postProcess: 'sentenceCase' }),
        });
    };
    const openDeletePlaylistModal = () => {
        openModal({
            children: (_jsx(ConfirmModal, { onConfirm: () => {
                    if (!detailQuery?.data)
                        return;
                    deletePlaylistMutation?.mutate({
                        apiClientProps: { serverId: detailQuery.data._serverId },
                        query: { id: detailQuery.data.id },
                    }, {
                        onError: (err) => {
                            toast.error({
                                message: err.message,
                                title: t('error.genericError', {
                                    postProcess: 'sentenceCase',
                                }),
                            });
                        },
                        onSuccess: () => {
                            navigate(AppRoute.PLAYLISTS, { replace: true });
                        },
                    });
                    closeAllModals();
                }, children: _jsx(Text, { children: "Are you sure you want to delete this playlist?" }) })),
            title: t('form.deletePlaylist.title', { postProcess: 'sentenceCase' }),
        });
    };
    const isSmartPlaylist = Boolean(detailQuery?.data?.rules && server?.type === ServerType.NAVIDROME);
    const [showQueryBuilder, setShowQueryBuilder] = useState(false);
    const [isQueryBuilderExpanded, setIsQueryBuilderExpanded] = useState(false);
    const queryBuilderRef = useRef(null);
    const handleToggleExpand = () => {
        setIsQueryBuilderExpanded((prev) => !prev);
    };
    const handleToggleShowQueryBuilder = () => {
        setShowQueryBuilder((prev) => !prev);
        setIsQueryBuilderExpanded(true);
    };
    const playlistTarget = usePlaylistTarget();
    const displayMode = playlistTarget === PlaylistTarget.ALBUM ? LibraryItem.ALBUM : LibraryItem.SONG;
    const listKey = displayMode === LibraryItem.ALBUM ? ItemListKey.PLAYLIST_ALBUM : ItemListKey.PLAYLIST_SONG;
    const [itemCount, setItemCount] = useState(undefined);
    const [listData, setListData] = useState([]);
    const [mode, setMode] = useState('view');
    const [isSidebarOpen, setIsSidebarOpen] = usePageSidebar(listKey);
    const providerValue = useMemo(() => {
        return {
            customFilters: undefined,
            displayMode,
            id: playlistId,
            isSidebarOpen,
            isSmartPlaylist,
            itemCount,
            listData,
            listKey,
            mode,
            pageKey: listKey,
            setIsSidebarOpen,
            setItemCount,
            setListData,
            setMode,
        };
    }, [
        playlistId,
        isSmartPlaylist,
        displayMode,
        listKey,
        isSidebarOpen,
        itemCount,
        listData,
        mode,
        setIsSidebarOpen,
    ]);
    return (_jsx(AnimatedPage, { children: _jsxs(ListContext.Provider, { value: providerValue, children: [_jsx(PlaylistDetailSongListHeader, { isSmartPlaylist: !!isSmartPlaylist, onConvertToSmart: () => {
                        if (!isSmartPlaylist) {
                            setShowQueryBuilder(true);
                            setIsQueryBuilderExpanded(true);
                        }
                    }, onDelete: () => openDeletePlaylistModal(), onToggleQueryBuilder: handleToggleShowQueryBuilder }), _jsxs(ListWithSidebarContainer, { children: [_jsx(ListWithSidebarContainer.SidebarPortal, { children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(PlaylistSongListFiltersSidebar, {}) }) }), _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(PlaylistDetailSongListContent, {}) })] }), (isSmartPlaylist || showQueryBuilder) && (_jsx(PlaylistQueryEditor, { detailQuery: detailQuery, handleSave: handleSave, handleSaveAs: handleSaveAs, isQueryBuilderExpanded: isQueryBuilderExpanded, onToggleExpand: handleToggleExpand, playlistId: playlistId, queryBuilderRef: queryBuilderRef, updatePlaylistMutation: updatePlaylistMutation }))] }) }, `playlist-detail-songList-${playlistId}`));
};
const PlaylistDetailSongListRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(PlaylistDetailSongListRoute, {}) }));
};
export default PlaylistDetailSongListRouteWithBoundary;
