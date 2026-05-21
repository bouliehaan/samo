import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback } from 'react';
import { AlbumGroupHeader } from '/@/renderer/components/item-list/item-table-list/album-group-header';
import { isLastInAlbumGroup, TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
export const AlbumGroupColumn = (props) => {
    const firstDataRow = props.enableHeader ? 1 : 0;
    const item = props.getRowItem?.(props.rowIndex);
    const handlePlay = useCallback((playType) => {
        if (!item || !props.controls?.onDoubleClick)
            return;
        const isHeaderEnabled = !!props.enableHeader;
        const index = isHeaderEnabled ? props.rowIndex - 1 : props.rowIndex;
        props.controls.onDoubleClick({
            event: null,
            index,
            internalState: props.internalState,
            item,
            itemType: props.itemType,
            meta: { playType },
        });
    }, [item, props]);
    if (!item?.album) {
        return _jsx("div", { style: props.style });
    }
    // Check if this is the first row of a new album group (by album name)
    let isFirstInGroup = true;
    if (props.rowIndex > firstDataRow) {
        const prevItem = props.getRowItem?.(props.rowIndex - 1);
        // If prevItem is undefined (not loaded yet), assume same group to avoid duplicates
        if (prevItem === undefined || prevItem?.album === item.album) {
            isFirstInGroup = false;
        }
    }
    if (!isFirstInGroup) {
        // For non-first rows, add border-bottom on the last row of the group
        const needsBorder = props.enableHorizontalBorders &&
            isLastInAlbumGroup(props.rowIndex, props.getRowItem, !!props.enableHeader, props.data.length);
        return (_jsx("div", { style: {
                ...props.style,
                ...(needsBorder
                    ? { borderBottom: '1px solid var(--theme-colors-border)' }
                    : {}),
            } }));
    }
    let groupRowCount = 1;
    const totalDataRows = props.data.length + firstDataRow;
    for (let idx = props.rowIndex + 1; idx < totalDataRows; idx++) {
        const nextItem = props.getRowItem?.(idx);
        if (!nextItem || nextItem.album !== item.album)
            break;
        groupRowCount++;
    }
    return (_jsx(TableColumnContainer, { ...props, enableAlternateRowColors: false, children: _jsx(AlbumGroupHeader, { groupRowCount: groupRowCount, onPlay: handlePlay, size: props.size === 'default' ? 'normal' : props.size, song: item }) }));
};
