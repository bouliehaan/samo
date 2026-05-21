import { useCallback } from 'react';
import { useSettingsStore, useSettingsStoreActions } from '/@/renderer/store';
export const useItemListColumnResize = ({ itemListKey, tableKey = 'main', }) => {
    const { setList } = useSettingsStoreActions();
    const columns = useSettingsStore((state) => {
        const list = state.lists[itemListKey];
        return tableKey === 'detail' ? list?.detail?.columns : list?.table?.columns;
    });
    const handleColumnResized = useCallback((columnId, width) => {
        if (!columns)
            return;
        const updatedColumns = columns.map((column) => column.id === columnId ? { ...column, width } : column);
        if (tableKey === 'detail') {
            setList(itemListKey, { detail: { columns: updatedColumns } });
        }
        else {
            setList(itemListKey, {
                table: {
                    columns: updatedColumns,
                },
            });
        }
    }, [columns, itemListKey, setList, tableKey]);
    return { handleColumnResized };
};
