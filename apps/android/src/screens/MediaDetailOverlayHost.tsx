import { memo, useEffect, useRef } from 'react';
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import {
    handleSelectMediaItem,
    reloadCurrentMediaDetail,
} from '../handlers/media-detail-handlers';
import {
    handlePlayMediaTrack,
    handleShuffleDetailTracks,
} from '../handlers/playback-handlers';
import { useReducedMotionPreference } from '../hooks/use-reduced-motion-preference';
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
    const reducedMotion = useReducedMotionPreference();
    const mediaDetailState = useAppNavigationSelector((state) => state.mediaDetailState);
    const mediaDetailKey = useAppNavigationSelector((state) => state.mediaDetailKey);
    const activeUtilityScreen = useAppNavigationSelector((state) => state.activeUtilityScreen);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);

    const frozenDetailStateRef = useRef(mediaDetailState);
    const frozenDetailKeyRef = useRef(mediaDetailKey);
    if (mediaDetailState.status === 'loaded') {
        frozenDetailStateRef.current = mediaDetailState;
        frozenDetailKeyRef.current = mediaDetailKey;
    }
    const detailOverlayOpen = activeUtilityScreen === null && mediaDetailState.status !== 'idle';
    const hasCachedDetailShell = frozenDetailStateRef.current.status === 'loaded';

    // Detail overlay entrance: a quick fade + small rise so opening a playlist /
    // album / artist reads as a card lifting in rather than a hard cut. Honors
    // the OS reduced-motion setting.
    const detailOverlayProgress = useSharedValue(0);
    useEffect(() => {
        // Ease-OUT (fast start) so the content is visibly there within a frame or
        // two — the tap is confirmed immediately instead of fading up from black.
        // Open carries a touch longer for presence; back-to-home stays instant.
        detailOverlayProgress.value = withTiming(detailOverlayOpen ? 1 : 0, {
            duration: reducedMotion ? 0 : detailOverlayOpen ? 200 : 110,
            easing: Easing.out(Easing.cubic),
        });
    }, [detailOverlayOpen, detailOverlayProgress, reducedMotion]);
    const detailOverlayStyle = useAnimatedStyle(() => ({
        opacity: detailOverlayProgress.value,
        transform: [{ translateY: (1 - detailOverlayProgress.value) * 16 }],
    }));

    if (activeUtilityScreen !== null || (!detailOverlayOpen && !hasCachedDetailShell)) {
        return null;
    }

    return (
        <Reanimated.View
            pointerEvents={detailOverlayOpen ? 'auto' : 'none'}
            style={[styles.navOverlay, detailOverlayStyle]}
        >
            <MediaDetailContent
                mediaDetailKey={detailOverlayOpen ? mediaDetailKey : frozenDetailKeyRef.current}
                mediaDetailState={
                    detailOverlayOpen ? mediaDetailState : frozenDetailStateRef.current
                }
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
