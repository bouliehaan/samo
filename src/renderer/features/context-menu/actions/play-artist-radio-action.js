import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '/@/renderer/api/query-keys';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { useArtistRadioCount, useCurrentServerId, usePlayButtonBehavior } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { Play } from '/@/shared/types/types';
import { logFn } from '/@/renderer/utils/logger';
export const PlayArtistRadioAction = ({ artist, disabled }) => {
    const artistRadioCount = useArtistRadioCount();
    const { t } = useTranslation();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const queryClient = useQueryClient();
    const playButtonBehavior = usePlayButtonBehavior();
    const handlePlayArtistRadio = useCallback(async (playType) => {
        if (!serverId || !artist)
            return;
        try {
            const artistRadioSongs = await queryClient.fetchQuery({
                ...songsQueries.artistRadio({
                    query: {
                        artistId: artist.id,
                        count: artistRadioCount,
                    },
                    serverId: serverId,
                }),
                queryKey: queryKeys.player.fetch({ artistId: artist.id }),
            });
            if (artistRadioSongs && artistRadioSongs.length > 0) {
                player.addToQueueByData(artistRadioSongs, playType);
            }
        }
        catch (error) {
            logFn.error('Failed to load track radio', { meta: { error: error } });
        }
    }, [artist, artistRadioCount, player, queryClient, serverId]);
    const handlePlayArtistRadioNow = useCallback(() => {
        handlePlayArtistRadio(Play.NOW);
    }, [handlePlayArtistRadio]);
    const handlePlayArtistRadioNext = useCallback(() => {
        handlePlayArtistRadio(Play.NEXT);
    }, [handlePlayArtistRadio]);
    const handlePlayArtistRadioLast = useCallback(() => {
        handlePlayArtistRadio(Play.LAST);
    }, [handlePlayArtistRadio]);
    const defaultPlayArtistRadioAction = useCallback(() => {
        handlePlayArtistRadio(playButtonBehavior);
    }, [handlePlayArtistRadio, playButtonBehavior]);
    return (_jsxs(ContextMenu.Submenu, { children: [_jsx(ContextMenu.SubmenuTarget, { children: _jsx(ContextMenu.Item, { disabled: disabled, leftIcon: "radio", onSelect: defaultPlayArtistRadioAction, rightIcon: "arrowRightS", children: t('player.artistRadio', { postProcess: 'sentenceCase' }) }) }), _jsxs(ContextMenu.SubmenuContent, { children: [_jsx(ContextMenu.Item, { leftIcon: "mediaPlay", onSelect: handlePlayArtistRadioNow, children: t('player.play', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayNext", onSelect: handlePlayArtistRadioNext, children: t('player.addNext', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayLast", onSelect: handlePlayArtistRadioLast, children: t('player.addLast', { postProcess: 'sentenceCase' }) })] })] }));
};
