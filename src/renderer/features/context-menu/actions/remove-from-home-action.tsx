import { useCallback } from 'react';

import { useHideFromHome } from '/@/renderer/store/hidden-home-items.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';

interface RemoveFromHomeActionProps {
    homeItemKey: string;
}

export const RemoveFromHomeAction = ({ homeItemKey }: RemoveFromHomeActionProps) => {
    const hide = useHideFromHome();

    const handleRemove = useCallback(() => {
        hide(homeItemKey);
    }, [homeItemKey, hide]);

    return (
        <ContextMenu.Item leftIcon="remove" onSelect={handleRemove}>
            Remove from home screen
        </ContextMenu.Item>
    );
};
