import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '/@/renderer/api/query-keys';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { useCurrentServerId, usePlayButtonBehavior } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { Play } from '/@/shared/types/types';
import { logFn } from '/@/renderer/utils/logger';
export const PlayTrackRadioAction = ({ disabled, song }) => {
    const { t } = useTranslation();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const queryClient = useQueryClient();
    const playButtonBehavior = usePlayButtonBehavior();
    const handlePlayTrackRadio = useCallback(async (playType) => {
        if (!serverId || !song)
            return;
        try {
            const similarSongs = await queryClient.fetchQuery({
                ...songsQueries.similar({
                    query: {
                        songId: song.id,
                    },
                    serverId,
                }),
                queryKey: queryKeys.player.fetch({ similarSongs: song.id }),
            });
            if (similarSongs && similarSongs.length > 0) {
                player.addToQueueByData([song, ...similarSongs], playType);
            }
        }
        catch (error) {
            logFn.error('Failed to load track radio', { meta: { error: error } });
        }
    }, [player, queryClient, serverId, song]);
    const handlePlayTrackRadioNow = useCallback(() => {
        handlePlayTrackRadio(Play.NOW);
    }, [handlePlayTrackRadio]);
    const handlePlayTrackRadioNext = useCallback(() => {
        handlePlayTrackRadio(Play.NEXT);
    }, [handlePlayTrackRadio]);
    const handlePlayTrackRadioLast = useCallback(() => {
        handlePlayTrackRadio(Play.LAST);
    }, [handlePlayTrackRadio]);
    const defaultPlayTrackRadioAction = useCallback(() => {
        handlePlayTrackRadio(playButtonBehavior);
    }, [handlePlayTrackRadio, playButtonBehavior]);
    return (_jsxs(ContextMenu.Submenu, { children: [_jsx(ContextMenu.SubmenuTarget, { children: _jsx(ContextMenu.Item, { disabled: disabled, leftIcon: "radio", onSelect: defaultPlayTrackRadioAction, rightIcon: "arrowRightS", children: t('player.trackRadio', { postProcess: 'sentenceCase' }) }) }), _jsxs(ContextMenu.SubmenuContent, { children: [_jsx(ContextMenu.Item, { leftIcon: "mediaPlay", onSelect: handlePlayTrackRadioNow, children: t('player.play', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayNext", onSelect: handlePlayTrackRadioNext, children: t('player.addNext', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayLast", onSelect: handlePlayTrackRadioLast, children: t('player.addLast', { postProcess: 'sentenceCase' }) })] })] }));
};
