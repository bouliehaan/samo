import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { Link } from 'react-router';
import styles from './title-artist-column.module.css';
import { getTitlePath } from '/@/renderer/components/item-list/helpers/get-title-path';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { useIsActiveRow } from '/@/renderer/components/item-list/item-table-list/item-table-list-context';
import { JoinedArtists } from '/@/renderer/features/albums/components/joined-artists';
import { ExplicitIndicator } from '/@/shared/components/explicit-indicator/explicit-indicator';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
export const DefaultTitleArtistColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.id;
    const item = rowItem;
    const align = props.columns[props.columnIndex]?.align || 'start';
    if (item && 'name' in item && 'artists' in item) {
        const rowHeight = props.getRowHeight(props.rowIndex, props);
        const path = getTitlePath(props.itemType, rowItem.id);
        const item = rowItem;
        const titleLinkProps = path
            ? {
                component: Link,
                isLink: true,
                state: { item },
                to: path,
            }
            : {};
        return (_jsx(TableColumnContainer, { className: clsx(styles.titleArtist), containerStyle: { '--row-height': `${rowHeight}px` }, ...props, children: _jsxs("div", { className: clsx(styles.textContainer, {
                    [styles.alignCenter]: align === 'center',
                    [styles.alignLeft]: align === 'start',
                    [styles.alignRight]: align === 'end',
                    [styles.compact]: props.size === 'compact',
                }), children: [_jsxs(Text, { className: styles.title, isNoSelect: true, size: "md", ...titleLinkProps, children: [_jsx(ExplicitIndicator, { explicitStatus: item?.explicitStatus }), item.name] }), _jsx("div", { className: styles.artists, children: _jsx(JoinedArtists, { artistName: item.albumArtist, artists: item.albumArtists, linkProps: { fw: 400, isMuted: true }, rootTextProps: { fw: 400, isMuted: true, size: 'sm' } }) })] }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
export const QueueSongTitleArtistColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem;
    const song = rowItem;
    const isActive = useIsActiveRow(song?.id, song?._uniqueId);
    const align = props.columns[props.columnIndex]?.align || 'start';
    const alignClass = align === 'center' ? 'align-center' : align === 'end' ? 'align-right' : 'align-left';
    if (row && 'name' in row && 'artists' in row) {
        const rowHeight = props.getRowHeight(props.rowIndex, props);
        const path = getTitlePath(props.itemType, rowItem.id);
        const item = rowItem;
        const titleLinkProps = path
            ? {
                component: Link,
                isLink: true,
                state: { item },
                to: path,
            }
            : {};
        return (_jsx(TableColumnContainer, { className: clsx(styles.titleArtist, styles[alignClass]), containerStyle: { '--row-height': `${rowHeight}px` }, ...props, children: _jsxs("div", { className: clsx(styles.textContainer, styles[alignClass], {
                    [styles.active]: isActive,
                    [styles.compact]: props.size === 'compact',
                }), children: [_jsxs(Text, { className: clsx({
                            [styles.active]: isActive,
                            [styles.title]: true,
                        }), isNoSelect: true, size: "md", ...titleLinkProps, children: [_jsx(ExplicitIndicator, { explicitStatus: song?.explicitStatus }), row.name, song?.trackSubtitle && props.itemType !== LibraryItem.QUEUE_SONG && (_jsxs(Text, { className: clsx({
                                    [styles.active]: isActive,
                                }), component: "span", isMuted: true, size: "sm", children: [' (', song.trackSubtitle, ')'] }))] }), _jsx("div", { className: styles.artists, children: _jsx(JoinedArtists, { artistName: item.artistName, artists: item.artists, linkProps: { fw: 400, isMuted: true }, rootTextProps: { fw: 400, isMuted: true, size: 'sm' } }) })] }) }));
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
        return (_jsxs(TableColumnContainer, { className: clsx(styles.titleArtist, styles[alignClass]), containerStyle: { '--row-height': `${rowHeight}px` }, ...props, children: [_jsx(Icon, { className: styles.folderIcon, icon: "folder", size: "2xl" }), _jsx(Text, { className: styles.title, isNoSelect: true, size: "md", ...titleLinkProps, style: textStyles, children: title })] }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
const TitleArtistColumnBase = (props) => {
    const { itemType } = props;
    switch (itemType) {
        case LibraryItem.FOLDER:
        case LibraryItem.PLAYLIST_SONG:
        case LibraryItem.QUEUE_SONG:
        case LibraryItem.SONG:
            return _jsx(QueueSongTitleArtistColumn, { ...props });
        default:
            return _jsx(DefaultTitleArtistColumn, { ...props });
    }
};
export const TitleArtistColumn = TitleArtistColumnBase;
