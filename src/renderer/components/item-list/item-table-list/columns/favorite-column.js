import { jsx as _jsx } from "react/jsx-runtime";
import { TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { useIsMutatingCreateFavorite } from '/@/renderer/features/shared/mutations/create-favorite-mutation';
import { useIsMutatingDeleteFavorite } from '/@/renderer/features/shared/mutations/delete-favorite-mutation';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const FavoriteColumn = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.[props.columns[props.columnIndex].id];
    const isMutatingCreateFavorite = useIsMutatingCreateFavorite();
    const isMutatingDeleteFavorite = useIsMutatingDeleteFavorite();
    const isMutatingFavorite = isMutatingCreateFavorite || isMutatingDeleteFavorite;
    if (typeof row === 'boolean') {
        return (_jsx(TableColumnContainer, { ...props, children: _jsx(ActionIcon, { className: row ? undefined : 'hover-only', disabled: isMutatingFavorite, icon: "favorite", iconProps: {
                    color: row ? 'primary' : 'muted',
                    fill: row ? 'primary' : undefined,
                    size: 'md',
                }, onClick: (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    const item = rowItem;
                    const rowId = props.internalState.extractRowId(item);
                    const index = rowId ? props.internalState.findItemIndex(rowId) : -1;
                    props.controls.onFavorite?.({
                        event,
                        favorite: !row,
                        index,
                        internalState: props.internalState,
                        item,
                        itemType: props.itemType,
                    });
                }, onDoubleClick: (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                }, size: "xs", variant: "subtle" }) }));
    }
    return _jsx(TableColumnContainer, { ...props, children: "\u00A0" });
};
