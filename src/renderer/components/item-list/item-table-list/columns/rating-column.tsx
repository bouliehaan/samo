import {
    ItemTableListInnerColumn,
    TableColumnContainer,
} from '/@/renderer/components/item-list/item-table-list/item-table-list-column';

export const RatingColumn = (props: ItemTableListInnerColumn) => (
    <TableColumnContainer {...props}>&nbsp;</TableColumnContainer>
);
