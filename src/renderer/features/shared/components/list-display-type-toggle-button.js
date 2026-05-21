import { jsx as _jsx } from "react/jsx-runtime";
import { DisplayTypeToggleButton } from '/@/renderer/features/shared/components/display-type-toggle-button';
import { useSettingsStore, useSettingsStoreActions } from '/@/renderer/store';
import { ListDisplayType } from '/@/shared/types/types';
export const ListDisplayTypeToggleButton = ({ enableDetail = false, listKey, }) => {
    const displayType = useSettingsStore((state) => state.lists[listKey]?.display);
    const { setList } = useSettingsStoreActions();
    const handleToggleDisplayType = () => {
        let newDisplayType;
        if (enableDetail) {
            if (displayType === ListDisplayType.DETAIL) {
                newDisplayType = ListDisplayType.TABLE;
            }
            else if (displayType === ListDisplayType.TABLE) {
                newDisplayType = ListDisplayType.GRID;
            }
            else if (displayType === ListDisplayType.GRID) {
                newDisplayType = ListDisplayType.DETAIL;
            }
            else {
                newDisplayType = ListDisplayType.GRID;
            }
        }
        else {
            if (displayType === ListDisplayType.GRID) {
                newDisplayType = ListDisplayType.TABLE;
            }
            else if (displayType === ListDisplayType.TABLE) {
                newDisplayType = ListDisplayType.GRID;
            }
            else {
                newDisplayType = ListDisplayType.GRID;
            }
        }
        setList(listKey, {
            display: newDisplayType,
        });
        return;
    };
    return _jsx(DisplayTypeToggleButton, { displayType: displayType, onToggle: handleToggleDisplayType });
};
