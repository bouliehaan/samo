import { memo, useRef } from 'react';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';

import { handleSelectMediaItem, reloadCurrentMediaDetail } from '../handlers/media-detail-handlers';
import { handlePlayMediaTrack, handleShuffleDetailTracks } from '../handlers/playback-handlers';
import { usePresenceTransition } from '../hooks/use-presence-transition';
import { popMediaDetail, useAppNavigationSelector } from '../state/app-navigation';
import { useAuthSessionSelector } from '../state/auth-session';
import { styles } from '../theme/styles';
import { MediaDetailContent } from './MediaDetailScreen';

/**
 * The album/artist/playlist detail overlay. Subscribes to the navigation
 * store itself, so opening/closing/loading a detail re-renders this host —
 * not App. Keeps the last LOADED detail mounted (invisible) while closed so
 * reopening paints instantly without a remount.
 */
export const MediaDetailOverlayHost = memo(function MediaDetailOverlayHost() {
    const mediaDetailState = useAppNavigationSelector((state) => state.mediaDetailState);
    const mediaDetailKey = useAppNavigationSelector((state) => state.mediaDetailKey);
    const activeUtilityScreen = useAppNavigationSelector((state) => state.activeUtilityScreen);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);

    const detailOverlayOpen = activeUtilityScreen === null && mediaDetailState.status !== 'idle';

    // Page-level cross-fade, both directions. The exit is the new half: this
    // host returned null on the closing render, so the close animation it
    // already had never rendered a single frame. The presence hook holds the
    // subtree through it.
    const { isMounted, progress } = usePresenceTransition(detailOverlayOpen);

    // The state goes `idle` the instant back is pressed, and `idle` renders
    // NOTHING (MediaDetailScreen bails to null). Keeping the host mounted
    // through the exit would therefore fade out an empty background rather than
    // the page the user is dismissing. Hold the last real state for the exit —
    // the same "carry the value across the transition" idiom MediaDetailScreen
    // already uses for the opening artwork.
    const lastRenderedRef = useRef({ key: mediaDetailKey, state: mediaDetailState });
    if (mediaDetailState.status !== 'idle') {
        lastRenderedRef.current = { key: mediaDetailKey, state: mediaDetailState };
    }
    const rendered = detailOverlayOpen
        ? { key: mediaDetailKey, state: mediaDetailState }
        : lastRenderedRef.current;

    // Opacity ONLY, deliberately. The page's own parts are choreographed
    // (cover leads, title follows, rows cascade — see theme/choreography), and
    // a translate here would add itself to every one of them equally: the cover
    // would travel its 10dp PLUS this, the rows their 20dp plus this, and the
    // mass hierarchy that makes the assembly read as physical would flatten
    // back into the slab it replaced. The host fades; the parts move.
    const detailOverlayStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    if (activeUtilityScreen !== null || !isMounted || rendered.state.status === 'idle') {
        return null;
    }

    return (
        <Reanimated.View
            // Dead to touch the moment it starts leaving: a surface mid-exit is
            // still on screen, and a tap landing on a page that is 80% gone
            // navigates somewhere the user did not aim at.
            pointerEvents={detailOverlayOpen ? 'auto' : 'none'}
            style={[styles.navOverlay, detailOverlayStyle]}
        >
            <MediaDetailContent
                mediaDetailKey={rendered.key}
                mediaDetailState={rendered.state}
                onBack={popMediaDetail}
                onPlayTrack={handlePlayMediaTrack}
                onReloadDetail={reloadCurrentMediaDetail}
                onSelectItem={handleSelectMediaItem}
                onShufflePlay={handleShuffleDetailTracks}
                serverConnection={serverConnection}
            />
        </Reanimated.View>
    );
});
