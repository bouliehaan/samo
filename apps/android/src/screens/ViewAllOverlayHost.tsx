import { memo } from 'react';
import Reanimated, { FadeIn } from 'react-native-reanimated';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { bumpViewAllFetchToken } from '../handlers/handler-state';
import { handleSelectMediaItem } from '../handlers/media-detail-handlers';
import { useReducedMotionPreference } from '../hooks/use-reduced-motion-preference';
import {
    setActiveUtilityScreen,
    setViewAllFullState,
    setViewAllRoute,
    useAppNavigationSelector,
} from '../state/app-navigation';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
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
    const reducedMotion = useReducedMotionPreference();
    const isOpen = useAppNavigationSelector(
        (state) => state.activeUtilityScreen === 'view-all' && state.viewAllRoute !== null,
    );
    const viewAllRoute = useAppNavigationSelector((state) => state.viewAllRoute);
    const viewAllFullState = useAppNavigationSelector((state) => state.viewAllFullState);

    if (!isOpen || !viewAllRoute) {
        return null;
    }

    return (
        <Reanimated.View
            entering={reducedMotion ? undefined : FadeIn.duration(180)}
            style={[styles.navOverlay, styles.navOverlayTop]}
        >
            <ErrorBoundary label="ViewAllScreen">
                <ViewAllScreen
                    fullState={viewAllFullState}
                    onBack={handleViewAllBack}
                    onSelectItem={handleSelectViewAllItem}
                    route={viewAllRoute}
                />
            </ErrorBoundary>
        </Reanimated.View>
    );
});
