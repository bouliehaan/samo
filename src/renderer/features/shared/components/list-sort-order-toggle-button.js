import { jsx as _jsx } from "react/jsx-runtime";
import { OrderToggleButton } from '/@/renderer/features/shared/components/order-toggle-button';
import { useSortOrderFilter } from '/@/renderer/features/shared/hooks/use-sort-order-filter';
import { SortOrder } from '/@/shared/types/domain-types';
export const ListSortOrderToggleButton = ({ defaultSortOrder, disabled, listKey, }) => {
    const { setSortOrder, sortOrder } = useSortOrderFilter(defaultSortOrder, listKey);
    const handleToggleSortOrder = () => {
        const newSortOrder = sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC;
        setSortOrder(newSortOrder);
    };
    return (_jsx(OrderToggleButton, { disabled: disabled, onToggle: handleToggleSortOrder, sortOrder: sortOrder }));
};
export const ListSortOrderToggleButtonControlled = ({ disabled, setSortOrder, sortOrder, }) => {
    return (_jsx(OrderToggleButton, { disabled: disabled, onToggle: () => setSortOrder(sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC), sortOrder: sortOrder }));
};
