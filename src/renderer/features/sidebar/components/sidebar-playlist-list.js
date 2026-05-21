import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { openContextModal } from '@mantine/modals';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, Link } from 'react-router';
import styles from './sidebar-playlist-list.module.css';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { openCreatePlaylistModal } from '/@/renderer/features/playlists/components/create-playlist-form';
import { LONG_PRESS_PLAY_BEHAVIOR, PlayTooltip, } from '/@/renderer/features/shared/components/play-button-group';
import { usePlayButtonClick } from '/@/renderer/features/shared/hooks/use-play-button-click';
import { useDragDrop } from '/@/renderer/hooks/use-drag-drop';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer, useCurrentServerId, usePermissions, usePlaybackSource, usePlayerStatus, usePlayerStore, useSidebarPlaylistListFilterRegex, useSidebarPlaylistSorting, } from '/@/renderer/store';
import { formatDurationString } from '/@/renderer/utils';
import { Accordion } from '/@/shared/components/accordion/accordion';
import { ActionIcon, ActionIconGroup } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
import { LibraryItem, PlaylistListSort, SortOrder, } from '/@/shared/types/domain-types';
import { DragOperation, DragTarget } from '/@/shared/types/drag-and-drop';
import { Play } from '/@/shared/types/types';
const getPlaylistOrderKey = (serverId, scope) => {
    const sid = serverId || 'local';
    return `playlist_order:${sid}:${scope}`;
};
const PlaylistRowButton = memo(({ item, name, onContextMenu, onReorder, to }) => {
    const url = {
        pathname: generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, { playlistId: to }),
        state: { item },
    };
    const { t } = useTranslation();
    const sidebarPlaylistSorting = useSidebarPlaylistSorting();
    const playerStatus = usePlayerStatus();
    const playbackSource = usePlaybackSource();
    const playerContext = usePlayerStore((state) => state.player.context);
    const [isHovered, setIsHovered] = useState(false);
    const isPlaylistPlaying = playbackSource === 'music' &&
        playerStatus === 'playing' &&
        playerContext.kind === 'playlist' &&
        playerContext.playlistId === to;
    const { isDraggedOver, isDragging, ref } = useDragDrop({
        drag: {
            getId: () => {
                return item && item.id ? [item.id] : [];
            },
            getItem: () => {
                return item ? [item] : [];
            },
            itemType: LibraryItem.PLAYLIST,
            operation: [DragOperation.ADD, DragOperation.REORDER],
            target: DragTarget.PLAYLIST,
        },
        drop: {
            canDrop: (args) => {
                // Allow dropping items into a playlist (ADD)
                const canAdd = args.source.itemType !== undefined &&
                    args.source.type !== DragTarget.PLAYLIST &&
                    (args.source.operation?.includes(DragOperation.ADD) ?? false);
                // Allow reordering playlists when source is playlist and operation includes REORDER
                // do not allow cross-scope reorders
                const canReorder = args.source.itemType === LibraryItem.PLAYLIST &&
                    args.source.type === DragTarget.PLAYLIST &&
                    (args.source.operation?.includes(DragOperation.REORDER) ?? false);
                return canAdd || (canReorder && sidebarPlaylistSorting);
            },
            getData: () => {
                return {
                    id: [to],
                    item: [],
                    itemType: LibraryItem.PLAYLIST,
                    type: DragTarget.PLAYLIST,
                };
            },
            onDrag: () => {
                return;
            },
            onDragLeave: () => {
                return;
            },
            onDrop: (args) => {
                const sourceItemType = args.source.itemType;
                const sourceIds = args.source.id;
                // Handle playlist reordering locally
                if (sourceItemType === LibraryItem.PLAYLIST &&
                    (args.source.operation?.includes(DragOperation.REORDER) ?? false) &&
                    args.edge &&
                    (args.edge === 'top' || args.edge === 'bottom') &&
                    onReorder) {
                    const sourceItems = Array.isArray(args.source.item)
                        ? args.source.item
                        : undefined;
                    // Prevent cross-scope reorders (owned <-> shared)
                    if (sourceItems && sourceItems.length > 0) {
                        if (sourceItems.some((si) => si.ownerId !== item.ownerId)) {
                            return;
                        }
                    }
                    onReorder(sourceIds, to, args.edge);
                    return;
                }
                const modalProps = {
                    initialSelectedIds: [to],
                };
                switch (sourceItemType) {
                    case LibraryItem.ALBUM:
                        modalProps.albumId = sourceIds;
                        break;
                    case LibraryItem.ALBUM_ARTIST:
                    case LibraryItem.ARTIST:
                        modalProps.artistId = sourceIds;
                        break;
                    case LibraryItem.FOLDER:
                        modalProps.folderId = sourceIds;
                        break;
                    case LibraryItem.GENRE:
                        modalProps.genreId = sourceIds;
                        break;
                    case LibraryItem.PLAYLIST:
                        modalProps.playlistId = sourceIds;
                        break;
                    case LibraryItem.PLAYLIST_SONG:
                    case LibraryItem.QUEUE_SONG:
                    case LibraryItem.SONG:
                        if (args.source.item && Array.isArray(args.source.item)) {
                            const songs = args.source.item;
                            modalProps.songId = songs.map((song) => song.id);
                        }
                        else {
                            modalProps.songId = sourceIds;
                        }
                        break;
                    default:
                        return;
                }
                openContextModal({
                    innerProps: modalProps,
                    modal: 'addToPlaylist',
                    size: 'lg',
                    title: t('form.addToPlaylist.title', { postProcess: 'titleCase' }),
                });
            },
        },
        isEnabled: true,
    });
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const permissions = usePermissions();
    const handlePlay = useCallback((id, type) => {
        player.addToQueueByFetch(serverId, [id], LibraryItem.PLAYLIST, type);
    }, [player, serverId]);
    const imageUrl = useItemImageUrl({
        id: item.imageId || undefined,
        itemType: LibraryItem.PLAYLIST,
        type: 'table',
    });
    return (_jsxs(Link, { className: clsx(styles.row, {
            [styles.rowDraggedOver]: isDraggedOver,
            [styles.rowHover]: isHovered,
            [styles.rowPlaying]: isPlaylistPlaying,
        }), onContextMenu: (e) => {
            e.preventDefault();
            onContextMenu(e, item);
        }, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), ref: ref, style: {
            opacity: isDragging ? 0.5 : 1,
        }, to: url, children: [_jsxs("div", { className: styles.rowGroup, children: [_jsx(Image, { containerClassName: styles.imageContainer, src: imageUrl }), _jsxs("div", { className: styles.metadata, children: [_jsx(Text, { className: styles.name, fw: 500, size: "md", children: name }), _jsxs("div", { className: styles.metadataGroup, children: [_jsxs("div", { className: clsx(styles.metadataGroupItem, styles.metadataGroupItemNoShrink), children: [_jsx(Icon, { color: "muted", icon: "itemSong", size: "sm" }), _jsx(Text, { isMuted: true, size: "sm", children: item.songCount || 0 })] }), _jsxs("div", { className: styles.metadataGroupItem, children: [_jsx(Icon, { color: "muted", icon: "duration", size: "sm" }), _jsx(Text, { isMuted: true, size: "sm", children: formatDurationString(item.duration ?? 0) })] }), item.ownerId === permissions.userId && Boolean(item.public) && (_jsx("div", { className: styles.metadataGroupItem, children: _jsx(Text, { isMuted: true, size: "sm", children: t('common.public', { postProcess: 'titleCase' }) }) })), item.ownerId !== permissions.userId && (_jsxs("div", { className: styles.metadataGroupItem, children: [_jsx(Icon, { color: "muted", icon: "user", size: "sm" }), _jsx(Text, { isMuted: true, size: "sm", children: item.owner })] }))] })] })] }), isHovered && _jsx(RowControls, { id: to, onPlay: handlePlay })] }));
});
const RowControls = ({ id, onPlay, }) => {
    const handlePlayNext = usePlayButtonClick({
        onClick: () => {
            onPlay(id, Play.NEXT);
        },
        onLongPress: () => {
            onPlay(id, LONG_PRESS_PLAY_BEHAVIOR[Play.NEXT]);
        },
    });
    const handlePlayNow = usePlayButtonClick({
        onClick: () => {
            onPlay(id, Play.NOW);
        },
        onLongPress: () => {
            onPlay(id, LONG_PRESS_PLAY_BEHAVIOR[Play.NOW]);
        },
    });
    const handlePlayLast = usePlayButtonClick({
        onClick: () => {
            onPlay(id, Play.LAST);
        },
        onLongPress: () => {
            onPlay(id, LONG_PRESS_PLAY_BEHAVIOR[Play.LAST]);
        },
    });
    return (_jsxs(ActionIconGroup, { className: styles.controls, children: [_jsx(PlayTooltip, { type: Play.NOW, children: _jsx(ActionIcon, { icon: "mediaPlay", iconProps: {
                        size: 'md',
                    }, size: "xs", variant: "subtle", ...handlePlayNow.handlers, ...handlePlayNow.props }) }), _jsx(PlayTooltip, { type: Play.NEXT, children: _jsx(ActionIcon, { icon: "mediaPlayNext", iconProps: {
                        size: 'md',
                    }, size: "xs", variant: "subtle", ...handlePlayNext.handlers, ...handlePlayNext.props }) }), _jsx(PlayTooltip, { type: Play.LAST, children: _jsx(ActionIcon, { icon: "mediaPlayLast", iconProps: {
                        size: 'md',
                    }, size: "xs", variant: "subtle", ...handlePlayLast.handlers, ...handlePlayLast.props }) })] }));
};
export const SidebarPlaylistList = () => {
    const player = usePlayer();
    const { t } = useTranslation();
    const server = useCurrentServer();
    const serverId = server.id;
    const sidebarPlaylistSorting = useSidebarPlaylistSorting();
    const filterRegex = useSidebarPlaylistListFilterRegex();
    const playlistsQuery = useQuery(playlistsQueries.list({
        query: {
            sortBy: PlaylistListSort.NAME,
            sortOrder: SortOrder.ASC,
            startIndex: 0,
        },
        serverId,
    }));
    const handlePlayPlaylist = useCallback((id, playType) => {
        if (!serverId)
            return;
        player.addToQueueByFetch(serverId, [id], LibraryItem.PLAYLIST, playType);
    }, [player, serverId]);
    const handleContextMenu = useCallback((e, playlist) => {
        e.preventDefault();
        e.stopPropagation();
        ContextMenuController.call({
            cmd: { items: [playlist], type: LibraryItem.PLAYLIST },
            event: e,
        });
    }, []);
    const [playlistOrder, setPlaylistOrder] = useLocalStorage({
        defaultValue: [],
        key: getPlaylistOrderKey(serverId, 'owned'),
    });
    const playlistItems = useMemo(() => {
        const base = { handlePlay: handlePlayPlaylist };
        if (!server.type || !server.username || !playlistsQuery.data?.items) {
            return { ...base, items: playlistsQuery.data?.items };
        }
        let regex = null;
        if (filterRegex) {
            try {
                regex = new RegExp(filterRegex, 'i');
            }
            catch {
                // Invalid regex, ignore filtering
            }
        }
        const ownedPlaylistItems = [];
        for (const playlist of playlistsQuery.data?.items ?? []) {
            if (!playlist.owner || playlist.owner === server.username) {
                // Filter out playlists that match the regex
                if (regex && regex.test(playlist.name)) {
                    continue;
                }
                ownedPlaylistItems.push(playlist);
            }
        }
        if (!ownedPlaylistItems || !sidebarPlaylistSorting || !playlistOrder) {
            return { ...base, items: ownedPlaylistItems };
        }
        // Apply saved order, include only playlists that still exist
        const idMap = new Map(ownedPlaylistItems.map((it) => [it.id, it]));
        const ordered = playlistOrder
            .map((id) => idMap.get(id))
            .filter((it) => it !== undefined);
        // Append any new items that weren't in saved order
        const remaining = ownedPlaylistItems.filter((it) => !playlistOrder.includes(it.id));
        const newPlaylistItems = [...ordered, ...remaining];
        return { ...base, items: newPlaylistItems };
    }, [
        handlePlayPlaylist,
        playlistsQuery.data?.items,
        server.type,
        server.username,
        sidebarPlaylistSorting,
        playlistOrder,
        filterRegex,
    ]);
    if (!server) {
        return null;
    }
    const handleReorder = (sourceIds, targetId, edge) => {
        if (!playlistItems?.items || !edge)
            return;
        const currentIds = playlistItems.items.map((p) => p.id);
        const targetIndex = currentIds.indexOf(targetId);
        if (targetIndex === -1)
            return;
        const idsWithoutSources = currentIds.filter((id) => !sourceIds.includes(id));
        const sourcesBeforeTarget = sourceIds.filter((id) => {
            const sourceIndex = currentIds.indexOf(id);
            return sourceIndex !== -1 && sourceIndex < targetIndex;
        }).length;
        const insertIndexInFiltered = edge === 'top'
            ? targetIndex - sourcesBeforeTarget
            : targetIndex - sourcesBeforeTarget + 1;
        const insertIndex = Math.max(0, Math.min(insertIndexInFiltered, idsWithoutSources.length));
        const reorderedIds = [
            ...idsWithoutSources.slice(0, insertIndex),
            ...sourceIds,
            ...idsWithoutSources.slice(insertIndex),
        ];
        setPlaylistOrder(reorderedIds);
    };
    const handleCreatePlaylistModal = (e) => {
        openCreatePlaylistModal(server, e);
    };
    return (_jsxs(Accordion.Item, { value: "playlists", children: [_jsx(Accordion.Control, { component: "div", role: "button", style: { userSelect: 'none' }, children: _jsxs(Group, { justify: "space-between", pr: "var(--theme-spacing-md)", children: [_jsx(Text, { fw: 500, children: t('page.sidebar.playlists', {
                                postProcess: 'titleCase',
                            }) }), _jsxs(Group, { gap: "xs", children: [_jsx(ActionIcon, { icon: "add", iconProps: {
                                        size: 'lg',
                                    }, onClick: handleCreatePlaylistModal, size: "xs", tooltip: {
                                        label: t('action.createPlaylist', {
                                            postProcess: 'sentenceCase',
                                        }),
                                    }, variant: "subtle" }), _jsx(ActionIcon, { component: Link, icon: "list", iconProps: {
                                        size: 'lg',
                                    }, onClick: (e) => e.stopPropagation(), size: "xs", to: AppRoute.PLAYLISTS, tooltip: {
                                        label: t('action.viewPlaylists', {
                                            postProcess: 'sentenceCase',
                                        }),
                                    }, variant: "subtle" })] })] }) }), _jsx(Accordion.Panel, { children: playlistItems?.items?.map((item, index) => (_jsx(PlaylistRowButton, { item: item, name: item.name, onContextMenu: handleContextMenu, onReorder: handleReorder, to: item.id }, index))) })] }));
};
export const SidebarSharedPlaylistList = () => {
    const player = usePlayer();
    const { t } = useTranslation();
    const server = useCurrentServer();
    const serverId = server.id;
    const sidebarPlaylistSorting = useSidebarPlaylistSorting();
    const filterRegex = useSidebarPlaylistListFilterRegex();
    const playlistsQuery = useQuery(playlistsQueries.list({
        query: {
            sortBy: PlaylistListSort.NAME,
            sortOrder: SortOrder.ASC,
            startIndex: 0,
        },
        serverId,
    }));
    const handlePlayPlaylist = useCallback((id, playType) => {
        if (!serverId)
            return;
        player.addToQueueByFetch(serverId, [id], LibraryItem.PLAYLIST, playType);
    }, [player, serverId]);
    const handleContextMenu = useCallback((e, playlist) => {
        e.preventDefault();
        e.stopPropagation();
        ContextMenuController.call({
            cmd: {
                items: [playlist],
                type: LibraryItem.PLAYLIST,
            },
            event: e,
        });
    }, []);
    const [playlistOrder, setPlaylistOrder] = useLocalStorage({
        defaultValue: [],
        key: getPlaylistOrderKey(serverId, 'shared'),
    });
    const playlistItems = useMemo(() => {
        const base = { handlePlay: handlePlayPlaylist };
        if (!server.type || !server.username || !playlistsQuery.data?.items) {
            return { ...base, items: playlistsQuery.data?.items };
        }
        let regex = null;
        if (filterRegex) {
            try {
                regex = new RegExp(filterRegex, 'i');
            }
            catch {
                // Invalid regex, ignore filtering
            }
        }
        const sharedPlaylistItems = [];
        for (const playlist of playlistsQuery.data?.items ?? []) {
            if (playlist.owner && playlist.owner !== server.username) {
                // Filter out playlists that match the regex
                if (regex && regex.test(playlist.name)) {
                    continue;
                }
                sharedPlaylistItems.push(playlist);
            }
        }
        if (!sharedPlaylistItems || !sidebarPlaylistSorting || !playlistOrder) {
            return { ...base, items: sharedPlaylistItems };
        }
        // Apply saved order, include only playlists that still exist
        const idMap = new Map(sharedPlaylistItems.map((it) => [it.id, it]));
        const ordered = playlistOrder
            .map((id) => idMap.get(id))
            .filter((it) => it !== undefined);
        // Append any new items that weren't in saved order
        const remaining = sharedPlaylistItems.filter((it) => !playlistOrder.includes(it.id));
        const newPlaylistItems = [...ordered, ...remaining];
        return { ...base, items: newPlaylistItems };
    }, [
        handlePlayPlaylist,
        playlistsQuery.data?.items,
        server.type,
        server.username,
        sidebarPlaylistSorting,
        playlistOrder,
        filterRegex,
    ]);
    if (!server) {
        return null;
    }
    const handleReorder = (sourceIds, targetId, edge) => {
        if (!playlistItems?.items || !edge)
            return;
        const currentIds = playlistItems.items.map((p) => p.id);
        const targetIndex = currentIds.indexOf(targetId);
        if (targetIndex === -1)
            return;
        const idsWithoutSources = currentIds.filter((id) => !sourceIds.includes(id));
        const sourcesBeforeTarget = sourceIds.filter((id) => {
            const sourceIndex = currentIds.indexOf(id);
            return sourceIndex !== -1 && sourceIndex < targetIndex;
        }).length;
        const insertIndexInFiltered = edge === 'top'
            ? targetIndex - sourcesBeforeTarget
            : targetIndex - sourcesBeforeTarget + 1;
        const insertIndex = Math.max(0, Math.min(insertIndexInFiltered, idsWithoutSources.length));
        const reorderedIds = [
            ...idsWithoutSources.slice(0, insertIndex),
            ...sourceIds,
            ...idsWithoutSources.slice(insertIndex),
        ];
        setPlaylistOrder(reorderedIds);
    };
    if (playlistItems?.items?.length === 0) {
        return null;
    }
    return (_jsxs(Accordion.Item, { value: "shared-playlists", children: [_jsx(Accordion.Control, { children: _jsx(Text, { fw: 500, variant: "secondary", children: t('page.sidebar.shared', {
                        postProcess: 'titleCase',
                    }) }) }), _jsx(Accordion.Panel, { children: playlistItems?.items?.map((item, index) => (_jsx(PlaylistRowButton, { item: item, name: item.name, onContextMenu: handleContextMenu, onReorder: handleReorder, to: item.id }, index))) })] }));
};
