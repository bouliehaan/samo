import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './composer-column.module.css';
import { ColumnNullFallback, ColumnSkeletonVariable, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { JoinedArtists } from '/@/renderer/features/albums/components/joined-artists';
export const ComposerColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const item = rowItem;
    const composers = item?.participants?.composer || [];
    if (composers && Array.isArray(composers) && composers.length > 0) {
        return (_jsx(TableColumnContainer, { ...props, children: _jsx("div", { className: clsx(styles.composersContainer, {
                    [styles.compact]: props.size === 'compact',
                    [styles.large]: props.size === 'large',
                }), children: _jsx(JoinedArtists, { artistName: "", artists: composers, linkProps: { fw: 400, isMuted: true }, rootTextProps: { fw: 400, isMuted: true, size: 'sm' } }) }) }));
    }
    if (composers?.length === 0 || item === null || item === undefined) {
        return _jsx(ColumnNullFallback, { ...props });
    }
    return _jsx(ColumnSkeletonVariable, { ...props });
};
