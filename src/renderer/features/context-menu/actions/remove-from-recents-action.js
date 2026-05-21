import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback } from 'react';
import { usePlayHistoryStore } from '/@/renderer/store/play-history.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
export const RemoveFromRecentsAction = ({ recentItemKey }) => {
    const remove = usePlayHistoryStore((state) => state.actions.remove);
    const handleRemove = useCallback(() => {
        remove(recentItemKey);
    }, [recentItemKey, remove]);
    return (_jsx(ContextMenu.Item, { leftIcon: "remove", onSelect: handleRemove, children: "Remove from recents" }));
};
