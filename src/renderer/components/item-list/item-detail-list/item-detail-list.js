import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { attachClosestEdge, extractClosestEdge, } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements, } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import throttle from 'lodash/throttle';
import { AnimatePresence } from 'motion/react';
import { useOverlayScrollbars } from 'overlayscrollbars-react';
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, Link } from 'react-router';
import { List, useDynamicRowHeight, useListRef } from 'react-window-v2';
import styles from './item-detail-list.module.css';
import { ItemCardControls } from '/@/renderer/components/item-card/item-card-controls';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { getDraggedItems } from '/@/renderer/components/item-list/helpers/get-dragged-items';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useItemDraggingState, useItemListState, useItemSelectionState, } from '/@/renderer/components/item-list/helpers/item-list-state';
import { parseTableColumns } from '/@/renderer/components/item-list/helpers/parse-table-columns';
import { useListHotkeys } from '/@/renderer/components/item-list/helpers/use-list-hotkeys';
import { getDetailListCellComponent } from '/@/renderer/components/item-list/item-detail-list/columns';
import { getTrackColumnFixed, isNoHorizontalPaddingColumn, shouldShowHoverOnlyColumnContent, } from '/@/renderer/components/item-list/item-detail-list/utils';
import { pickTableColumns, SONG_TABLE_COLUMNS, } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { useItemDragDropState } from '/@/renderer/components/item-list/item-table-list/hooks/use-item-drag-drop-state';
import { columnLabelMap } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { JOINED_ARTISTS_MUTED_PROPS, JoinedArtists, } from '/@/renderer/features/albums/components/joined-artists';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useIsMutatingCreateFavorite } from '/@/renderer/features/shared/mutations/create-favorite-mutation';
import { useIsMutatingDeleteFavorite } from '/@/renderer/features/shared/mutations/delete-favorite-mutation';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { useDragDrop } from '/@/renderer/hooks/use-drag-drop';
import { AppRoute } from '/@/renderer/router/routes';
import { useSettingsStore } from '/@/renderer/store';
import { formatDurationString, formatPartialIsoDateUTC } from '/@/renderer/utils';
import { SEPARATOR_STRING } from '/@/shared/api/utils';
import { ExplicitIndicator } from '/@/shared/components/explicit-indicator/explicit-indicator';
import { Skeleton } from '/@/shared/components/skeleton/skeleton';
import { useDoubleClick } from '/@/shared/hooks/use-double-click';
import { useFocusWithin } from '/@/shared/hooks/use-focus-within';
import { useMergedRef } from '/@/shared/hooks/use-merged-ref';
import { LibraryItem, SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { dndUtils, DragOperation, DragTarget } from '/@/shared/types/drag-and-drop';
import { ItemListKey, Play, TableColumn } from '/@/shared/types/types';
const DEFAULT_ROW_HEIGHT = 300;
const SKELETON_TRACK_ROW_COUNT = 6;
const textAlignFromAlign = (align) => align === 'start' ? 'left' : align === 'end' ? 'right' : 'center';
const TrackRow = memo(({ albumSongs, columns, columnWidthPercents, controls, enableAlternateRowColors, enableHorizontalBorders, enableRowHoverHighlight, enableVerticalBorders, internalState, isMutatingFavorite, isSongsLoading, onSongRowDoubleClick, rowIndex, size, song, }) => {
    const playerContext = usePlayer();
    const { dragRef, isDragging } = useItemDragDropState({
        enableDrag: true,
        internalState,
        isDataRow: true,
        item: song,
        itemType: LibraryItem.SONG,
        playerContext,
    });
    const [isRowHovered, setIsRowHovered] = useState(false);
    const isSelected = useItemSelectionState(internalState, song.id);
    const handleDoubleClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onSongRowDoubleClick) {
            onSongRowDoubleClick({
                index: internalState.findItemIndex(song.id),
                internalState,
                item: song,
            });
            return;
        }
        if (controls?.onDoubleClick) {
            controls.onDoubleClick({
                event: e,
                index: internalState.findItemIndex(song.id),
                internalState,
                item: song,
                itemType: LibraryItem.SONG,
            });
            return;
        }
        if (isSongsLoading || albumSongs.length === 0)
            return;
        internalState.setSelected([song]);
        playerContext.addToQueueByData(albumSongs, Play.NOW, song.id);
    }, [
        albumSongs,
        controls,
        internalState,
        isSongsLoading,
        onSongRowDoubleClick,
        playerContext,
        song,
    ]);
    const handleRowClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
            internalState.toggleSelected(song);
        }
        else if (e.shiftKey) {
            const selectedItems = internalState.getSelected();
            const lastSelectedItem = selectedItems[selectedItems.length - 1];
            if (lastSelectedItem &&
                typeof lastSelectedItem === 'object' &&
                lastSelectedItem !== null) {
                const data = internalState.getData();
                const validData = data.filter((d) => d && typeof d === 'object');
                const lastRowId = internalState.extractRowId(lastSelectedItem);
                if (!lastRowId) {
                    internalState.setSelected([song]);
                    return;
                }
                const lastIndex = internalState.findItemIndex(lastRowId);
                const currentIndex = internalState.findItemIndex(song.id);
                if (lastIndex !== -1 && currentIndex !== -1) {
                    const startIndex = Math.min(lastIndex, currentIndex);
                    const stopIndex = Math.max(lastIndex, currentIndex);
                    const rangeItems = [];
                    for (let i = startIndex; i <= stopIndex; i++) {
                        const rangeItem = validData[i];
                        if (rangeItem &&
                            typeof rangeItem === 'object' &&
                            '_serverId' in rangeItem &&
                            '_itemType' in rangeItem) {
                            const rangeRowId = internalState.extractRowId(rangeItem);
                            if (rangeRowId) {
                                rangeItems.push(rangeItem);
                            }
                        }
                    }
                    const currentSelected = internalState.getSelected();
                    const newSelected = [
                        ...currentSelected.filter((selectedItem) => typeof selectedItem === 'object' && selectedItem !== null),
                    ];
                    rangeItems.forEach((rangeItem) => {
                        const rangeRowId = internalState.extractRowId(rangeItem);
                        if (rangeRowId &&
                            !newSelected.some((selected) => internalState.extractRowId(selected) === rangeRowId)) {
                            newSelected.push(rangeItem);
                        }
                    });
                    internalState.setSelected(newSelected);
                }
                else {
                    internalState.setSelected([song]);
                }
            }
            else {
                internalState.setSelected([song]);
            }
        }
        else {
            const selected = internalState.getSelected();
            const onlyThisSelected = selected.length === 1 &&
                internalState.extractRowId(selected[0]) === song.id;
            internalState.setSelected(onlyThisSelected ? [] : [song]);
        }
    }, [internalState, song]);
    const handleClick = useDoubleClick({
        onDoubleClick: handleDoubleClick,
        onSingleClick: handleRowClick,
    });
    const handleContextMenu = useCallback((event) => {
        if (isSongsLoading || !controls?.onMore)
            return;
        event.preventDefault();
        const index = internalState.findItemIndex(song.id);
        controls.onMore({
            event,
            index,
            internalState,
            item: song,
            itemType: LibraryItem.SONG,
        });
    }, [controls, internalState, isSongsLoading, song]);
    return (_jsx("div", { className: clsx(styles.trackRow, {
            [styles.trackRowAlternateEven]: enableAlternateRowColors && rowIndex % 2 === 0,
            [styles.trackRowAlternateOdd]: enableAlternateRowColors && rowIndex % 2 === 1,
            [styles.trackRowDragging]: isDragging,
            [styles.trackRowHorizontalBorderVisible]: enableHorizontalBorders && rowIndex > 0,
            [styles.trackRowHoverHighlightEnabled]: enableRowHoverHighlight,
            [styles.trackRowSelected]: isSelected,
            [styles.trackRowSizeCompact]: size === 'compact',
            [styles.trackRowSizeDefault]: size === 'default',
            [styles.trackRowSizeLarge]: size === 'large',
            [styles.trackRowWithHorizontalBorder]: rowIndex > 0,
        }), onClick: handleClick, onContextMenu: handleContextMenu, onMouseEnter: () => setIsRowHovered(true), onMouseLeave: () => setIsRowHovered(false), ref: dragRef ?? undefined, role: "row", children: columns.map((col, colIndex) => {
            const percent = columnWidthPercents[colIndex] ?? 0;
            const { fixedWidth, isFixedColumn } = getTrackColumnFixed(col.id);
            const style = {
                flex: isFixedColumn ? `0 0 ${fixedWidth}px` : `${percent} 1 0`,
                minWidth: isFixedColumn ? fixedWidth : 0,
                textAlign: textAlignFromAlign(col.align),
            };
            const CellComponent = getDetailListCellComponent(col.id);
            const isTitleColumn = col.id === TableColumn.TITLE;
            const isImageColumn = col.id === TableColumn.IMAGE;
            const isIconActionColumn = isNoHorizontalPaddingColumn(col.id);
            const showHoverContent = shouldShowHoverOnlyColumnContent(col.id, isRowHovered, song);
            const content = isSongsLoading ? null : showHoverContent ? (_jsx(CellComponent, { columnId: col.id, controls: controls, internalState: internalState, isMutatingFavorite: isMutatingFavorite, isRowHovered: isRowHovered, rowIndex: rowIndex, size: size, song: song })) : ('\u00A0');
            const isLastColumn = colIndex === columns.length - 1;
            return (_jsx("div", { className: clsx(styles.trackCell, {
                    [styles.trackCellImage]: isImageColumn,
                    [styles.trackCellMuted]: !isTitleColumn,
                    [styles.trackCellNoHPadding]: isIconActionColumn,
                    [styles.trackCellVerticalBorderVisible]: enableVerticalBorders && !isLastColumn,
                    [styles.trackCellWithVerticalBorder]: !isLastColumn,
                }), role: "cell", style: style, children: content }, col.id));
        }) }));
});
TrackRow.displayName = 'TrackRow';
const MetadataSection = memo(({ controls, internalState, item }) => {
    const { t } = useTranslation();
    const [isImageHovered, setIsImageHovered] = useState(false);
    const [isMetadataHovered, setIsMetadataHovered] = useState(false);
    const getId = useCallback(() => {
        const draggedItems = getDraggedItems(item, internalState, false);
        return draggedItems.map((i) => i.id);
    }, [item, internalState]);
    const getItem = useCallback(() => {
        return getDraggedItems(item, internalState, false);
    }, [item, internalState]);
    const onDragStart = useCallback(() => {
        const draggedItems = getDraggedItems(item, internalState, false);
        internalState?.setDragging(draggedItems);
    }, [item, internalState]);
    const onDrop = useCallback(() => {
        internalState?.setDragging([]);
    }, [internalState]);
    const drag = useMemo(() => {
        const playlistSongs = item._playlistSongs;
        if (playlistSongs && playlistSongs.length > 0) {
            return {
                getId,
                getItem: () => playlistSongs,
                itemType: LibraryItem.SONG,
                onDragStart,
                onDrop,
                operation: [DragOperation.ADD],
                target: DragTarget.SONG,
            };
        }
        return {
            getId,
            getItem,
            itemType: item._itemType,
            onDragStart,
            onDrop,
            operation: [DragOperation.ADD],
            target: DragTarget.ALBUM,
        };
    }, [getId, getItem, item, onDragStart, onDrop]);
    const { isDragging: isDraggingLocal, ref: dragRef } = useDragDrop({
        drag,
        isEnabled: !!item,
    });
    const isDraggingState = useItemDraggingState(internalState, item.id);
    const isDragging = isDraggingState || isDraggingLocal;
    const handleLinkDragStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);
    const isFavorite = item.userFavorite ?? false;
    const hasRating = false;
    const metadataExtra = useMemo(() => {
        const parts = [];
        let releaseStr = '';
        if (item.releaseDate) {
            if (item.originalDate && item.originalDate !== item.releaseDate) {
                releaseStr = `${formatPartialIsoDateUTC(item.originalDate)}${SEPARATOR_STRING}${formatPartialIsoDateUTC(item.releaseDate)}`;
            }
            else {
                releaseStr = formatPartialIsoDateUTC(item.releaseDate);
            }
        }
        else if (item.releaseYear != null) {
            releaseStr = String(item.releaseYear);
        }
        if (releaseStr)
            parts.push({ content: releaseStr, key: 'release' });
        const songCount = item.songCount ?? 0;
        const duration = item.duration ?? 0;
        const tracksAndDurationParts = [];
        if (songCount > 0) {
            tracksAndDurationParts.push(t('entity.trackWithCount', { count: songCount }));
        }
        if (duration > 0) {
            tracksAndDurationParts.push(formatDurationString(duration));
        }
        const tracksAndDuration = tracksAndDurationParts.join(SEPARATOR_STRING);
        if (tracksAndDuration) {
            parts.push({ content: tracksAndDuration, key: 'tracks' });
        }
        const genres = item.genres?.filter((g) => g.name) ?? [];
        if (genres.length > 0) {
            parts.push({
                content: genres.map((genre, i) => (_jsxs(Fragment, { children: [i > 0 && ', ', _jsx(Link, { className: styles.metadataLink, to: generatePath(AppRoute.LIBRARY_GENRES_DETAIL, {
                                genreId: genre.id,
                            }), children: genre.name })] }, genre.id))),
                key: 'genres',
            });
        }
        return parts.length > 0 ? parts : null;
    }, [item, t]);
    const hasArtist = (item.albumArtistName?.trim()?.length ?? 0) > 0 || (item.albumArtists?.length ?? 0) > 0;
    return (_jsxs("div", { className: styles.metadata, onMouseEnter: () => setIsMetadataHovered(true), onMouseLeave: () => setIsMetadataHovered(false), children: [_jsx("div", { className: clsx(styles.imageWrapperOuter, {
                    [styles.imageWrapperDragging]: isDragging,
                }), ref: dragRef ?? undefined, children: _jsxs(Link, { className: styles.imageWrapper, draggable: false, onDragStart: handleLinkDragStart, onMouseEnter: () => setIsImageHovered(true), onMouseLeave: () => setIsImageHovered(false), state: { item }, to: generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                        albumId: item.id,
                    }), children: [_jsx(ItemImage, { className: styles.image, explicitStatus: item.explicitStatus, id: item.imageId, itemType: item._itemType, serverId: item._serverId, type: "itemCard" }), isFavorite && _jsx("div", { className: styles.favoriteBadge }), hasRating && _jsx("div", { className: styles.ratingBadge }), _jsx(AnimatePresence, { children: controls && isImageHovered && (_jsx(ItemCardControls, { controls: controls, enableExpansion: false, internalState: internalState, item: item, itemType: item._itemType, showRating: false, type: "compact" })) })] }) }), _jsxs(Link, { className: styles.title, state: { item }, to: generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                    albumId: item.id,
                }), children: [_jsx(ExplicitIndicator, { explicitStatus: item.explicitStatus }), item.name] }), _jsx("div", { className: styles.artist, children: !hasArtist ? (_jsx(_Fragment, { children: "\u00A0" })) : (_jsx(JoinedArtists, { artistName: item.albumArtistName ?? '', artists: item.albumArtists ?? [], linkProps: JOINED_ARTISTS_MUTED_PROPS.linkProps, readOnly: !isMetadataHovered, rootTextProps: JOINED_ARTISTS_MUTED_PROPS.rootTextProps })) }), metadataExtra && metadataExtra.length > 0 && (_jsx("div", { className: styles.metadataExtra, children: metadataExtra.map((part) => (_jsx("div", { className: clsx(styles.metadataLine, {
                        [styles.metadataLineClamp2]: part.key === 'genres',
                    }), children: part.content }, part.key))) }))] }));
}, (prev, next) => prev.item === next.item);
MetadataSection.displayName = 'MetadataSection';
const ItemDetailSkeletonRow = memo(({ defaultRowHeight, enableAlternateRowColors, enableHorizontalBorders, enableVerticalBorders, trackTableSize, }) => {
    const heightStyle = {
        height: defaultRowHeight,
        minHeight: defaultRowHeight,
        overflow: 'hidden',
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.skeletonColumnWrapper, style: heightStyle, children: _jsx("div", { className: styles.left, children: _jsxs("div", { className: styles.metadata, children: [_jsx(Skeleton, { className: styles.skeletonImage, containerClassName: styles.skeletonImageContainer }), _jsx(Skeleton, { className: styles.skeletonTitle, containerClassName: styles.skeletonTitleContainer }), _jsx(Skeleton, { className: styles.skeletonArtist, containerClassName: styles.skeletonArtistContainer })] }) }) }), _jsx("div", { className: styles.skeletonColumnWrapper, style: heightStyle, children: _jsx("div", { className: styles.right, children: _jsx("div", { className: styles.tracksTable, role: "table", children: Array.from({ length: SKELETON_TRACK_ROW_COUNT }).map((_, i) => (_jsx("div", { className: clsx(styles.trackRow, {
                                [styles.trackRowAlternateEven]: enableAlternateRowColors && i % 2 === 0,
                                [styles.trackRowAlternateOdd]: enableAlternateRowColors && i % 2 === 1,
                                [styles.trackRowHorizontalBorderVisible]: enableHorizontalBorders && i > 0,
                                [styles.trackRowSizeCompact]: trackTableSize === 'compact',
                                [styles.trackRowSizeDefault]: trackTableSize === 'default',
                                [styles.trackRowSizeLarge]: trackTableSize === 'large',
                                [styles.trackRowWithHorizontalBorder]: i > 0,
                            }), role: "row", children: _jsx("div", { className: clsx(styles.trackCell, {
                                    [styles.trackCellVerticalBorderVisible]: enableVerticalBorders,
                                    [styles.trackCellWithVerticalBorder]: true,
                                }), role: "cell", style: { flex: 1, minWidth: 0 } }) }, i))) }) }) })] }));
});
ItemDetailSkeletonRow.displayName = 'ItemDetailSkeletonRow';
const RowContent = memo(({ columnWidthPercents, controls, data, defaultRowHeight, enableAlternateRowColors, enableHorizontalBorders, enableRowHoverHighlight, enableVerticalBorders, getItem, index, internalState, isMutatingFavorite, onSongRowDoubleClick, registerSongs, songsByAlbumId, trackColumns, trackTableSize, }) => {
    const item = useMemo(() => {
        if (getItem) {
            return getItem(index);
        }
        return data?.[index] || undefined;
    }, [data, getItem, index]);
    const useClientSideSongs = Boolean(songsByAlbumId);
    const songListQuery = useMemo(() => {
        if (useClientSideSongs || !item?.id || !item?._serverId)
            return null;
        return {
            query: {
                albumIds: [item.id],
                limit: -1,
                sortBy: SongListSort.ALBUM,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId: item?._serverId || '',
        };
    }, [item, useClientSideSongs]);
    const { data: songListData, isLoading: isSongsQueryLoading } = useQuery({
        enabled: !!songListQuery,
        ...(songListQuery
            ? songsQueries.list(songListQuery)
            : {
                queryFn: async () => ({ items: [], startIndex: 0, totalRecordCount: 0 }),
                queryKey: ['item-detail', 'list', 'disabled'],
            }),
    });
    const songItemsFromQuery = songListData?.items;
    const songItemsFromClient = useMemo(() => {
        const rowSongs = item?._playlistSongs;
        if (rowSongs?.length)
            return rowSongs;
        if (!songsByAlbumId || !item?.id)
            return undefined;
        return songsByAlbumId[item.id];
    }, [item, songsByAlbumId]);
    const songItems = useClientSideSongs ? songItemsFromClient : songItemsFromQuery;
    const isSongsLoading = !useClientSideSongs && !!item && isSongsQueryLoading && !songItemsFromQuery?.length;
    const songs = useMemo(() => {
        return (songItems ||
            Array.from({ length: item?.songCount || 0 }, (_, i) => ({
                duration: 0,
                id: `${item?.id}-${i}`,
                name: '',
                trackNumber: i + 1,
            })));
    }, [songItems, item?.id, item?.songCount]);
    useEffect(() => {
        if (item?.id && songItems?.length) {
            registerSongs(item.id, songItems);
        }
    }, [item?.id, registerSongs, songItems]);
    if (!item) {
        return (_jsx(ItemDetailSkeletonRow, { defaultRowHeight: defaultRowHeight, enableAlternateRowColors: enableAlternateRowColors, enableHorizontalBorders: enableHorizontalBorders, enableVerticalBorders: enableVerticalBorders, trackTableSize: trackTableSize }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.left, children: _jsx(MetadataSection, { controls: controls, internalState: internalState, item: item }) }), _jsx("div", { className: styles.right, children: _jsx("div", { className: styles.tracksTable, role: "table", children: songs.map((song, rowIndex) => (_jsx(TrackRow, { albumSongs: songItems ? songItems : [], columns: trackColumns, columnWidthPercents: columnWidthPercents, controls: controls, enableAlternateRowColors: enableAlternateRowColors, enableHorizontalBorders: enableHorizontalBorders, enableRowHoverHighlight: enableRowHoverHighlight, enableVerticalBorders: enableVerticalBorders, internalState: internalState, isMutatingFavorite: isMutatingFavorite, isSongsLoading: isSongsLoading, onSongRowDoubleClick: onSongRowDoubleClick, rowIndex: rowIndex, size: trackTableSize, song: song }, song.id))) }) })] }));
}, (prev, next) => prev.index === next.index &&
    prev.data === next.data &&
    prev.columnWidthPercents === next.columnWidthPercents &&
    prev.defaultRowHeight === next.defaultRowHeight &&
    prev.enableAlternateRowColors === next.enableAlternateRowColors &&
    prev.enableHorizontalBorders === next.enableHorizontalBorders &&
    prev.enableRowHoverHighlight === next.enableRowHoverHighlight &&
    prev.enableVerticalBorders === next.enableVerticalBorders &&
    prev.getItem === next.getItem &&
    prev.internalState === next.internalState &&
    prev.isMutatingFavorite === next.isMutatingFavorite &&
    prev.controls === next.controls &&
    prev.registerSongs === next.registerSongs &&
    prev.songsByAlbumId === next.songsByAlbumId &&
    prev.trackColumns === next.trackColumns &&
    prev.trackTableSize === next.trackTableSize);
RowContent.displayName = 'RowContent';
const RowComponent = memo((props) => {
    const { style, ...rowContentProps } = props;
    return (_jsx("div", { className: styles.row, style: style, children: _jsx(RowContent, { ...rowContentProps }) }));
});
RowComponent.displayName = 'ItemDetailRow';
const DetailListHeaderCell = memo(({ columnId, columnWidthPercents, enableColumnResize, onColumnReordered, onColumnResized, tableId, trackColumns, }) => {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggedOver, setIsDraggedOver] = useState(null);
    const colIndex = trackColumns.findIndex((c) => c.id === columnId);
    const col = colIndex >= 0 ? trackColumns[colIndex] : null;
    const percent = col ? (columnWidthPercents[colIndex] ?? 0) : 0;
    const { fixedWidth, isFixedColumn } = getTrackColumnFixed(columnId);
    const currentWidth = col?.width ?? (fixedWidth || 100);
    const showResizeHandle = enableColumnResize && !isFixedColumn;
    useEffect(() => {
        if (!containerRef.current || !onColumnReordered) {
            return;
        }
        const handleReorder = (columnIdFrom, columnIdTo, edge) => {
            onColumnReordered({ columnIdFrom, columnIdTo, edge });
        };
        return combine(draggable({
            element: containerRef.current,
            getInitialData: () => {
                const data = dndUtils.generateDragData({
                    id: [columnId],
                    operation: [DragOperation.REORDER],
                    type: DragTarget.TABLE_COLUMN,
                }, { tableId });
                return data;
            },
            onDragStart: () => setIsDragging(true),
            onDrop: () => setIsDragging(false),
            onGenerateDragPreview: (data) => {
                disableNativeDragPreview({ nativeSetDragImage: data.nativeSetDragImage });
            },
        }), dropTargetForElements({
            canDrop: (args) => {
                const data = args.source.data;
                const sourceTableId = data.metadata?.tableId;
                const isSelf = args.source.data.id[0] === columnId;
                const isSameTable = sourceTableId === tableId;
                return (dndUtils.isDropTarget(data.type, [DragTarget.TABLE_COLUMN]) &&
                    !isSelf &&
                    isSameTable);
            },
            element: containerRef.current,
            getData: ({ element, input }) => {
                const data = dndUtils.generateDragData({
                    id: [columnId],
                    operation: [DragOperation.REORDER],
                    type: DragTarget.TABLE_COLUMN,
                }, { tableId });
                return attachClosestEdge(data, {
                    allowedEdges: ['left', 'right'],
                    element,
                    input,
                });
            },
            onDrag: (args) => {
                const closestEdgeOfTarget = extractClosestEdge(args.self.data);
                setIsDraggedOver(closestEdgeOfTarget);
            },
            onDragLeave: () => setIsDraggedOver(null),
            onDrop: (args) => {
                const closestEdgeOfTarget = extractClosestEdge(args.self.data);
                const from = args.source.data.id;
                const to = args.self.data.id;
                handleReorder(from[0], to[0], closestEdgeOfTarget);
                setIsDraggedOver(null);
            },
        }));
    }, [columnId, onColumnReordered, tableId]);
    const style = {
        flex: isFixedColumn ? `0 0 ${fixedWidth}px` : `${percent} 1 0`,
        justifyContent: colTypeToJustifyContentMap[col?.align ?? 'start'],
        minWidth: isFixedColumn ? fixedWidth : 0,
        textAlign: colTypeToAlignMap[col?.align ?? 'start'],
    };
    const handleResize = useCallback((id, width) => {
        onColumnResized?.(id, width);
    }, [onColumnResized]);
    return (_jsxs("div", { className: clsx(styles.trackHeaderCell, {
            [styles.trackHeaderCellDraggedOverLeft]: isDraggedOver === 'left',
            [styles.trackHeaderCellDraggedOverRight]: isDraggedOver === 'right',
            [styles.trackHeaderCellDragging]: isDragging,
            [styles.trackHeaderCellNoHPadding]: isNoHorizontalPaddingColumn(columnId),
        }), ref: containerRef, role: "columnheader", style: style, children: [columnLabelMap[columnId] ?? '', showResizeHandle && (_jsx(DetailListColumnResizeHandle, { columnId: columnId, disabled: !!col?.autoSize, initialWidth: currentWidth, onResize: handleResize, side: "right" }))] }));
});
DetailListHeaderCell.displayName = 'DetailListHeaderCell';
const DetailListColumnResizeHandle = ({ columnId, disabled = false, initialWidth, onResize, side, }) => {
    const [isDragging, setIsDragging] = useState(false);
    const handleRef = useRef(null);
    const startWidthRef = useRef(initialWidth);
    const startXRef = useRef(0);
    const finalWidthRef = useRef(initialWidth);
    useEffect(() => {
        if (!isDragging) {
            startWidthRef.current = initialWidth;
        }
    }, [initialWidth, isDragging]);
    useEffect(() => {
        if (!isDragging)
            return;
        const handleMouseMove = (event) => {
            const deltaX = event.clientX - startXRef.current;
            const newWidth = Math.min(Math.max(10, startWidthRef.current + deltaX), 1000);
            finalWidthRef.current = newWidth;
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            onResize(columnId, finalWidthRef.current);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, columnId, onResize]);
    const handleMouseDown = (event) => {
        if (disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
        startWidthRef.current = initialWidth;
        startXRef.current = event.clientX;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };
    return (_jsx("div", { className: clsx(styles.resizeHandle, {
            [styles.resizeHandleDisabled]: disabled,
            [styles.resizeHandleDragging]: isDragging,
            [styles.resizeHandleLeft]: side === 'left',
            [styles.resizeHandleRight]: side === 'right',
        }), onMouseDown: handleMouseDown, ref: handleRef }));
};
const colTypeToAlignMap = {
    center: 'center',
    end: 'right',
    start: 'left',
};
const colTypeToJustifyContentMap = {
    center: 'center',
    end: 'flex-end',
    start: 'flex-start',
};
const DetailListHeader = memo(({ columnWidthPercents, enableColumnReorder, enableColumnResize, enableVerticalBorders, headerLeftRef, onColumnReordered, onColumnResized, tableId, trackColumns, trackTableSize, }) => {
    return (_jsxs("header", { className: styles.detailListHeader, role: "rowgroup", children: [_jsx("div", { className: styles.headerLeft, children: _jsx("span", { className: styles.headerLeftAlbumName, "data-title": "", ref: headerLeftRef }) }), _jsx("div", { className: styles.headerRight, children: _jsx("div", { className: clsx(styles.tracksTableHeader, {
                        [styles.tracksTableHeaderSizeCompact]: trackTableSize === 'compact',
                        [styles.tracksTableHeaderSizeDefault]: trackTableSize === 'default',
                        [styles.tracksTableHeaderSizeLarge]: trackTableSize === 'large',
                    }), role: "row", children: trackColumns.map((col, colIndex) => {
                        const isLastColumn = colIndex === trackColumns.length - 1;
                        if ((enableColumnResize && onColumnResized) ||
                            (enableColumnReorder && onColumnReordered)) {
                            return (_jsx(DetailListHeaderCell, { columnId: col.id, columnWidthPercents: columnWidthPercents, enableColumnResize: enableColumnResize, enableVerticalBorders: enableVerticalBorders, isLastColumn: isLastColumn, onColumnReordered: onColumnReordered, onColumnResized: onColumnResized, tableId: tableId, trackColumns: trackColumns }, col.id));
                        }
                        const percent = columnWidthPercents[colIndex] ?? 0;
                        const { fixedWidth, isFixedColumn } = getTrackColumnFixed(col.id);
                        const style = {
                            flex: isFixedColumn ? `0 0 ${fixedWidth}px` : `${percent} 1 0`,
                            justifyContent: colTypeToJustifyContentMap[col.align],
                            minWidth: isFixedColumn ? fixedWidth : 0,
                            textAlign: colTypeToAlignMap[col.align],
                        };
                        return (_jsx("div", { className: clsx(styles.trackHeaderCell, {
                                [styles.trackHeaderCellNoHPadding]: isNoHorizontalPaddingColumn(col.id),
                            }), role: "columnheader", style: style, children: _jsx("span", { className: styles.trackHeaderCellContent, children: columnLabelMap[col.id] ?? '' }) }, col.id));
                    }) }) })] }));
});
DetailListHeader.displayName = 'DetailListHeader';
const SCROLL_END_DEBOUNCE_MS = 150;
const DEFAULT_DETAIL_TABLE_ID = 'album-detail';
export const ItemDetailList = ({ currentPage, data, enableHeader = true, getItem, itemCount: externalItemCount, items, listKey = ItemListKey.ALBUM, onColumnReordered, onColumnResized, onRangeChanged, onScrollEnd, onSongRowDoubleClick, overrideControls, songsByAlbumId, tableId = DEFAULT_DETAIL_TABLE_ID, }) => {
    const containerRef = useRef(null);
    const listRef = useListRef(null);
    const { focused, ref: focusRef } = useFocusWithin();
    const mergedContainerRef = useMergedRef(containerRef, focusRef);
    const lastVisibleStartIndexRef = useRef(0);
    const queryClient = useQueryClient();
    const controls = useDefaultItemListControls({
        onColumnReordered,
        onColumnResized,
        overrides: overrideControls,
    });
    const isMutatingCreateFavorite = useIsMutatingCreateFavorite();
    const isMutatingDeleteFavorite = useIsMutatingDeleteFavorite();
    const isMutatingFavorite = isMutatingCreateFavorite || isMutatingDeleteFavorite;
    const rowHeight = useDynamicRowHeight({
        defaultRowHeight: DEFAULT_ROW_HEIGHT,
    });
    const isInfinite = data !== undefined || getItem !== undefined;
    const isPaginated = items !== undefined || currentPage !== undefined;
    const dataSource = useMemo(() => {
        if (isInfinite && data) {
            return data;
        }
        if (isPaginated && items) {
            return items;
        }
        return [];
    }, [data, isInfinite, isPaginated, items]);
    const itemCount = useMemo(() => {
        if (externalItemCount !== undefined) {
            return externalItemCount;
        }
        return dataSource.length;
    }, [dataSource.length, externalItemCount]);
    // Accumulate songs from each row for selection/drag state (keyed by album id)
    const songsByAlbumRef = useRef(new Map());
    const registerSongs = useCallback((albumId, songs) => {
        songsByAlbumRef.current.set(albumId, songs);
    }, []);
    // Flattened songs in album order for ItemListState (selection/drag are per-song)
    const getDataFn = useCallback(() => {
        const map = songsByAlbumRef.current;
        return dataSource.flatMap((album) => map.get(album.id) ?? []);
    }, [dataSource]);
    const extractRowIdSong = useCallback((item) => item.id, []);
    const internalState = useItemListState(getDataFn, extractRowIdSong);
    const tableConfig = useSettingsStore((state) => state.lists[listKey]?.detail);
    const trackColumns = useMemo(() => {
        const raw = tableConfig?.columns;
        if (raw && raw.length > 0) {
            return parseTableColumns(raw).filter((column) => column.id !== TableColumn.USER_RATING);
        }
        return pickTableColumns({
            columns: SONG_TABLE_COLUMNS,
            enabledColumns: [
                TableColumn.TRACK_NUMBER,
                TableColumn.TITLE,
                TableColumn.DURATION,
                TableColumn.USER_FAVORITE,
            ],
        });
    }, [tableConfig?.columns]);
    const trackTableSize = tableConfig?.size ?? 'default';
    const enableRowHoverHighlight = tableConfig?.enableRowHoverHighlight ?? true;
    const enableAlternateRowColors = tableConfig?.enableAlternateRowColors ?? false;
    const enableHorizontalBorders = tableConfig?.enableHorizontalBorders ?? false;
    const enableVerticalBorders = tableConfig?.enableVerticalBorders ?? false;
    const columnWidthPercents = useMemo(() => {
        const total = trackColumns.reduce((sum, c) => sum + c.width, 0);
        if (total <= 0) {
            return trackColumns.map(() => 100 / Math.max(1, trackColumns.length));
        }
        return trackColumns.map((c) => (c.width / total) * 100);
    }, [trackColumns]);
    const headerLeftRef = useRef(null);
    const dataSourceRef = useRef(dataSource);
    dataSourceRef.current = dataSource;
    const lastHeaderNameRef = useRef('');
    const handleRowsRendered = useCallback((range) => {
        lastVisibleStartIndexRef.current = range.startIndex;
        const el = headerLeftRef.current;
        if (el) {
            const album = (getItem ? getItem(range.startIndex) : dataSourceRef.current[range.startIndex]);
            const name = album?.name ?? '';
            if (name) {
                lastHeaderNameRef.current = name;
                el.textContent = name;
                el.setAttribute('data-title', name);
                el.title = name;
            }
            else {
                el.textContent = lastHeaderNameRef.current;
                el.setAttribute('data-title', lastHeaderNameRef.current);
                el.title = lastHeaderNameRef.current;
            }
        }
        if (onRangeChanged) {
            onRangeChanged(range);
        }
    }, [getItem, onRangeChanged]);
    const throttledHandleRowsRendered = useMemo(() => throttle(handleRowsRendered, 150, {
        leading: true,
        trailing: true,
    }), [handleRowsRendered]);
    useEffect(() => {
        return () => {
            throttledHandleRowsRendered.cancel();
        };
    }, [throttledHandleRowsRendered]);
    const rowProps = useMemo(() => ({
        columnWidthPercents,
        controls,
        data: dataSource,
        defaultRowHeight: DEFAULT_ROW_HEIGHT,
        enableAlternateRowColors,
        enableHorizontalBorders,
        enableRowHoverHighlight,
        enableVerticalBorders,
        getItem,
        internalState,
        isMutatingFavorite,
        onSongRowDoubleClick,
        queryClient,
        registerSongs,
        songsByAlbumId,
        trackColumns,
        trackTableSize,
    }), [
        columnWidthPercents,
        controls,
        dataSource,
        enableAlternateRowColors,
        enableHorizontalBorders,
        enableRowHoverHighlight,
        enableVerticalBorders,
        getItem,
        internalState,
        isMutatingFavorite,
        onSongRowDoubleClick,
        queryClient,
        registerSongs,
        songsByAlbumId,
        trackColumns,
        trackTableSize,
    ]);
    const [initialize, osInstance] = useOverlayScrollbars({
        defer: false,
        events: {
            initialized(osInstance) {
                const { viewport } = osInstance.elements();
                viewport.style.overflowX = `var(--os-viewport-overflow-x)`;
            },
        },
        options: {
            overflow: { x: 'hidden', y: 'scroll' },
            paddingAbsolute: true,
            scrollbars: {
                autoHide: 'leave',
                autoHideDelay: 500,
                pointers: ['mouse', 'pen', 'touch'],
                theme: 'samo-os-scrollbar',
                visibility: 'visible',
            },
        },
    });
    useListHotkeys({
        controls,
        focused,
        internalState,
        itemType: LibraryItem.SONG,
    });
    useEffect(() => {
        const { current: container } = containerRef;
        if (!container || !container.firstElementChild) {
            return;
        }
        const viewport = container.firstElementChild;
        initialize({
            elements: { viewport },
            target: container,
        });
        let scrollEndTimeoutId = null;
        const handleScroll = () => {
            if (scrollEndTimeoutId)
                clearTimeout(scrollEndTimeoutId);
            scrollEndTimeoutId = setTimeout(() => {
                scrollEndTimeoutId = null;
                onScrollEnd?.(lastVisibleStartIndexRef.current);
            }, SCROLL_END_DEBOUNCE_MS);
        };
        if (onScrollEnd) {
            viewport.addEventListener('scroll', handleScroll, { passive: true });
        }
        return () => {
            if (onScrollEnd) {
                viewport.removeEventListener('scroll', handleScroll);
                if (scrollEndTimeoutId)
                    clearTimeout(scrollEndTimeoutId);
            }
            osInstance()?.destroy();
        };
    }, [initialize, onScrollEnd, osInstance]);
    return (_jsxs("div", { className: styles.wrapper, children: [enableHeader && (_jsx(DetailListHeader, { columnWidthPercents: columnWidthPercents, enableColumnReorder: !!onColumnReordered, enableColumnResize: !!controls.onColumnResized, enableVerticalBorders: enableVerticalBorders, headerLeftRef: headerLeftRef, onColumnReordered: controls.onColumnReordered, onColumnResized: controls.onColumnResized
                    ? (columnId, width) => controls.onColumnResized?.({ columnId, width })
                    : undefined, tableId: tableId, trackColumns: trackColumns, trackTableSize: trackTableSize })), _jsx("div", { className: styles.container, ref: mergedContainerRef, children: _jsx(List, { listRef: listRef, onRowsRendered: throttledHandleRowsRendered, rowComponent: RowComponent, rowCount: itemCount, rowHeight: rowHeight, rowProps: rowProps }) })] }));
};
