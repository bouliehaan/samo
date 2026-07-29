import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { createCallable } from 'react-call';
import { generatePath, useNavigate, useParams } from 'react-router';

import { RemoveFromHomeAction } from '/@/renderer/features/context-menu/actions/remove-from-home-action';
import { AlbumArtistContextMenu } from '/@/renderer/features/context-menu/menus/album-artist-context-menu';
import { AlbumContextMenu } from '/@/renderer/features/context-menu/menus/album-context-menu';
import { ArtistContextMenu } from '/@/renderer/features/context-menu/menus/artist-context-menu';
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
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import {
    Album,
    AlbumArtist,
    Artist,
    Genre,
    InternetRadioStation,
    LibraryItem,
    Playlist,
    QueueSong,
    ServerListItemWithCredential,
    Song,
} from '/@/shared/types/domain-types';

interface ContextMenuControllerProps {
    cmd: ContextMenuCommand;
    event: React.MouseEvent<unknown>;
}

export const ContextMenuController = createCallable<ContextMenuControllerProps, void>(
    ({ call, cmd, event }) => {
        const { libraryId } = useParams() as { libraryId: string };
        const queryClient = useQueryClient();

        const triggerRef = useRef<HTMLDivElement>(null);
        const isExecuted = useRef<boolean>(false);

        useEffect(() => {
            if (isExecuted.current) {
                return;
            }

            if (!triggerRef.current) {
                return;
            }

            const handleContextMenu = () => {
                event.preventDefault();

                triggerRef.current?.dispatchEvent(
                    new MouseEvent('contextmenu', {
                        bubbles: true,
                        clientX: event.clientX,
                        clientY: event.clientY,
                    }),
                );
            };

            isExecuted.current = true;

            handleContextMenu();
        }, [call, cmd, event, event.clientX, event.clientY, libraryId, queryClient]);

        return (
            <ContextMenu>
                <ContextMenu.Target>
                    <div
                        ref={triggerRef}
                        style={{
                            height: 0,
                            left: 0,
                            pointerEvents: 'none',
                            position: 'absolute',
                            top: 0,
                            userSelect: 'none',
                            width: 0,
                        }}
                    />
                </ContextMenu.Target>
                {cmd.type === LibraryItem.QUEUE_SONG && <QueueContextMenu {...cmd} />}
                {cmd.type === LibraryItem.ALBUM && <AlbumContextMenu {...cmd} />}
                {cmd.type === LibraryItem.ALBUM_ARTIST && <AlbumArtistContextMenu {...cmd} />}
                {cmd.type === LibraryItem.ARTIST && <ArtistContextMenu {...cmd} />}
                {cmd.type === LibraryItem.GENRE && <GenreContextMenu {...cmd} />}
                {cmd.type === LibraryItem.PLAYLIST && <PlaylistContextMenu {...cmd} />}
                {cmd.type === LibraryItem.PLAYLIST_SONG && <PlaylistSongContextMenu {...cmd} />}
                {cmd.type === LibraryItem.SONG && <SongContextMenu {...cmd} />}
                {cmd.type === 'audiobook' && <AudiobookContextMenu {...cmd} />}
                {cmd.type === 'podcast' && <PodcastContextMenu {...cmd} />}
                {cmd.type === 'radio' && <RadioContextMenu {...cmd} />}
                {cmd.type === 'recent' && <RecentItemContextMenu {...cmd} />}
            </ContextMenu>
        );
    },
);

export type ContextMenuCommand =
    | AlbumArtistContextMenuProps
    | AlbumContextMenuProps
    | ArtistContextMenuProps
    | AudiobookContextMenuProps
    | GenreContextMenuProps
    | PlaylistContextMenuProps
    | PlaylistSongContextMenuProps
    | PodcastContextMenuProps
    | QueueSongContextMenuProps
    | RadioContextMenuProps
    | RecentItemContextMenuProps
    | SongContextMenuProps;

type AlbumArtistContextMenuProps = {
    homeItemKey?: string;
    items: AlbumArtist[];
    type: LibraryItem.ALBUM_ARTIST;
};

type AlbumContextMenuProps = {
    homeItemKey?: string;
    items: Album[];
    type: LibraryItem.ALBUM;
};

type ArtistContextMenuProps = {
    items: Artist[];
    type: LibraryItem.ARTIST;
};

type AudiobookContextMenuProps = {
    homeItemKey?: string;
    items: LongFormLibraryItem[];
    server: ServerListItemWithCredential;
    type: 'audiobook';
};

type GenreContextMenuProps = {
    items: Genre[];
    type: LibraryItem.GENRE;
};

type PlaylistContextMenuProps = {
    homeItemKey?: string;
    items: Playlist[];
    type: LibraryItem.PLAYLIST;
};

type PlaylistSongContextMenuProps = {
    items: Song[];
    type: LibraryItem.PLAYLIST_SONG;
};

type PodcastContextMenuProps = {
    homeItemKey?: string;
    items: LongFormLibraryItem[];
    server: ServerListItemWithCredential;
    type: 'podcast';
};

type QueueSongContextMenuProps = {
    items: QueueSong[];
    type: LibraryItem.QUEUE_SONG;
};

type RadioContextMenuProps = {
    homeItemKey?: string;
    items: InternetRadioStation[];
    serverId: string;
    type: 'radio';
};

type RecentItemContextMenuProps = {
    onOpen?: () => void;
    recentItemKey: string;
    type: 'recent';
};

type SongContextMenuProps = {
    homeItemKey?: string;
    items: Song[];
    recentItemKey?: string;
    type: LibraryItem.SONG;
};

const AudiobookContextMenu = ({ homeItemKey, items, server }: AudiobookContextMenuProps) => {
    const navigate = useNavigate();
    const { play } = useAudiobookActions();
    const { toggle } = useLibraryFavoritesActions();
    const item = items[0];
    if (!item) return null;

    return (
        <ContextMenu.Content>
            <ContextMenu.Item leftIcon="mediaPlay" onSelect={() => play(server, item)}>
                Play
            </ContextMenu.Item>
            <ContextMenu.Item leftIcon="info" onSelect={() => navigate(AppRoute.AUDIOBOOKS)}>
                More info
            </ContextMenu.Item>
            <ContextMenu.Divider />
            <ContextMenu.Item
                leftIcon="favorite"
                onSelect={() => toggle('audiobook', server.id, item.id)}
            >
                Favorite
            </ContextMenu.Item>
            {homeItemKey ? (
                <>
                    <ContextMenu.Divider />
                    <RemoveFromHomeAction homeItemKey={homeItemKey} />
                </>
            ) : null}
        </ContextMenu.Content>
    );
};

const PodcastContextMenu = ({ homeItemKey, items, server }: PodcastContextMenuProps) => {
    const navigate = useNavigate();
    const { toggle } = useLibraryFavoritesActions();
    const item = items[0];
    if (!item) return null;

    return (
        <ContextMenu.Content>
            <ContextMenu.Item
                leftIcon="mediaPlay"
                onSelect={() => {
                    recordRecentPodcast(item, server.id);
                    navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
                }}
            >
                Open
            </ContextMenu.Item>
            <ContextMenu.Item
                leftIcon="info"
                onSelect={() => {
                    recordRecentPodcast(item, server.id);
                    navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
                }}
            >
                More info
            </ContextMenu.Item>
            <ContextMenu.Divider />
            <ContextMenu.Item
                leftIcon="favorite"
                onSelect={() => toggle('podcast', server.id, item.id)}
            >
                Favorite
            </ContextMenu.Item>
            {homeItemKey ? (
                <>
                    <ContextMenu.Divider />
                    <RemoveFromHomeAction homeItemKey={homeItemKey} />
                </>
            ) : null}
        </ContextMenu.Content>
    );
};

const RadioContextMenu = ({ homeItemKey, items, serverId }: RadioContextMenuProps) => {
    const { play } = useRadioControls();
    const { toggle } = useLibraryFavoritesActions();
    const station = items[0];
    if (!station) return null;

    return (
        <ContextMenu.Content>
            <ContextMenu.Item
                leftIcon="mediaPlay"
                onSelect={() =>
                    play(station.streamUrl, station.name, {
                        id: station.id,
                        imageId: station.imageId,
                        imageUrl: station.imageUrl,
                        serverId,
                    })
                }
            >
                Play
            </ContextMenu.Item>
            <ContextMenu.Divider />
            <ContextMenu.Item
                leftIcon="favorite"
                onSelect={() => toggle('radio', serverId, station.id)}
            >
                Favorite
            </ContextMenu.Item>
            {homeItemKey ? (
                <>
                    <ContextMenu.Divider />
                    <RemoveFromHomeAction homeItemKey={homeItemKey} />
                </>
            ) : null}
        </ContextMenu.Content>
    );
};
