import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './album-artists-column.module.css';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { JoinedArtists } from '/@/renderer/features/albums/components/joined-artists';
const AlbumArtistsColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const item = rowItem;
    const albumArtistString = item && 'albumArtistName' in item ? item.albumArtistName : '';
    if (Array.isArray(row)) {
        return (_jsx(TableColumnContainer, { ...props, children: _jsx("div", { className: clsx(styles.artistsContainer, {
                    [styles.compact]: props.size === 'compact',
                    [styles.large]: props.size === 'large',
                }), children: _jsx(JoinedArtists, { artistName: albumArtistString, artists: row, linkProps: { fw: 400, isMuted: true }, rootTextProps: {
                        className: clsx(styles.artistsContainer, {
                            [styles.compact]: props.size === 'compact',
                            [styles.large]: props.size === 'large',
                        }),
                        fw: 400,
                        isMuted: true,
                        size: 'sm',
                    } }) }) }));
    }
    if (row === null) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
export { AlbumArtistsColumn };
