import { jsx as _jsx } from "react/jsx-runtime";
import { TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const ActionsColumn = (props) => {
    const row = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const handleActionClick = (event) => {
        event.stopPropagation();
        event.preventDefault();
        if (row !== undefined) {
            const item = row;
            const rowId = props.internalState.extractRowId(item);
            const index = rowId ? props.internalState.findItemIndex(rowId) : -1;
            props.controls.onMore?.({
                event,
                index,
                internalState: props.internalState,
                item,
                itemType: props.itemType,
            });
        }
    };
    const handleActionDoubleClick = (event) => {
        event.stopPropagation();
        event.preventDefault();
    };
    if (row !== undefined) {
        return (_jsx(TableColumnContainer, { ...props, children: _jsx(ActionIcon, { className: "hover-only", icon: "ellipsisHorizontal", iconProps: {
                    color: 'muted',
                    size: 'md',
                }, onClick: handleActionClick, onDoubleClick: handleActionDoubleClick, size: "xs", variant: "subtle" }) }));
    }
    return _jsx(TableColumnContainer, { ...props, children: "\u00A0" });
};
