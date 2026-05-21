import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
export const ShuffleItemsAction = ({ items }) => {
    const { t } = useTranslation();
    const player = usePlayer();
    const handleShuffleSelected = useCallback(() => {
        player.shuffleSelected(items);
    }, [items, player]);
    const handleShuffleAll = useCallback(() => {
        player.shuffleAll();
    }, [player]);
    return (_jsxs(ContextMenu.Submenu, { children: [_jsx(ContextMenu.SubmenuTarget, { children: _jsx(ContextMenu.Item, { leftIcon: "mediaShuffle", onSelect: (e) => e.preventDefault(), rightIcon: "arrowRightS", children: t('action.shuffle', { postProcess: 'sentenceCase' }) }) }), _jsxs(ContextMenu.SubmenuContent, { children: [_jsx(ContextMenu.Item, { onSelect: handleShuffleSelected, children: t('action.shuffleSelected', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { onSelect: handleShuffleAll, children: t('action.shuffleAll', { postProcess: 'sentenceCase' }) })] })] }));
};
