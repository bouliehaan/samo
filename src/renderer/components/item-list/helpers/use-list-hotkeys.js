import { useNavigate } from 'react-router';
import { getTitlePath } from '/@/renderer/components/item-list/helpers/get-title-path';
import { useHotkeySettings, usePlayButtonBehavior } from '/@/renderer/store';
import { useHotkeys } from '/@/shared/hooks/use-hotkeys';
import { Play } from '/@/shared/types/types';
export const useListHotkeys = ({ controls, focused, internalState, itemType, }) => {
    const { bindings } = useHotkeySettings();
    const playButtonBehavior = usePlayButtonBehavior();
    const navigate = useNavigate();
    // Helper to check if item has required properties
    const hasRequiredStateItemProperties = (item) => {
        return (typeof item === 'object' &&
            item !== null &&
            'id' in item &&
            typeof item.id === 'string' &&
            '_serverId' in item &&
            typeof item._serverId === 'string' &&
            '_itemType' in item &&
            typeof item._itemType === 'string');
    };
    useHotkeys([
        [
            'mod+a',
            () => {
                if (focused) {
                    if (internalState.isAllSelected()) {
                        internalState.deselectAll();
                    }
                    else {
                        internalState.selectAll();
                    }
                }
            },
        ],
        [
            bindings.listPlayDefault.hotkey,
            () => {
                if (!focused)
                    return;
                const selected = internalState.getSelected();
                const validSelected = selected.filter(hasRequiredStateItemProperties);
                if (validSelected.length === 0)
                    return;
                const item = validSelected[0];
                const playType = playButtonBehavior;
                controls.onPlay?.({ item, itemType, playType });
            },
        ],
        [
            bindings.listPlayNow.hotkey,
            () => {
                if (!focused)
                    return;
                const selected = internalState.getSelected();
                const validSelected = selected.filter(hasRequiredStateItemProperties);
                if (validSelected.length === 0)
                    return;
                const item = validSelected[0];
                controls.onPlay?.({ item, itemType, playType: Play.NOW });
            },
        ],
        [
            bindings.listPlayNext.hotkey,
            () => {
                if (!focused)
                    return;
                const selected = internalState.getSelected();
                const validSelected = selected.filter(hasRequiredStateItemProperties);
                if (validSelected.length === 0)
                    return;
                const item = validSelected[0];
                controls.onPlay?.({ item, itemType, playType: Play.NEXT });
            },
        ],
        [
            bindings.listPlayLast.hotkey,
            () => {
                if (!focused)
                    return;
                const selected = internalState.getSelected();
                const validSelected = selected.filter(hasRequiredStateItemProperties);
                if (validSelected.length === 0)
                    return;
                const item = validSelected[0];
                controls.onPlay?.({ item, itemType, playType: Play.LAST });
            },
        ],
        [
            bindings.listNavigateToPage.hotkey,
            () => {
                if (!focused)
                    return;
                const selected = internalState.getSelected();
                const validSelected = selected.filter(hasRequiredStateItemProperties);
                if (validSelected.length === 0)
                    return;
                const item = validSelected[0];
                const path = getTitlePath(itemType, item.id);
                if (path) {
                    navigate(path, { state: { item } });
                }
            },
        ],
    ]);
};
