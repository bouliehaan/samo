import {
    addMobileTracksToPlaylist,
    createMobilePlaylist,
    getMobileContentSource,
    loadMobileMediaDetail,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import { Alert } from 'react-native';

import { triggerCatalogSyncNow } from '../services/headless-catalog-sync';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { getAuthSession } from '../state/auth-session';
import {
    getMediaOverlays,
    setContextMenuFeedback,
    setContextMenuTarget,
    setPlaylistMenuRoot,
    setPlaylistMenuRootState,
} from '../state/media-overlays';
import { findAuthForSource } from './favorites-handlers';

export const handleOpenAddToPlaylistForSong = (
    track: MobileMediaTrack,
    sourceId: string | undefined,
): void => {
    if (!sourceId) {
        setContextMenuFeedback('Could not find the server for this song.');
        return;
    }
    if (track.playback?.source !== 'music') {
        setContextMenuFeedback('Only music tracks can be added to playlists.');
        return;
    }
    setContextMenuTarget(null);
    setPlaylistMenuRoot({ kind: 'track', mode: 'add', sourceId, track });
    setPlaylistMenuRootState({ status: 'idle' });
};

export const handleOpenCreatePlaylistForSong = (
    track: MobileMediaTrack,
    sourceId: string | undefined,
): void => {
    if (!sourceId) {
        setContextMenuFeedback('Could not find the server for this song.');
        return;
    }
    if (track.playback?.source !== 'music') {
        setContextMenuFeedback('Only music tracks can be added to playlists.');
        return;
    }
    setContextMenuTarget(null);
    setPlaylistMenuRoot({ kind: 'track', mode: 'create', sourceId, track });
    setPlaylistMenuRootState({ status: 'idle' });
};

export const handleOpenAddToPlaylistForCollection = (
    collectionItem: AndroidRecentContentSourceItem,
): void => {
    const sourceId = collectionItem.source?.id;
    if (!sourceId) {
        setContextMenuFeedback('Could not find the server for this item.');
        return;
    }
    const auth = findAuthForSource(sourceId);
    if (!auth) {
        setContextMenuFeedback('Adding to playlists is only available for music server items.');
        return;
    }
    setContextMenuTarget(null);
    setPlaylistMenuRoot({ collectionItem, kind: 'collection', mode: 'add', sourceId });
    setPlaylistMenuRootState({ status: 'idle' });
};

export const handleOpenCreatePlaylistForCollection = (
    collectionItem: AndroidRecentContentSourceItem,
): void => {
    const sourceId = collectionItem.source?.id;
    if (!sourceId) {
        setContextMenuFeedback('Could not find the server for this item.');
        return;
    }
    const auth = findAuthForSource(sourceId);
    if (!auth) {
        setContextMenuFeedback('Creating playlists is only available for music server items.');
        return;
    }
    setContextMenuTarget(null);
    setPlaylistMenuRoot({ collectionItem, kind: 'collection', mode: 'create', sourceId });
    setPlaylistMenuRootState({ status: 'idle' });
};

export const handleOpenCreatePlaylistStandalone = (): void => {
    const auth = getAuthSession().serverConnection;

    if (!auth) {
        Alert.alert('No music server', 'Connect a Samo server to create playlists.');
        return;
    }

    setContextMenuTarget(null);
    setPlaylistMenuRoot({
        kind: 'standalone',
        sourceId: getMobileContentSource(auth).id,
    });
    setPlaylistMenuRootState({ status: 'idle' });
};

export const handleCreatePlaylistFromRoot = async (name: string): Promise<void> => {
    const playlistMenuRoot = getMediaOverlays().playlistMenuRoot;
    if (!playlistMenuRoot) {
        return;
    }

    const auth = findAuthForSource(playlistMenuRoot.sourceId);

    if (!auth) {
        setPlaylistMenuRootState({
            message: 'The server for this item is no longer connected.',
            status: 'error',
        });
        return;
    }

    setPlaylistMenuRootState({ playlistId: '__create__', status: 'loading' });

    try {
        const songIds =
            playlistMenuRoot.kind === 'track' ? [playlistMenuRoot.track.id] : undefined;
        const playlist = await createMobilePlaylist({
            authentication: auth,
            name,
            songIds,
        });

        if (playlistMenuRoot.kind === 'collection') {
            const sourceDetail = await loadMobileMediaDetail({
                authentication: auth,
                id: playlistMenuRoot.collectionItem.id,
                type:
                    playlistMenuRoot.collectionItem.type === MobileHomeItemType.PLAYLIST
                        ? MobileMediaDetailType.PLAYLIST
                        : MobileMediaDetailType.ALBUM,
            });
            const collectionSongIds = sourceDetail.tracks
                .filter((track) => track.playback?.source === 'music')
                .map((track) => track.id);

            if (collectionSongIds.length > 0) {
                await addMobileTracksToPlaylist({
                    authentication: auth,
                    playlistId: playlist.id,
                    songIds: collectionSongIds,
                });
            }
        }

        // Background sync (non-blocking) so the brand-new playlist lands in the
        // mirror and the coalesced post-sync derive surfaces it on Home —
        // instead of blocking the success toast on a network fetch + derive
        // that can't even show the playlist yet (the mirror has no row for it).
        void triggerCatalogSyncNow();
        setPlaylistMenuRootState({
            message: `Created ${playlist.title}`,
            status: 'success',
        });
    } catch (error) {
        setPlaylistMenuRootState({
            message: error instanceof Error ? error.message : 'Failed to create playlist',
            status: 'error',
        });
    }
};

export const handleAddToPlaylistFromRoot = async (playlist: MobileHomeItem): Promise<void> => {
    const playlistMenuRoot = getMediaOverlays().playlistMenuRoot;
    if (!playlistMenuRoot) {
        return;
    }

    if (playlist.source?.id !== playlistMenuRoot.sourceId) {
        setPlaylistMenuRootState({
            message: 'Choose a playlist from the same music server.',
            status: 'error',
        });
        return;
    }

    const auth = findAuthForSource(playlistMenuRoot.sourceId);

    if (!auth) {
        setPlaylistMenuRootState({
            message: 'The server for this item is no longer connected.',
            status: 'error',
        });
        return;
    }

    if (playlistMenuRoot.kind === 'standalone') {
        return;
    }

    // Track add: the song id is already known, so commit optimistically —
    // show success immediately (the sheet auto-dismisses on success) and
    // write to the server in the background. Adding a song to a playlist
    // should feel instant. A fast failure flips the still-open sheet to an
    // error before it dismisses; the background sync reconciles real
    // membership either way.
    if (playlistMenuRoot.kind === 'track') {
        const songIds = [playlistMenuRoot.track.id];
        setPlaylistMenuRootState({
            message: `Added to ${playlist.title}`,
            status: 'success',
        });
        try {
            await addMobileTracksToPlaylist({
                authentication: auth,
                playlistId: playlist.id,
                songIds,
            });
            void triggerCatalogSyncNow();
        } catch (error) {
            setPlaylistMenuRootState({
                message: error instanceof Error ? error.message : 'Failed to add to playlist',
                status: 'error',
            });
        }
        return;
    }

    // Collection add: the collection's tracks must be fetched before we know
    // what to add, so this path keeps a real loading state.
    setPlaylistMenuRootState({ playlistId: playlist.id, status: 'loading' });
    try {
        const sourceDetail = await loadMobileMediaDetail({
            authentication: auth,
            id: playlistMenuRoot.collectionItem.id,
            type:
                playlistMenuRoot.collectionItem.type === MobileHomeItemType.PLAYLIST
                    ? MobileMediaDetailType.PLAYLIST
                    : MobileMediaDetailType.ALBUM,
        });
        const songIds = sourceDetail.tracks
            .filter((track) => track.playback?.source === 'music')
            .map((track) => track.id);
        if (songIds.length === 0) {
            setPlaylistMenuRootState({
                message: 'No music tracks were found to add.',
                status: 'error',
            });
            return;
        }

        await addMobileTracksToPlaylist({
            authentication: auth,
            playlistId: playlist.id,
            songIds,
        });
        // Non-blocking background sync instead of a full Home reload — Home is
        // unchanged by adding tracks to an existing playlist; the track list
        // reconciles for the next time the playlist detail opens.
        void triggerCatalogSyncNow();
        setPlaylistMenuRootState({
            message: `Added ${songIds.length} songs to ${playlist.title}`,
            status: 'success',
        });
    } catch (error) {
        setPlaylistMenuRootState({
            message: error instanceof Error ? error.message : 'Failed to add to playlist',
            status: 'error',
        });
    }
};
