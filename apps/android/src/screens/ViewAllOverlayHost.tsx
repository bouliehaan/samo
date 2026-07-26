import { memo, useRef } from 'react';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { bumpViewAllFetchToken } from '../handlers/handler-state';
import { handleSelectMediaItem } from '../handlers/media-detail-handlers';
import { usePresenceTransition } from '../hooks/use-presence-transition';
import {
    setActiveUtilityScreen,
    setViewAllFullState,
    setViewAllRoute,
    useAppNavigationSelector,
} from '../state/app-navigation';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { travel } from '../theme/motion';
import { styles } from '../theme/styles';
import { ViewAllScreen } from './ViewAllScreen';

export const handleViewAllBack = (): void => {
    setActiveUtilityScreen(null);
    setViewAllRoute(null);
    bumpViewAllFetchToken();
    setViewAllFullState({ status: 'idle' });
};

const handleSelectViewAllItem = (item: AndroidRecentContentSourceItem): void => {
    handleViewAllBack();
    void handleSelectMediaItem(item);
};

/** The full-library "View All" overlay; self-subscribed like the other hosts. */
export const ViewAllOverlayHost = memo(function ViewAllOverlayHost() {
    const isOpen = useAppNavigationSelector(
        (state) => state.activeUtilityScreen === 'view-all' && state.viewAllRoute !== null,
    );
    const viewAllRoute = useAppNavigationSelector((state) => state.viewAllRoute);
    const viewAllFullState = useAppNavigationSelector((state) => state.viewAllFullState);

    // Was a bare `entering={FadeIn}` — an entrance with no matching exit, so
    // closing View All cut to the page underneath on a frame boundary. Both
    // directions now come off one progress value, and the rise gives the
    // dismissal a direction to travel in rather than just vanishing.
    const { isMounted, progress } = usePresenceTransition(isOpen);

    // The route is nulled by handleViewAllBack before the exit has played;
    // hold the last one so the closing frames still show the list being left.
    const lastRouteRef = useRef(viewAllRoute);
    if (viewAllRoute) {
        lastRouteRef.current = viewAllRoute;
    }
    const route = viewAllRoute ?? lastRouteRef.current;

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ translateY: (1 - progress.value) * travel.screen }],
    }));

    if (!isMounted || !route) {
        return null;
    }

    return (
        <Reanimated.View
            pointerEvents={isOpen ? 'auto' : 'none'}
            style={[styles.navOverlay, styles.navOverlayTop, overlayStyle]}
        >
            <ErrorBoundary label="ViewAllScreen">
                <ViewAllScreen
                    fullState={viewAllFullState}
                    onBack={handleViewAllBack}
                    onSelectItem={handleSelectViewAllItem}
                    route={route}
                />
            </ErrorBoundary>
        </Reanimated.View>
    );
});
