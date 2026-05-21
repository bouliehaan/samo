import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { RemoveFromRecentsAction } from '/@/renderer/features/context-menu/actions/remove-from-recents-action';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
export const RecentItemContextMenu = ({ onOpen, recentItemKey }) => {
    return (_jsxs(ContextMenu.Content, { children: [onOpen ? (_jsxs(_Fragment, { children: [_jsx(ContextMenu.Item, { leftIcon: "mediaPlay", onSelect: onOpen, children: "Open" }), _jsx(ContextMenu.Divider, {})] })) : null, _jsx(RemoveFromRecentsAction, { recentItemKey: recentItemKey })] }));
};
