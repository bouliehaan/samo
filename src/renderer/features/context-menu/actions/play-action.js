import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useCurrentServerId, usePlayButtonBehavior } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
export const PlayAction = ({ allowShuffle = true, ids, itemType, onPlay, songs, }) => {
    const { t } = useTranslation();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const handlePlay = useCallback((playType) => {
        if (ids.length === 0 || !serverId)
            return;
        onPlay?.();
        if (itemType === LibraryItem.SONG ||
            itemType === LibraryItem.PLAYLIST_SONG ||
            itemType === LibraryItem.QUEUE_SONG) {
            player.addToQueueByData(songs || [], playType);
        }
        else {
            player.addToQueueByFetch(serverId, ids, itemType, playType);
        }
    }, [ids, itemType, onPlay, player, serverId, songs]);
    const handlePlayNow = useCallback(() => {
        handlePlay(Play.NOW);
    }, [handlePlay]);
    const handlePlayNext = useCallback(() => {
        handlePlay(Play.NEXT);
    }, [handlePlay]);
    const handlePlayLast = useCallback(() => {
        handlePlay(Play.LAST);
    }, [handlePlay]);
    const handlePlayShuffled = useCallback(() => {
        handlePlay(Play.SHUFFLE);
    }, [handlePlay]);
    const handlePlayNextShuffled = useCallback(() => {
        handlePlay(Play.NEXT_SHUFFLE);
    }, [handlePlay]);
    const handlePlayLastShuffled = useCallback(() => {
        handlePlay(Play.LAST_SHUFFLE);
    }, [handlePlay]);
    const playButtonBehavior = usePlayButtonBehavior();
    const defaultPlayAction = useCallback(() => {
        handlePlay(playButtonBehavior);
    }, [handlePlay, playButtonBehavior]);
    if (ids.length === 0)
        return null;
    return (_jsxs(ContextMenu.Submenu, { children: [_jsx(ContextMenu.SubmenuTarget, { children: _jsx(ContextMenu.Item, { leftIcon: "mediaPlay", onSelect: defaultPlayAction, rightIcon: "arrowRightS", children: t('player.play', { postProcess: 'sentenceCase' }) }) }), _jsxs(ContextMenu.SubmenuContent, { children: [_jsx(ContextMenu.Item, { leftIcon: "mediaPlay", onSelect: handlePlayNow, children: t('player.play', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayNext", onSelect: handlePlayNext, children: t('player.addNext', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayLast", onSelect: handlePlayLast, children: t('player.addLast', { postProcess: 'sentenceCase' }) }), allowShuffle ? (_jsxs(_Fragment, { children: [_jsx(ContextMenu.Divider, {}), _jsx(ContextMenu.Item, { leftIcon: "mediaShuffle", onSelect: handlePlayShuffled, children: t('player.shuffle', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayNext", onSelect: handlePlayNextShuffled, children: t('player.addNextShuffled', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayLast", onSelect: handlePlayLastShuffled, children: t('player.addLastShuffled', { postProcess: 'sentenceCase' }) })] })) : null] })] }));
};
