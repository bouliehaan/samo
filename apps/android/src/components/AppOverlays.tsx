import {
    findServerAuthenticationForSource,
    ServerType,
} from '@samo/core/server';
import { type MobileHomeItem, type MobileMediaTrack } from '@samo/core/mobile';
import { memo, useMemo } from 'react';

import {
    handleAddToPlaylistFromRoot,
    handleCreatePlaylistFromRoot,
} from '../handlers/playlist-handlers';
import { bumpBookInfoRequestId } from '../handlers/handler-state';
import { useAndroidContextMenu } from '../hooks/use-android-context-menu';
import { useAppNavigationSelector } from '../state/app-navigation';
import { useAuthSessionSelector } from '../state/auth-session';
import {
    setBookInfoState,
    setPlaylistMenuRoot,
    setPlaylistMenuRootState,
    setStreamInfoItem,
    useMediaOverlaysSelector,
} from '../state/media-overlays';
import { getPlaylistTargetsForRoot } from '../utils/playlist-targets';
import { BookInformationModal } from './BookInformationModal';
import { MediaContextMenu } from './MediaContextMenu';
import { StreamInfoModal } from './StreamInfoModal';
import { TrackPlaylistMenu } from './TrackPlaylistMenu';

const handleClosePlaylistMenu = () => {
    setPlaylistMenuRoot(null);
    setPlaylistMenuRootState({ status: 'idle' });
};
const handleAddToPlaylist = (playlist: MobileHomeItem) =>
    void handleAddToPlaylistFromRoot(playlist);
const handleCreatePlaylist = (name: string) => void handleCreatePlaylistFromRoot(name);
const handleCloseStreamInfo = () => setStreamInfoItem(null);
const handleCloseBookInfo = () => {
    // Invalidate any in-flight detail load for the modal being dismissed so a
    // late response can't reopen it.
    bumpBookInfoRequestId();
    setBookInfoState({ status: 'idle' });
};

const ContextMenuHost = memo(function ContextMenuHost() {
    const contextMenu = useAndroidContextMenu();
    return (
        <MediaContextMenu
            actions={contextMenu.actions}
            artworkImageId={contextMenu.artworkImageId}
            artworkUrl={contextMenu.artworkUrl}
            contentSource={contextMenu.contentSource}
            eyebrow={contextMenu.eyebrow}
            feedback={contextMenu.feedback}
            isCircularArtwork={contextMenu.isCircularArtwork}
            onClose={contextMenu.onClose}
            subtitle={contextMenu.subtitle}
            target={contextMenu.target}
            title={contextMenu.title}
        />
    );
});

const PlaylistMenuHost = memo(function PlaylistMenuHost() {
    const playlistMenuRoot = useMediaOverlaysSelector((state) => state.playlistMenuRoot);
    const playlistMenuRootState = useMediaOverlaysSelector(
        (state) => state.playlistMenuRootState,
    );
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    // Guarded selector: while the menu is closed this returns a stable null,
    // so Home content churn (sync derives) never re-renders the closed host.
    const homeContentState = useAppNavigationSelector((state) =>
        playlistMenuRoot ? state.homeContentState : null,
    );

    const playlistTargets = useMemo(
        () =>
            homeContentState
                ? getPlaylistTargetsForRoot(homeContentState, playlistMenuRoot?.sourceId)
                : [],
        [homeContentState, playlistMenuRoot?.sourceId],
    );

    const canCreate = useMemo(() => {
        if (!playlistMenuRoot?.sourceId) {
            return false;
        }
        const auth = findServerAuthenticationForSource(serverConnection, {
            id: playlistMenuRoot.sourceId,
        });
        return auth?.type === ServerType.SAMO;
    }, [playlistMenuRoot?.sourceId, serverConnection]);

    const mode = !playlistMenuRoot
        ? ('add' as const)
        : playlistMenuRoot.kind === 'standalone'
          ? ('standalone' as const)
          : (playlistMenuRoot.mode ?? 'add');

    const track = useMemo<MobileMediaTrack | null>(() => {
        if (!playlistMenuRoot || playlistMenuRoot.kind === 'standalone') {
            return null;
        }
        if (playlistMenuRoot.kind === 'track') {
            return playlistMenuRoot.track;
        }
        return {
            id: playlistMenuRoot.collectionItem.id,
            title: playlistMenuRoot.collectionItem.title,
        } as MobileMediaTrack;
    }, [playlistMenuRoot]);

    return (
        <TrackPlaylistMenu
            actionState={playlistMenuRootState}
            canCreatePlaylist={canCreate}
            mode={mode}
            onAddToPlaylist={handleAddToPlaylist}
            onClose={handleClosePlaylistMenu}
            onCreatePlaylist={handleCreatePlaylist}
            open={playlistMenuRoot !== null}
            playlists={playlistTargets}
            track={track}
        />
    );
});

const StreamInfoHost = memo(function StreamInfoHost() {
    const streamInfoItem = useMediaOverlaysSelector((state) => state.streamInfoItem);
    return <StreamInfoModal item={streamInfoItem} onClose={handleCloseStreamInfo} />;
});

const BookInfoHost = memo(function BookInfoHost() {
    const bookInfoState = useMediaOverlaysSelector((state) => state.bookInfoState);
    return <BookInformationModal onClose={handleCloseBookInfo} state={bookInfoState} />;
});

/**
 * All the small modal overlays (context menu, playlist sheet, stream info,
 * book info). Each host subscribes to exactly the overlay-store slice it
 * renders, so opening a long-press menu re-renders one host — not App.
 */
export const AppOverlays = memo(function AppOverlays() {
    return (
        <>
            <ContextMenuHost />
            <StreamInfoHost />
            <BookInfoHost />
            <PlaylistMenuHost />
        </>
    );
});
