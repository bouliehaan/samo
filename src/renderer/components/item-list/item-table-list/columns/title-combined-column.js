import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router';
import styles from './title-combined-column.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { getTitlePath } from '/@/renderer/components/item-list/helpers/get-title-path';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { useIsActiveRow } from '/@/renderer/components/item-list/item-table-list/item-table-list-context';
import { JoinedArtists } from '/@/renderer/features/albums/components/joined-artists';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { LONG_PRESS_PLAY_BEHAVIOR, PlayTooltip, } from '/@/renderer/features/shared/components/play-button-group';
import { recordRecentArtist, recordRecentPlaylist, usePlayButtonBehavior } from '/@/renderer/store';
import { ExplicitIndicator } from '/@/shared/components/explicit-indicator/explicit-indicator';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem, } from '/@/shared/types/domain-types';
export const DefaultTitleCombinedColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.id;
    const item = rowItem;
    const internalState = props.internalState;
    const playButtonBehavior = usePlayButtonBehavior();
    const [isHovered, setIsHovered] = useState(false);
    const handlePlay = (playType, event) => {
        if (!item) {
            return;
        }
        // For SONG items, use double click behavior
        if ((props.itemType === LibraryItem.SONG ||
            props.itemType === LibraryItem.PLAYLIST_SONG ||
            item._itemType === LibraryItem.SONG) &&
            props.controls?.onDoubleClick) {
            // Calculate the index based on rowIndex, accounting for header if enabled
            const isHeaderEnabled = !!props.enableHeader;
            const index = isHeaderEnabled ? props.rowIndex - 1 : props.rowIndex;
            props.controls.onDoubleClick({
                event: null,
                index,
                internalState,
                item,
                itemType: props.itemType,
                meta: {
                    playType,
                    singleSongOnly: true,
                },
            });
            return;
        }
        // For other item types, use regular onPlay
        if (!props.controls?.onPlay) {
            return;
        }
        props.controls.onPlay({
            event,
            item,
            itemType: props.itemType,
            playType,
        });
    };
    if (item && 'name' in item && 'imageUrl' in item && 'artists' in item) {
        const rowHeight = props.getRowHeight(props.rowIndex, props);
        const path = getTitlePath(props.itemType, rowItem.id);
        const align = props.columns[props.columnIndex]?.align || 'start';
        const hasAlbumGroupColumn = props.hasAlbumGroupColumn ?? false;
        const item = rowItem;
        const titleLinkProps = path
            ? {
                component: Link,
                isLink: true,
                onClick: () => {
                    if (item._itemType === LibraryItem.ALBUM_ARTIST ||
                        item._itemType === LibraryItem.ARTIST) {
                        recordRecentArtist(item);
                    }
                    else if (item._itemType === LibraryItem.PLAYLIST) {
                        recordRecentPlaylist(item);
                    }
                },
                state: { item },
                to: path,
            }
            : {};
        return (_jsxs(TableColumnContainer, { className: clsx(styles.titleCombined, {
                [styles.noImage]: hasAlbumGroupColumn,
            }), containerStyle: { '--row-height': `${rowHeight}px` }, ...props, children: [!hasAlbumGroupColumn && (_jsxs("div", { className: styles.imageContainer, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [_jsx(ItemImage, { containerClassName: styles.image, enableDebounce: true, enableViewport: false, explicitStatus: item?.explicitStatus, id: item?.imageId, itemType: item?._itemType, src: item?.imageUrl, type: "table" }), isHovered && (_jsx("div", { className: clsx(styles.playButtonOverlay, {
                                [styles.compactPlayButtonOverlay]: props.size === 'compact',
                            }), children: _jsx(PlayTooltip, { disabled: props.itemType === LibraryItem.QUEUE_SONG, type: playButtonBehavior, children: _jsx(PlayButton, { fill: true, onClick: (e) => handlePlay(playButtonBehavior, e), onLongPress: (e) => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[playButtonBehavior], e) }) }) }))] })), _jsxs("div", { className: clsx(styles.textContainer, {
                        [styles.alignCenter]: align === 'center',
                        [styles.alignLeft]: align === 'start',
                        [styles.alignRight]: align === 'end',
                        [styles.compact]: props.size === 'compact',
                    }), children: [_jsxs(Text, { className: styles.title, isNoSelect: true, size: "md", ...titleLinkProps, children: [_jsx(ExplicitIndicator, { explicitStatus: item?.explicitStatus }), item.name] }), _jsx("div", { className: styles.artists, children: _jsx(JoinedArtists, { artistName: item.albumArtist, artists: item.albumArtists, linkProps: { fw: 400, isMuted: true }, rootTextProps: { fw: 400, isMuted: true, size: 'sm' } }) })] })] }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
export const QueueSongTitleCombinedColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem;
    const song = rowItem;
    const item = rowItem;
    const internalState = props.internalState;
    const playButtonBehavior = usePlayButtonBehavior();
    const [isHovered, setIsHovered] = useState(false);
    const isActive = useIsActiveRow(song?.id, song?._uniqueId);
    const handlePlay = (playType, event) => {
        if (!item) {
            return;
        }
        // For SONG items, use double click behavior
        if ((props.itemType === LibraryItem.SONG ||
            props.itemType === LibraryItem.PLAYLIST_SONG ||
            item._itemType === LibraryItem.SONG) &&
            props.controls?.onDoubleClick) {
            // Calculate the index based on rowIndex, accounting for header if enabled
            const isHeaderEnabled = !!props.enableHeader;
            const index = isHeaderEnabled ? props.rowIndex - 1 : props.rowIndex;
            props.controls.onDoubleClick({
                event: null,
                index,
                internalState,
                item,
                itemType: props.itemType,
                meta: {
                    playType,
                    singleSongOnly: true,
                },
            });
            return;
        }
        // For other item types, use regular onPlay
        if (!props.controls?.onPlay) {
            return;
        }
        props.controls.onPlay({
            event,
            item,
            itemType: props.itemType,
            playType,
        });
    };
    if (row && 'name' in row && 'imageUrl' in row && 'artists' in row) {
        const rowHeight = props.getRowHeight(props.rowIndex, props);
        const path = getTitlePath(props.itemType, rowItem.id);
        const align = props.columns[props.columnIndex]?.align || 'start';
        const hasAlbumGroupColumn = props.hasAlbumGroupColumn ?? false;
        const item = rowItem;
        const titleLinkProps = path
            ? {
                component: Link,
                isLink: true,
                state: { item },
                to: path,
            }
            : {};
        return (_jsxs(TableColumnContainer, { className: clsx(styles.titleCombined, {
                [styles.noImage]: hasAlbumGroupColumn,
            }), containerStyle: { '--row-height': `${rowHeight}px` }, ...props, children: [!hasAlbumGroupColumn && (_jsxs("div", { className: styles.imageContainer, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [_jsx(ItemImage, { containerClassName: styles.image, explicitStatus: item?.explicitStatus, id: item?.imageId, itemType: item?._itemType, serverId: item?._serverId, src: item?.imageUrl, type: "table" }), isHovered && (_jsx("div", { className: clsx(styles.playButtonOverlay, {
                                [styles.compactPlayButtonOverlay]: props.size === 'compact',
                            }), children: _jsx(PlayTooltip, { disabled: props.itemType === LibraryItem.QUEUE_SONG, type: playButtonBehavior, children: _jsx(PlayButton, { fill: true, onClick: (e) => handlePlay(playButtonBehavior, e), onLongPress: (e) => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[playButtonBehavior], e) }) }) }))] })), _jsxs("div", { className: clsx(styles.textContainer, {
                        [styles.active]: isActive,
                        [styles.alignCenter]: align === 'center',
                        [styles.alignLeft]: align === 'start',
                        [styles.alignRight]: align === 'end',
                        [styles.compact]: props.size === 'compact',
                    }), children: [_jsxs(Text, { className: clsx({
                                [styles.active]: isActive,
                                [styles.title]: true,
                            }), isNoSelect: true, size: "md", ...titleLinkProps, children: [_jsx(ExplicitIndicator, { explicitStatus: song?.explicitStatus }), row.name, song?.trackSubtitle && props.itemType !== LibraryItem.QUEUE_SONG && (_jsxs(Text, { className: clsx({
                                        [styles.active]: isActive,
                                    }), component: "span", isMuted: true, size: "sm", children: [' (', song.trackSubtitle, ')'] }))] }), _jsx("div", { className: styles.artists, children: _jsx(JoinedArtists, { artistName: item.artistName, artists: item.artists, linkProps: { fw: 400, isMuted: true }, rootTextProps: { fw: 400, isMuted: true, size: 'sm' } }) })] })] }));
    }
    if (rowItem?._itemType === LibraryItem.FOLDER) {
        const rowHeight = props.getRowHeight(props.rowIndex, props);
        const path = getTitlePath(props.itemType, rowItem.id);
        const item = rowItem;
        const textStyles = isActive ? { color: 'var(--theme-colors-primary)' } : {};
        const titleLinkProps = path
            ? {
                component: Link,
                isLink: true,
                state: { item },
                to: path,
            }
            : {};
        const title = rowItem?.name;
        return (_jsxs(TableColumnContainer, { className: styles.titleCombined, containerStyle: { '--row-height': `${rowHeight}px` }, ...props, children: [_jsx(Icon, { className: styles.folderIcon, icon: "folder", size: "2xl" }), _jsx(Text, { className: styles.title, isNoSelect: true, size: "md", ...titleLinkProps, style: textStyles, children: title })] }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
const TitleCombinedColumnBase = (props) => {
    const { itemType } = props;
    switch (itemType) {
        case LibraryItem.FOLDER:
        case LibraryItem.PLAYLIST_SONG:
        case LibraryItem.QUEUE_SONG:
        case LibraryItem.SONG:
            return _jsx(QueueSongTitleCombinedColumn, { ...props });
        default:
            return _jsx(DefaultTitleCombinedColumn, { ...props });
    }
};
export const TitleCombinedColumn = TitleCombinedColumnBase;
