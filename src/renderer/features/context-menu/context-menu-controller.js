import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { createCallable } from 'react-call';
import { generatePath, useNavigate, useParams } from 'react-router';
import { AlbumArtistContextMenu } from '/@/renderer/features/context-menu/menus/album-artist-context-menu';
import { AlbumContextMenu } from '/@/renderer/features/context-menu/menus/album-context-menu';
import { ArtistContextMenu } from '/@/renderer/features/context-menu/menus/artist-context-menu';
import { FolderContextMenu } from '/@/renderer/features/context-menu/menus/folder-context-menu';
import { GenreContextMenu } from '/@/renderer/features/context-menu/menus/genre-context-menu';
import { PlaylistContextMenu } from '/@/renderer/features/context-menu/menus/playlist-context-menu';
import { PlaylistSongContextMenu } from '/@/renderer/features/context-menu/menus/playlist-song-context-menu';
import { QueueContextMenu } from '/@/renderer/features/context-menu/menus/queue-context-menu';
import { RecentItemContextMenu } from '/@/renderer/features/context-menu/menus/recent-item-context-menu';
import { SongContextMenu } from '/@/renderer/features/context-menu/menus/song-context-menu';
import { useRadioControls } from '/@/renderer/features/radio/hooks/use-radio-player';
import { AppRoute } from '/@/renderer/router/routes';
import { useAudiobookActions } from '/@/renderer/store/audiobook.store';
import { useLibraryFavoritesActions } from '/@/renderer/store/library-favorites.store';
import { recordRecentPodcast } from '/@/renderer/store/play-history.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem, } from '/@/shared/types/domain-types';
export const ContextMenuController = createCallable(({ call, cmd, event }) => {
    const { libraryId } = useParams();
    const queryClient = useQueryClient();
    const triggerRef = useRef(null);
    const isExecuted = useRef(false);
    useEffect(() => {
        if (isExecuted.current) {
            return;
        }
        if (!triggerRef.current) {
            return;
        }
        const handleContextMenu = () => {
            event.preventDefault();
            triggerRef.current?.dispatchEvent(new MouseEvent('contextmenu', {
                bubbles: true,
                clientX: event.clientX,
                clientY: event.clientY,
            }));
        };
        isExecuted.current = true;
        handleContextMenu();
    }, [call, cmd, event, event.clientX, event.clientY, libraryId, queryClient]);
    return (_jsxs(ContextMenu, { children: [_jsx(ContextMenu.Target, { children: _jsx("div", { ref: triggerRef, style: {
                        height: 0,
                        left: 0,
                        pointerEvents: 'none',
                        position: 'absolute',
                        top: 0,
                        userSelect: 'none',
                        width: 0,
                    } }) }), cmd.type === LibraryItem.QUEUE_SONG && _jsx(QueueContextMenu, { ...cmd }), cmd.type === LibraryItem.ALBUM && _jsx(AlbumContextMenu, { ...cmd }), cmd.type === LibraryItem.ALBUM_ARTIST && _jsx(AlbumArtistContextMenu, { ...cmd }), cmd.type === LibraryItem.ARTIST && _jsx(ArtistContextMenu, { ...cmd }), cmd.type === LibraryItem.FOLDER && _jsx(FolderContextMenu, { ...cmd }), cmd.type === LibraryItem.GENRE && _jsx(GenreContextMenu, { ...cmd }), cmd.type === LibraryItem.PLAYLIST && _jsx(PlaylistContextMenu, { ...cmd }), cmd.type === LibraryItem.PLAYLIST_SONG && _jsx(PlaylistSongContextMenu, { ...cmd }), cmd.type === LibraryItem.SONG && _jsx(SongContextMenu, { ...cmd }), cmd.type === 'audiobook' && _jsx(AudiobookContextMenu, { ...cmd }), cmd.type === 'podcast' && _jsx(PodcastContextMenu, { ...cmd }), cmd.type === 'radio' && _jsx(RadioContextMenu, { ...cmd }), cmd.type === 'recent' && _jsx(RecentItemContextMenu, { ...cmd })] }));
});
const AudiobookContextMenu = ({ items, server }) => {
    const navigate = useNavigate();
    const { play } = useAudiobookActions();
    const { toggle } = useLibraryFavoritesActions();
    const item = items[0];
    if (!item)
        return null;
    return (_jsxs(ContextMenu.Content, { children: [_jsx(ContextMenu.Item, { leftIcon: "mediaPlay", onSelect: () => play(server, item), children: "Play" }), _jsx(ContextMenu.Item, { leftIcon: "info", onSelect: () => navigate(AppRoute.AUDIOBOOKS), children: "More info" }), _jsx(ContextMenu.Divider, {}), _jsx(ContextMenu.Item, { leftIcon: "favorite", onSelect: () => toggle('audiobook', server.id, item.id), children: "Favorite" })] }));
};
const PodcastContextMenu = ({ items, server }) => {
    const navigate = useNavigate();
    const { toggle } = useLibraryFavoritesActions();
    const item = items[0];
    if (!item)
        return null;
    return (_jsxs(ContextMenu.Content, { children: [_jsx(ContextMenu.Item, { leftIcon: "mediaPlay", onSelect: () => {
                    recordRecentPodcast(item, server.id);
                    navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
                }, children: "Open" }), _jsx(ContextMenu.Item, { leftIcon: "info", onSelect: () => {
                    recordRecentPodcast(item, server.id);
                    navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
                }, children: "More info" }), _jsx(ContextMenu.Divider, {}), _jsx(ContextMenu.Item, { leftIcon: "favorite", onSelect: () => toggle('podcast', server.id, item.id), children: "Favorite" })] }));
};
const RadioContextMenu = ({ items, serverId }) => {
    const { play } = useRadioControls();
    const { toggle } = useLibraryFavoritesActions();
    const station = items[0];
    if (!station)
        return null;
    return (_jsxs(ContextMenu.Content, { children: [_jsx(ContextMenu.Item, { leftIcon: "mediaPlay", onSelect: () => play(station.streamUrl, station.name, {
                    id: station.id,
                    imageId: station.imageId,
                    imageUrl: station.imageUrl,
                    serverId,
                }), children: "Play" }), _jsx(ContextMenu.Divider, {}), _jsx(ContextMenu.Item, { leftIcon: "favorite", onSelect: () => toggle('radio', serverId, station.id), children: "Favorite" })] }));
};
