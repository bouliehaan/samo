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
export const PlayAlbumRadioAction = ({ album, disabled }) => {
    const albumRadioCount = useArtistRadioCount(); // Reuse the same setting for album radio
    const { t } = useTranslation();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const queryClient = useQueryClient();
    const playButtonBehavior = usePlayButtonBehavior();
    const handlePlayAlbumRadio = useCallback(async (playType) => {
        if (!serverId || !album)
            return;
        try {
            const albumRadioSongs = await queryClient.fetchQuery({
                ...songsQueries.albumRadio({
                    query: {
                        albumId: album.id,
                        count: albumRadioCount,
                    },
                    serverId: serverId,
                }),
                queryKey: queryKeys.player.fetch({ albumId: album.id }),
            });
            if (albumRadioSongs && albumRadioSongs.length > 0) {
                player.addToQueueByData(albumRadioSongs, playType);
            }
        }
        catch (error) {
            logFn.error('Failed to load album radio', { meta: { error: error } });
        }
    }, [album, albumRadioCount, player, queryClient, serverId]);
    const handlePlayAlbumRadioNow = useCallback(() => {
        handlePlayAlbumRadio(Play.NOW);
    }, [handlePlayAlbumRadio]);
    const handlePlayAlbumRadioNext = useCallback(() => {
        handlePlayAlbumRadio(Play.NEXT);
    }, [handlePlayAlbumRadio]);
    const handlePlayAlbumRadioLast = useCallback(() => {
        handlePlayAlbumRadio(Play.LAST);
    }, [handlePlayAlbumRadio]);
    const defaultPlayAlbumRadioAction = useCallback(() => {
        handlePlayAlbumRadio(playButtonBehavior);
    }, [handlePlayAlbumRadio, playButtonBehavior]);
    return (_jsxs(ContextMenu.Submenu, { children: [_jsx(ContextMenu.SubmenuTarget, { children: _jsx(ContextMenu.Item, { disabled: disabled, leftIcon: "radio", onSelect: defaultPlayAlbumRadioAction, rightIcon: "arrowRightS", children: t('player.albumRadio', { postProcess: 'sentenceCase' }) }) }), _jsxs(ContextMenu.SubmenuContent, { children: [_jsx(ContextMenu.Item, { leftIcon: "mediaPlay", onSelect: handlePlayAlbumRadioNow, children: t('player.play', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayNext", onSelect: handlePlayAlbumRadioNext, children: t('player.addNext', { postProcess: 'sentenceCase' }) }), _jsx(ContextMenu.Item, { leftIcon: "mediaPlayLast", onSelect: handlePlayAlbumRadioLast, children: t('player.addLast', { postProcess: 'sentenceCase' }) })] })] }));
};
