import { RemoveFromRecentsAction } from '/@/renderer/features/context-menu/actions/remove-from-recents-action';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';

interface RecentItemContextMenuProps {
    onOpen?: () => void;
    recentItemKey: string;
    type: 'recent';
}

export const RecentItemContextMenu = ({ onOpen, recentItemKey }: RecentItemContextMenuProps) => {
    return (
        <ContextMenu.Content>
            {onOpen ? (
                <>
                    <ContextMenu.Item leftIcon="mediaPlay" onSelect={onOpen}>
                        Open
                    </ContextMenu.Item>
                    <ContextMenu.Divider />
                </>
            ) : null}
            <RemoveFromRecentsAction recentItemKey={recentItemKey} />
        </ContextMenu.Content>
    );
};
