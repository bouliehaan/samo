import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
export const MoveQueueItemsAction = ({ items }) => {
    const { t } = useTranslation();
    const player = usePlayer();
    const handleMoveToTop = useCallback(() => {
        player.moveSelectedToTop(items);
    }, [items, player]);
    const handleMoveToNext = useCallback(() => {
        player.moveSelectedToNext(items);
    }, [items, player]);
    const handleMoveToBottom = useCallback(() => {
        player.moveSelectedToBottom(items);
    }, [items, player]);
    return (_jsxs(ContextMenu.Submenu, { children: [_jsx(ContextMenu.SubmenuTarget, { children: _jsx(ContextMenu.Item, { leftIcon: "dragVertical", onSelect: (e) => e.preventDefault(), rightIcon: "arrowRightS", children: t('page.contextMenu.moveItems', { postProcess: 'sentenceCase' }) }) }), _jsxs(ContextMenu.SubmenuContent, { children: [_jsx(ContextMenu.Item, { leftIcon: "arrowUpToLine", onSelect: handleMoveToTop, children: t('page.contextMenu.moveToTop', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayNext", onSelect: handleMoveToNext, children: t('page.contextMenu.moveToNext', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "arrowDownToLine", onSelect: handleMoveToBottom, children: t('page.contextMenu.moveToBottom', { postProcess: 'sentenceCase' }) })] })] }));
};
