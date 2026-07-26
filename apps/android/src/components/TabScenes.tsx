import { SAMO_MOBILE_TABS, type SamoMobileTabId } from '@samo/core/navigation';
import { memo, useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { handleAddRadioStation } from '../handlers/info-handlers';
import {
    handleOpenViewAll,
    handleSelectMediaItem,
    prefetchMediaDetailCache,
} from '../handlers/media-detail-handlers';
import { handleShuffleHomeItems } from '../handlers/playback-handlers';
import { handleOpenCreatePlaylistStandalone } from '../handlers/playlist-handlers';
import { useReducedMotionPreference } from '../hooks/use-reduced-motion-preference';
import { EmptyServerBackedScreen } from '../screens/EmptyServerBackedScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { MediaTypeGridScreen } from '../screens/MediaTypeGridScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { RadioScreen } from '../screens/RadioScreen';
import { triggerCatalogSyncNow } from '../services/headless-catalog-sync';
import { loadHomeForConnection } from '../services/home-flow';
import { ServerType } from '@samo/core/server';
import {
    setActiveUtilityScreen,
    useAppNavigationSelector,
} from '../state/app-navigation';
import { subscribeTabReselected } from '../state/tab-reselect';
import { useAuthSessionSelector } from '../state/auth-session';
import { styles } from '../theme/styles';
import { getTabTitle } from '../utils/tab-title';
import { ErrorBoundary } from './ErrorBoundary';
import { TabSceneContainer } from './TabSceneContainer';

const handleOpenManageServers = () => setActiveUtilityScreen('manage-servers');

const HomeTabScene = memo(function HomeTabScene() {
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const [isRefreshingHome, setIsRefreshingHome] = useState(false);

    const handleRefreshHome = useCallback(async (): Promise<void> => {
        if (!serverConnection) {
            return;
        }
        setIsRefreshingHome(true);
        // Keep the on-device library mirror fresh, but OFF the spinner's critical
        // path — the Kotlin engine runs the delta in the background and the
        // sync-completed bridge handles the artwork prefetch afterwards.
        void triggerCatalogSyncNow();
        try {
            // The spinner waits ONLY on the live-section re-fetch (discover /
            // podcast feed / radio) — the library sections re-derive from the
            // mirror when the sync above completes. Capped so a slow network
            // releases the spinner instead of hanging it.
            await Promise.race([
                loadHomeForConnection(serverConnection),
                new Promise<void>((resolve) => setTimeout(resolve, 10000)),
            ]);
        } catch {
            // swallow — pull-to-refresh never throws into the UI
        } finally {
            setIsRefreshingHome(false);
        }
    }, [serverConnection]);

    // Home tab re-tap is now the ONLY way to refresh: the pull-down gesture
    // belongs to search (see useSearchPull), so Home's RefreshControl is
    // display-only. The re-tap glides the page to the top and fires the refresh;
    // the spinner still shows via the isRefreshingHome → RefreshControl wiring.
    // The reselect signal now carries every tab's id — ignore all but Home's.
    useEffect(
        () =>
            subscribeTabReselected((tabId) => {
                if (tabId === 'home') {
                    void handleRefreshHome();
                }
            }),
        [handleRefreshHome],
    );

    return (
        <HomeScreen
            isRefreshing={isRefreshingHome}
            onManageServers={handleOpenManageServers}
            onPrefetchItem={prefetchMediaDetailCache}
            onRefresh={serverConnection ? handleRefreshHome : undefined}
            onSelectItem={handleSelectMediaItem}
            onViewAll={handleOpenViewAll}
            serverConnection={serverConnection}
        />
    );
});

const PlaylistsTabScene = memo(function PlaylistsTabScene() {
    const canCreatePlaylists = useAuthSessionSelector(
        (state) => state.serverConnection?.type === ServerType.SAMO,
    );
    return (
        <PlaylistsScreen
            onCreatePlaylist={handleOpenCreatePlaylistStandalone}
            onSelectItem={handleSelectMediaItem}
            onShufflePlay={handleShuffleHomeItems}
            showCreatePlaylist={canCreatePlaylists}
        />
    );
});

const PodcastsTabScene = memo(function PodcastsTabScene() {
    return <MediaTypeGridScreen mediaType="podcasts" />;
});

const AudiobooksTabScene = memo(function AudiobooksTabScene() {
    return <MediaTypeGridScreen mediaType="audiobooks" />;
});

const RadioTabScene = memo(function RadioTabScene() {
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    return (
        <RadioScreen
            onAddStation={handleAddRadioStation}
            onSelectItem={handleSelectMediaItem}
            serverConnection={serverConnection}
        />
    );
});

const renderTabSceneContent = (tabId: SamoMobileTabId) =>
    tabId === 'home' ? (
        <HomeTabScene />
    ) : tabId === 'playlists' ? (
        <PlaylistsTabScene />
    ) : tabId === 'podcasts' ? (
        <PodcastsTabScene />
    ) : tabId === 'audiobooks' ? (
        <AudiobooksTabScene />
    ) : tabId === 'radio' ? (
        <RadioTabScene />
    ) : (
        <EmptyServerBackedScreen tabTitle={getTabTitle(tabId)} />
    );

/**
 * The five tab scenes with lazy mounting and the dissolve switcher. Subscribes
 * to the navigation slices that decide which scene is visible/interactive, so
 * a tab switch re-renders this host — not App.
 */
export const TabScenes = memo(function TabScenes() {
    const reducedMotion = useReducedMotionPreference();
    const activeTab = useAppNavigationSelector((state) => state.activeTab);
    const visitedTabs = useAppNavigationSelector((state) => state.visitedTabs);
    // Any overlay above the tab scenes swallows their pointer events.
    const isCovered = useAppNavigationSelector(
        (state) =>
            (state.activeUtilityScreen !== null && state.activeUtilityScreen !== 'view-all') ||
            state.mediaDetailState.status !== 'idle' ||
            (state.activeUtilityScreen === 'view-all' && state.viewAllRoute !== null),
    );

    return (
        <View pointerEvents={isCovered ? 'none' : 'auto'} style={styles.tabSceneHost}>
            {SAMO_MOBILE_TABS.map((tab) => {
                const isSceneActive = tab.id === activeTab;
                const isSceneMounted = visitedTabs.has(tab.id);

                // Every tab owns its own scroll host — the FlashList tabs so a
                // same-orientation VirtualizedList isn't nested in a ScrollView
                // (which would disable virtualization), and Radio a plain
                // Reanimated.ScrollView. That ownership is also what lets each
                // tab carry the pull-down search drawer, whose reveal rides its
                // host's own animated scroll handler.
                return (
                    <TabSceneContainer
                        isActive={isSceneActive}
                        key={tab.id}
                        reducedMotion={reducedMotion}
                    >
                        <ErrorBoundary label={`tab-${tab.id}`}>
                            {isSceneMounted ? renderTabSceneContent(tab.id) : null}
                        </ErrorBoundary>
                    </TabSceneContainer>
                );
            })}
        </View>
    );
});
