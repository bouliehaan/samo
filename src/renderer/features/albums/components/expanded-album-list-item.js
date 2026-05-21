import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSuspenseQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import formatDuration from 'format-duration';
import { motion } from 'motion/react';
import { Fragment, Suspense, useCallback, useRef } from 'react';
import styles from './expanded-album-list-item.module.css';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { getDraggedItems } from '/@/renderer/components/item-list/helpers/get-dragged-items';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useItemDraggingState, useItemListState, useItemSelectionState, } from '/@/renderer/components/item-list/helpers/item-list-state';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { PlayButtonGroup } from '/@/renderer/features/shared/components/play-button-group';
import { useFastAverageColor } from '/@/renderer/hooks';
import { useDragDrop } from '/@/renderer/hooks/use-drag-drop';
import { useSetGlobalExpanded } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Separator } from '/@/shared/components/separator/separator';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { useMergedRef } from '/@/shared/hooks/use-merged-ref';
import { LibraryItem } from '/@/shared/types/domain-types';
import { DragOperation, DragTarget, DragTargetMap } from '/@/shared/types/drag-and-drop';
import { Play } from '/@/shared/types/types';
const CloseExpandedButton = () => {
    const setGlobalExpanded = useSetGlobalExpanded();
    return (_jsx(ActionIcon, { className: clsx(styles.closeButton), icon: "x", iconProps: {
            size: 'xl',
        }, onClick: () => setGlobalExpanded(null), radius: "50%", size: "sm", variant: "default" }));
};
const TrackRow = ({ controls, internalState, player, serverId, song, songs }) => {
    const rowId = internalState.extractRowId(song);
    const isSelected = useItemSelectionState(internalState, rowId);
    const isDraggingState = useItemDraggingState(internalState, rowId);
    const songWithMetadata = {
        ...song,
        _serverId: serverId,
        itemType: LibraryItem.SONG,
    };
    const { isDraggedOver, isDragging: isDraggingLocal, ref: dragRef, } = useDragDrop({
        drag: {
            getId: () => {
                const draggedItems = getDraggedItems(songWithMetadata, internalState);
                return draggedItems.map((draggedItem) => draggedItem.id);
            },
            getItem: () => {
                const draggedItems = getDraggedItems(songWithMetadata, internalState);
                return draggedItems;
            },
            itemType: LibraryItem.SONG,
            onDragStart: () => {
                const draggedItems = getDraggedItems(songWithMetadata, internalState);
                internalState.setDragging(draggedItems);
            },
            onDrop: () => {
                internalState.setDragging([]);
            },
            operation: [DragOperation.ADD],
            target: DragTargetMap[LibraryItem.SONG] || DragTarget.GENERIC,
        },
        isEnabled: true,
    });
    const isDragging = isDraggingState || isDraggingLocal;
    const containerRef = useRef(null);
    const mergedRef = useMergedRef(containerRef, dragRef);
    const handleDoubleClick = useCallback(() => {
        if (songs && song.id) {
            player.addToQueueByData(songs, Play.NOW, song.id);
        }
    }, [player, songs, song.id]);
    return (_jsxs(Text, { className: clsx(styles['track-row'], {
            [styles.dragging]: isDragging,
            [styles.rowSelected]: isSelected,
            [styles['dragged-over-bottom']]: isDraggedOver === 'bottom',
            [styles['dragged-over-top']]: isDraggedOver === 'top',
        }), onClick: (e) => controls.onClick?.({
            event: e,
            internalState,
            item: songWithMetadata,
            itemType: LibraryItem.SONG,
        }), onDoubleClick: handleDoubleClick, ref: mergedRef, size: "sm", children: [_jsxs("span", { className: styles['track-number'], children: [song.discNumber, " - ", song.trackNumber] }), _jsx("span", { className: styles['track-name'], children: song.name }), _jsx("span", { className: styles['track-duration'], children: formatDuration(song.duration) })] }));
};
const AlbumTracksTable = ({ isDark, serverId, songs }) => {
    const getDataFn = useCallback(() => songs || [], [songs]);
    const extractRowId = useCallback((item) => {
        if (item && typeof item === 'object' && 'id' in item) {
            return item.id;
        }
        return undefined;
    }, []);
    // Always use a local state for tracks - tracks are separate entities from albums
    // and need their own selection state. The parentInternalState is for album-level operations.
    const internalState = useItemListState(getDataFn, extractRowId);
    const controls = useDefaultItemListControls();
    const player = usePlayer();
    const fullSongs = songs;
    return (_jsx("div", { className: clsx(styles.tracks, { [styles.dark]: isDark }), children: _jsx(ScrollArea, { children: _jsx("div", { className: styles['tracks-list'], children: songs?.map((song) => (_jsx(TrackRow, { controls: controls, internalState: internalState, player: player, serverId: serverId, song: song, songs: fullSongs || [] }, song.id))) }) }) }));
};
const ExpandedAlbumListItemContent = ({ albumData }) => {
    const player = usePlayer();
    const imageUrl = useItemImageUrl({
        id: albumData.imageId || undefined,
        itemType: LibraryItem.ALBUM,
        type: 'itemCard',
    });
    const color = useFastAverageColor({
        algorithm: 'sqrt',
        id: albumData.id,
        src: imageUrl,
        srcLoaded: true,
    });
    const handlePlay = useCallback((playType) => {
        if (albumData.songs?.length) {
            player.addToQueueByData(albumData.songs, playType);
        }
    }, [albumData.songs, player]);
    if (color.isLoading) {
        return _jsx(Spinner, { container: true });
    }
    const songs = albumData.songs ?? null;
    return (_jsx(motion.div, { animate: { opacity: 1 }, className: styles.container, exit: { opacity: 0 }, initial: { opacity: 0 }, style: { backgroundColor: color.background }, children: _jsxs("div", { className: styles.expanded, children: [_jsxs("div", { className: styles.content, children: [_jsxs("div", { className: styles.header, children: [_jsxs("div", { className: styles.headerTitle, children: [_jsx(TextTitle, { className: clsx(styles.itemTitle, { [styles.dark]: color.isDark }), fw: 700, order: 4, children: albumData.name }), _jsx(CloseExpandedButton, {})] }), _jsx(Group, { className: clsx(styles.itemSubtitle, { [styles.dark]: color.isDark }), gap: "xs", children: albumData.albumArtists?.map((artist, index) => (_jsxs(Fragment, { children: [_jsx(Text, { className: clsx(styles.itemSubtitle, {
                                                    [styles.dark]: color.isDark,
                                                }), children: artist.name }), index < (albumData.albumArtists?.length ?? 0) - 1 && (_jsx(Separator, {}))] }, artist.id))) })] }), _jsx(AlbumTracksTable, { isDark: color.isDark, serverId: albumData._serverId, songs: songs ?? undefined })] }), _jsxs("div", { className: styles.imageContainer, children: [_jsx("div", { className: styles.backgroundImage, style: {
                                ['--bg-color']: color?.background,
                                backgroundImage: `url(${imageUrl})`,
                            } }), songs && songs.length > 0 && (_jsx("div", { className: styles.playButtonGroup, children: _jsx(PlayButtonGroup, { allowShuffle: false, onPlay: handlePlay }) }))] })] }) }));
};
const ExpandedAlbumListItemWithFetch = ({ item }) => {
    const { data } = useSuspenseQuery(albumQueries.detail({
        query: { id: item.id },
        serverId: item._serverId,
    }));
    const albumData = {
        _serverId: item._serverId,
        albumArtists: data?.albumArtists ?? [],
        id: item.id,
        imageId: item.imageId ?? data?.imageId ?? null,
        name: data?.name ?? '',
        songs: data?.songs ?? null,
    };
    return _jsx(ExpandedAlbumListItemContent, { albumData: albumData });
};
function itemToExpandedAlbumData(item) {
    const songs = item.songs ?? item._playlistSongs;
    if (songs == null)
        return null;
    return {
        _serverId: item._serverId,
        albumArtists: item.albumArtists ?? [],
        id: item.id,
        imageId: item.imageId ?? null,
        name: item.name ?? '',
        songs,
    };
}
export const ExpandedAlbumListItem = (props) => {
    if (props.album != null) {
        return _jsx(ExpandedAlbumListItemContent, { albumData: props.album });
    }
    if (props.item != null) {
        const albumData = itemToExpandedAlbumData(props.item);
        if (albumData != null) {
            return _jsx(ExpandedAlbumListItemContent, { albumData: albumData });
        }
        return (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(ExpandedAlbumListItemWithFetch, { item: props.item }) }));
    }
    return null;
};
