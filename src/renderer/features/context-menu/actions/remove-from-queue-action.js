import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
export const RemoveFromQueueAction = ({ items }) => {
    const { t } = useTranslation();
    const player = usePlayer();
    const onSelect = useCallback(() => {
        player.clearSelected(items);
    }, [items, player]);
    return (_jsx(ContextMenu.Item, { leftIcon: "remove", onSelect: onSelect, children: t('action.removeFromQueue', { postProcess: 'sentenceCase' }) }));
};
