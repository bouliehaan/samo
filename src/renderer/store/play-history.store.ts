import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
    identityPersistMigrate,
    PERSIST_VERSION_INITIAL,
} from '/@/renderer/store/persist-migrate';

import { AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import {
    Album,
    AlbumArtist,
    InternetRadioStation,
    LibraryItem,
    Playlist,
    RelatedAlbumArtist,
    RelatedArtist,
    ServerType,
    Song,
} from '/@/shared/types/domain-types';

const RECENT_ITEM_LIMIT = 80;

export type PlayHistoryEntryType = RecentItemType;

export interface PlayHistoryRef {
    itemId: string;
    serverId: string;
    type: PlayHistoryEntryType;
}

export type RecentArtwork =
    | {
          fallbackIcon: 'metadata' | 'microphone';
          itemId: string;
          kind: 'abs';
      }
    | {
          fallbackIconKey: string;
          kind: 'icon';
      }
    | {
          imageId?: null | string;
          imageItemType: LibraryItem;
          imageUrl?: null | string;
          kind: 'music';
          serverId?: null | string;
          shape?: 'circle' | 'square';
      };

export interface RecentItem {
    artwork: RecentArtwork;
    itemId: string;
    key: string;
    mediaType: RecentItemType;
    radioStreamUrl?: string;
    rawAbsItem?: AudiobookshelfLibraryItem;
    selectedAt: number;
    serverId: string;
    song?: Song;
    subtitle: string;
    title: string;
}

export type RecentItemInput = Omit<RecentItem, 'key' | 'selectedAt'> & {
    selectedAt?: number;
};

export type RecentItemType =
    | 'album'
    | 'artist'
    | 'audiobook'
    | 'playlist'
    | 'podcast'
    | 'radio'
    | 'song';

export const playHistoryKey = ({ itemId, serverId, type }: PlayHistoryRef) =>
    `${type}:${serverId}:${itemId}`;

const getRecentItemKey = (entry: Pick<RecentItemInput, 'itemId' | 'mediaType' | 'serverId'>) =>
    playHistoryKey({
        itemId: entry.itemId,
        serverId: entry.serverId,
        type: entry.mediaType,
    });

const compactItems = (items: RecentItem[]) =>
    items
        .slice()
        .sort((a, b) => b.selectedAt - a.selectedAt)
        .slice(0, RECENT_ITEM_LIMIT);

interface PlayHistoryState {
    actions: {
        clear: () => void;
        pruneStale: (args: {
            knownItemIds: Set<string>;
            mediaType: RecentItemType;
            serverId: string;
        }) => void;
        record: (entry: RecentItemInput) => void;
        remove: (key: string) => void;
    };
    items: RecentItem[];
}

export const usePlayHistoryStore = create<PlayHistoryState>()(
    persist(
        (set) => ({
            actions: {
                clear: () => set({ items: [] }),
                pruneStale: ({ knownItemIds, mediaType, serverId }) =>
                    set((state) => ({
                        items: state.items.filter((item) => {
                            if (item.mediaType !== mediaType) return true;
                            if (item.serverId !== serverId) return true;
                            return knownItemIds.has(item.itemId);
                        }),
                    })),
                record: (entry) => {
                    if (!entry.itemId || !entry.serverId) return;

                    const selectedAt = entry.selectedAt ?? Date.now();
                    const key = getRecentItemKey(entry);
                    const nextEntry: RecentItem = {
                        ...entry,
                        key,
                        selectedAt,
                    };

                    set((state) => ({
                        items: compactItems([
                            nextEntry,
                            ...state.items.filter((item) => item.key !== key),
                        ]),
                    }));
                },
                remove: (key) =>
                    set((state) => ({
                        items: state.items.filter((item) => item.key !== key),
                    })),
            },
            items: [],
        }),
        {
            migrate: identityPersistMigrate<Pick<PlayHistoryState, 'items'>>,
            name: 'recent-items-store',
            partialize: (state) => ({ items: state.items }),
            version: PERSIST_VERSION_INITIAL,
        },
    ),
);

export const recordRecentItem = (entry: RecentItemInput) => {
    usePlayHistoryStore.getState().actions.record(entry);
};

export const useRecentItems = () => usePlayHistoryStore((state) => state.items);

const countText = (count: null | number | undefined, singular: string) => {
    if (typeof count !== 'number') return undefined;
    return `${count} ${singular}${count === 1 ? '' : 's'}`;
};

const withDetail = (type: string, detail?: null | number | string) =>
    detail ? `${type} • ${detail}` : type;

export const recordRecentAlbum = (album: Album) => {
    if (!album._serverId) return;
    recordRecentItem({
        artwork: {
            imageId: album.imageId,
            imageItemType: LibraryItem.ALBUM,
            imageUrl: album.imageUrl,
            kind: 'music',
            serverId: album._serverId,
        },
        itemId: album.id,
        mediaType: 'album',
        serverId: album._serverId,
        subtitle: withDetail('Album', album.albumArtistName || countText(album.songCount, 'song')),
        title: album.name,
    });
};

export const recordRecentArtist = (
    artist: AlbumArtist | RelatedAlbumArtist | RelatedArtist,
    fallback?: { serverId?: string; serverType?: ServerType },
) => {
    const serverId = '_serverId' in artist ? artist._serverId : fallback?.serverId;
    if (!serverId) return;

    const imageId = 'imageId' in artist && artist.imageId ? artist.imageId : artist.id;

    recordRecentItem({
        artwork: {
            imageId,
            imageItemType: LibraryItem.ALBUM_ARTIST,
            imageUrl: 'imageUrl' in artist ? artist.imageUrl : null,
            kind: 'music',
            serverId,
            shape: 'circle',
        },
        itemId: artist.id,
        mediaType: 'artist',
        serverId,
        subtitle: withDetail(
            'Artist',
            'albumCount' in artist ? countText(artist.albumCount, 'album') : undefined,
        ),
        title: artist.name,
    });
};

export const recordRecentPlaylist = (playlist: Playlist) => {
    if (!playlist._serverId) return;
    recordRecentItem({
        artwork: {
            imageId: playlist.imageId,
            imageItemType: LibraryItem.PLAYLIST,
            imageUrl: playlist.imageUrl,
            kind: 'music',
            serverId: playlist._serverId,
        },
        itemId: playlist.id,
        mediaType: 'playlist',
        serverId: playlist._serverId,
        subtitle: withDetail('Playlist', countText(playlist.songCount, 'song')),
        title: playlist.name,
    });
};

export const recordRecentSong = (song: Song) => {
    if (!song._serverId) return;
    recordRecentItem({
        artwork: {
            imageId: song.imageId,
            imageItemType: LibraryItem.SONG,
            imageUrl: song.imageUrl,
            kind: 'music',
            serverId: song._serverId,
        },
        itemId: song.id,
        mediaType: 'song',
        serverId: song._serverId,
        song,
        subtitle: withDetail('Song', song.artistName || song.album),
        title: song.name,
    });
};

export const recordRecentRadioStation = (station: InternetRadioStation, serverId: string) => {
    if (!serverId) return;
    recordRecentItem({
        artwork: {
            imageId: station.imageId,
            imageItemType: LibraryItem.RADIO_STATION,
            imageUrl: station.imageUrl,
            kind: 'music',
            serverId,
        },
        itemId: station.id,
        mediaType: 'radio',
        radioStreamUrl: station.streamUrl,
        serverId,
        subtitle: withDetail('Radio', station.homepageUrl || 'Internet station'),
        title: station.name,
    });
};

const getAbsTitle = (item: AudiobookshelfLibraryItem) =>
    item.media?.metadata?.title ?? item.name ?? 'Untitled';

const getAbsAuthor = (item: AudiobookshelfLibraryItem) => {
    const meta = item.media?.metadata;
    return (
        meta?.author ??
        meta?.authorName ??
        item.media?.authorName ??
        meta?.authors?.map((author) => author.name).join(', ') ??
        item.media?.authors?.map((author) => author.name).join(', ') ??
        ''
    );
};

export const recordRecentAudiobook = (item: AudiobookshelfLibraryItem, serverId: string) => {
    if (!serverId) return;
    const publishedYear =
        item.media?.metadata?.publishedYear ?? item.media?.publishedYear ?? undefined;

    recordRecentItem({
        artwork: {
            fallbackIcon: 'metadata',
            itemId: item.id,
            kind: 'abs',
        },
        itemId: item.id,
        mediaType: 'audiobook',
        rawAbsItem: item,
        serverId,
        subtitle: withDetail('Audiobook', getAbsAuthor(item) || publishedYear),
        title: getAbsTitle(item),
    });
};

export const recordRecentPodcast = (item: AudiobookshelfLibraryItem, serverId: string) => {
    if (!serverId) return;
    recordRecentItem({
        artwork: {
            fallbackIcon: 'microphone',
            itemId: item.id,
            kind: 'abs',
        },
        itemId: item.id,
        mediaType: 'podcast',
        rawAbsItem: item,
        serverId,
        subtitle: withDetail(
            'Podcast',
            countText(item.numEpisodes, 'episode') || getAbsAuthor(item),
        ),
        title: getAbsTitle(item),
    });
};
