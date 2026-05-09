import { useCallback } from 'react';

import { usePlayHistoryStore } from '/@/renderer/store/play-history.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';

interface RemoveFromRecentsActionProps {
    recentItemKey: string;
}

export const RemoveFromRecentsAction = ({ recentItemKey }: RemoveFromRecentsActionProps) => {
    const remove = usePlayHistoryStore((state) => state.actions.remove);

    const handleRemove = useCallback(() => {
        remove(recentItemKey);
    }, [recentItemKey, remove]);

    return (
        <ContextMenu.Item leftIcon="remove" onSelect={handleRemove}>
            Remove from recents
        </ContextMenu.Item>
    );
};
