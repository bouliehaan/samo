import {
    addMobileTracksToPlaylist,
    createMobilePlaylist,
    deleteMobilePlaylist,
    getMobileContentSource,
    isMobileExploPlaylistDetail,
    isMobilePlaylistDetailEditable,
    keepMobileExploTracks,
    loadMobileMediaDetail,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    removeMobileTracksFromPlaylist,
} from '@samo/core/mobile';
import { Alert } from 'react-native';

import { topUpDownloadedPlaylists } from '../services/downloaded-playlist-topup';
import { triggerCatalogSyncNow } from '../services/headless-catalog-sync';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { setHomeContentState } from '../state/app-navigation';
import { getAuthSession } from '../state/auth-session';
import {
    getMediaOverlays,
    setContextMenuFeedback,
    setContextMenuTarget,
    setPlaylistMenuRoot,
    setPlaylistMenuRootState,
} from '../state/media-overlays';
import { findAuthForSource } from './favorites-handlers';
import { updateLoadedMediaDetail } from './media-detail-handlers';

/**
 * Long-press → Delete on a playlist row. Confirms, deletes on the server,
 * then drops the playlist from the loaded Home content OPTIMISTICALLY so the
 * Playlists tab updates on the next frame — the background sync reconciles
 * the mirror afterwards (same trust-the-server-later shape as playlist adds).
 */
export const handleDeletePlaylistForItem = (item: AndroidRecentContentSourceItem): void => {
    const auth = findAuthForSource(item.source?.id);
    if (!auth) {
        setContextMenuFeedback('Deleting playlists is only available for Samo servers.');
        return;
    }
    Alert.alert('Delete playlist', `Delete "${item.title}"? This cannot be undone.`, [
        { style: 'cancel', text: 'Cancel' },
        {
            style: 'destructive',
            text: 'Delete',
            onPress: () => {
                void (async () => {
                    try {
                        await deleteMobilePlaylist({
                            authentication: auth,
                            playlistId: item.id,
                        });
                        setContextMenuTarget(null);
                        setContextMenuFeedback(null);
                        setHomeContentState((current) => {
                            if (current.status !== 'loaded') {
                                return current;
                            }
                            let changed = false;
                            const sections = current.content.sections.map((section) => {
                                const items = section.items.filter(
                                    (candidate) =>
                                        candidate.type !== MobileHomeItemType.PLAYLIST ||
                                        candidate.id !== item.id,
                                );
                                if (items.length === section.items.length) {
                                    return section;
                                }
                                changed = true;
                                return { ...section, items };
                            });
                            return changed
                                ? { ...current, content: { ...current.content, sections } }
                                : current;
                        });
                        void triggerCatalogSyncNow();
                    } catch (error) {
                        setContextMenuFeedback(
                            error instanceof Error
                                ? error.message
                                : 'Failed to delete playlist',
                        );
                    }
                })();
            },
        },
    ]);
};

/**
 * Long-press a track inside a playlist → Remove from Playlist.
 *
 * The row disappears before the network is touched, and comes back if the
 * server refuses. Membership edits go through a read-modify-write against the
 * server's current list (Samo's playlist API takes the whole list, not a
 * delta), so committing first would leave the user watching a spinner through
 * two round trips to delete one row — while the outcome is already known: the
 * track goes, everything else stays. The optimistic write is a plain list
 * splice, so restoring it is exact rather than an approximation.
 *
 * The on-device mirror keeps the old membership until the next sync, which is
 * why the catalog sync is kicked on success — the same contract every other
 * playlist mutation here runs on.
 */
export const handleRemoveTrackFromPlaylist = (
    track: MobileMediaTrack,
    detail: MobileMediaDetail,
): void => {
    if (!isMobilePlaylistDetailEditable(detail)) {
        setContextMenuFeedback('This playlist cannot be edited.');
        return;
    }

    const auth = findAuthForSource(detail.source.id);
    if (!auth) {
        setContextMenuFeedback('The server for this playlist is no longer connected.');
        return;
    }

    Alert.alert(
        'Remove from playlist',
        `Remove "${track.title}" from "${detail.title}"?`,
        [
            { style: 'cancel', text: 'Cancel' },
            {
                style: 'destructive',
                text: 'Remove',
                onPress: () => {
                    setContextMenuTarget(null);
                    setContextMenuFeedback(null);

                    const previous = updateLoadedMediaDetail(detail.id, (current) => {
                        const tracks = current.tracks.filter(
                            (candidate) => candidate.id !== track.id,
                        );
                        return tracks.length === current.tracks.length
                            ? current
                            : { ...current, tracks };
                    });

                    void (async () => {
                        try {
                            await removeMobileTracksFromPlaylist({
                                authentication: auth,
                                playlistId: detail.id,
                                songIds: [track.id],
                            });
                            void triggerCatalogSyncNow();
                        } catch (error) {
                            if (previous) {
                                updateLoadedMediaDetail(detail.id, () => previous);
                            }
                            Alert.alert(
                                'Remove from playlist',
                                error instanceof Error
                                    ? error.message
                                    : 'Failed to update playlist',
                            );
                        }
                    })();
                },
            },
        ],
    );
};

export const handleOpenAddToPlaylistForSong = (
    track: MobileMediaTrack,
    sourceId: string | undefined,
    fromExplo = false,
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
    setPlaylistMenuRoot({ fromExplo, kind: 'track', mode: 'add', sourceId, track });
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
        let songIds = [playlistMenuRoot.track.id];

        // An Explore track's file lives in the drop folder that the weekly run
        // empties, so storing that id in a playlist leaves an entry which
        // disappears along with the file. Copy it into the library first and
        // add the copy — the one thing that makes "add to playlist" mean
        // anything for a track from Explore.
        //
        // Not optimistic like the ordinary path below: this waits on a file
        // copy and a scan, so claiming success first would be a lie often
        // enough to matter.
        if (playlistMenuRoot.fromExplo) {
            setPlaylistMenuRootState({ playlistId: playlist.id, status: 'loading' });
            try {
                const kept = await keepMobileExploTracks({
                    authentication: auth,
                    trackIds: [playlistMenuRoot.track.id],
                });
                const libraryTrackId = kept.results.find(
                    (result) => result.libraryTrackId,
                )?.libraryTrackId;
                if (!libraryTrackId) {
                    setPlaylistMenuRootState({
                        message:
                            kept.results.find((result) => result.error)?.error ??
                            'Saved to your library, but it is not indexed yet — try again shortly.',
                        status: 'error',
                    });
                    return;
                }
                songIds = [libraryTrackId];
            } catch (error) {
                setPlaylistMenuRootState({
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Could not save this track to your library.',
                    status: 'error',
                });
                return;
            }
        }

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
            // If this playlist is held offline, the track just added belongs
            // offline too — a download taken before the add would otherwise
            // stay a snapshot of the older playlist forever.
            void topUpDownloadedPlaylists({
                playlistId: playlist.id,
                sourceId: playlist.source?.id,
            });
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
        void topUpDownloadedPlaylists({
            playlistId: playlist.id,
            sourceId: playlist.source?.id,
        });
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


/**
 * Copies one or more Explore drops into the music library.
 *
 * Explore is a rotating window over samo's explo drop folder, and the weekly
 * run empties that folder — so a track nobody keeps is gone by the next run.
 * The server does the copying and writes samo's identified metadata into the
 * copy; the original is left in Explore for rotation to collect, so the list
 * does not shift under you while you work through it.
 */
export const handleKeepExploTracks = async (
    tracks: MobileMediaTrack[],
    detail: MobileMediaDetail,
): Promise<void> => {
    if (!isMobileExploPlaylistDetail(detail)) {
        setContextMenuFeedback('Only Explore tracks can be kept.');
        return;
    }
    if (tracks.length === 0) {
        return;
    }

    const auth = findAuthForSource(detail.source.id);
    if (!auth) {
        setContextMenuFeedback('The server for this playlist is no longer connected.');
        return;
    }

    // Deliberately does NOT close the menu: feedback renders inside the sheet
    // (MediaContextMenu), so closing first means the result is written into
    // something already gone and the tap looks like it did nothing. Favorites
    // works the same way — set the message, leave the sheet up, let the user
    // dismiss it once they have read it.
    setContextMenuFeedback(tracks.length > 1 ? `Keeping ${tracks.length} tracks…` : 'Keeping…');

    try {
        const response = await keepMobileExploTracks({
            authentication: auth,
            trackIds: tracks.map((track) => track.id),
        });

        // A partial result is the normal case — a track already in the library
        // is skipped rather than failed — so report the split instead of a
        // bare "done" that leaves you unsure what happened.
        const parts: string[] = [];
        if (response.kept > 0) parts.push(`${response.kept} kept`);
        if (response.alreadyInLibrary > 0)
            parts.push(`${response.alreadyInLibrary} already in library`);
        if (response.failed > 0) parts.push(`${response.failed} failed`);
        setContextMenuFeedback(parts.join(', ') || 'Nothing to keep');

        if (response.kept > 0) {
            triggerCatalogSyncNow();
        }
    } catch (error) {
        setContextMenuFeedback(
            error instanceof Error ? error.message : 'Could not keep these tracks.',
        );
    }
};
