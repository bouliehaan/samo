import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { Fragment, useMemo } from 'react';
import { generatePath, Link } from 'react-router';
import styles from './album-artists-column.module.css';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { JoinedArtists } from '/@/renderer/features/albums/components/joined-artists';
import { AppRoute } from '/@/renderer/router/routes';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
const AlbumArtistsColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const artists = useMemo(() => {
        if (!row)
            return [];
        return row.map((artist) => {
            const path = generatePath(AppRoute.LIBRARY_ARTISTS_DETAIL, {
                artistId: artist.id,
            });
            return { ...artist, path };
        });
    }, [row]);
    if (Array.isArray(row)) {
        return (_jsx(TableColumnContainer, { ...props, children: _jsx("div", { className: clsx(styles.artistsContainer, {
                    [styles.compact]: props.size === 'compact',
                    [styles.large]: props.size === 'large',
                }), children: artists.map((artist, index) => (_jsxs(Fragment, { children: [_jsx(Text, { component: Link, isLink: true, isMuted: true, isNoSelect: true, state: { item: artist }, to: artist.path, children: artist.name }), index < artists.length - 1 && ', '] }, artist.id))) }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
const SongArtistsColumn = (props) => {
    const row = (props.getRowItem?.(props.rowIndex) ??
        props.data[props.rowIndex]);
    if (row) {
        return (_jsx(TableColumnContainer, { ...props, children: _jsx("div", { className: clsx(styles.artistsContainer, {
                    [styles.compact]: props.size === 'compact',
                    [styles.large]: props.size === 'large',
                }), children: _jsx(JoinedArtists, { artistName: row.artistName, artists: row.artists, linkProps: { fw: 400, isMuted: true }, rootTextProps: { fw: 400, isMuted: true, size: 'sm' } }) }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
const BaseArtistsColumn = (props) => {
    const { itemType } = props;
    switch (itemType) {
        case LibraryItem.ALBUM:
            return _jsx(AlbumArtistsColumn, { ...props });
        default:
            return _jsx(SongArtistsColumn, { ...props });
    }
};
export { BaseArtistsColumn as ArtistsColumn };
