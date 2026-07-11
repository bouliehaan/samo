import { SAMO_MOBILE_TABS, type SamoMobileTabId } from '@samo/core/navigation';
import { Fragment, memo, useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import samoLogo from '../../assets/samo-logo.png';
import { handleAddRadioStation } from '../handlers/info-handlers';
import {
    handleOpenViewAll,
    handleSelectMediaItem,
    prefetchMediaDetailCache,
} from '../handlers/media-detail-handlers';
import { handleShuffleHomeItems } from '../handlers/playback-handlers';
import { handleOpenCreatePlaylistStandalone } from '../handlers/playlist-handlers';
import { handleSearch } from '../handlers/search-handlers';
import { useReducedMotionPreference } from '../hooks/use-reduced-motion-preference';
import { useScrollContentBottomInset } from '../hooks/use-scroll-content-bottom-inset';
import { EmptyServerBackedScreen } from '../screens/EmptyServerBackedScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { RadioScreen } from '../screens/RadioScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { triggerCatalogSyncNow } from '../services/headless-catalog-sync';
import { loadHomeForConnection } from '../services/home-flow';
import { startLibraryFullCollectionLoad } from '../services/library-flow';
import { ServerType } from '@samo/core/server';
import {
    closeMediaDetail,
    setActiveUtilityScreen,
    useAppNavigationSelector,
} from '../state/app-navigation';
import { useAuthSessionSelector } from '../state/auth-session';
import { useDownloadsSelector } from '../state/downloads-state';
import { styles } from '../theme/styles';
import { getTabTitle } from '../utils/tab-title';
import { ErrorBoundary } from './ErrorBoundary';
import { TabSceneContainer } from './TabSceneContainer';
import { TopChromeBackdrop } from './TopChromeBackdrop';

const handleOpenSettings = () => {
    setActiveUtilityScreen('settings');
    closeMediaDetail();
};
const handleOpenManageServers = () => setActiveUtilityScreen('manage-servers');

const HomeTabScene = memo(function HomeTabScene() {
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isSearchOverlayOpen = useAppNavigationSelector((state) => state.isSearchOverlayOpen);
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

    return (
        <Fragment>
            {!isSearchOverlayOpen ? (
                <Fragment>
                    <TopChromeBackdrop />
                    <View style={[styles.header, styles.homeHeaderFloating]}>
                        <Text style={styles.homeHeaderTitle}>Home</Text>
                        <Pressable
                            accessibilityLabel="Settings"
                            accessibilityRole="button"
                            onPress={handleOpenSettings}
                            style={styles.appIconButton}
                        >
                            <Image source={samoLogo} style={styles.appIcon} />
                        </Pressable>
                    </View>
                </Fragment>
            ) : null}
            <HomeScreen
                isRefreshing={isRefreshingHome}
                onManageServers={handleOpenManageServers}
                onPrefetchItem={prefetchMediaDetailCache}
                onRefresh={serverConnection ? handleRefreshHome : undefined}
                onSelectItem={handleSelectMediaItem}
                onViewAll={handleOpenViewAll}
                serverConnection={serverConnection}
            />
        </Fragment>
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

const LibraryTabScene = memo(function LibraryTabScene() {
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isOfflineMode = useDownloadsSelector((state) => state.isOfflineMode);
    const libraryFullCollections = useAppNavigationSelector(
        (state) => state.libraryFullCollections,
    );
    const libraryRelevantState = useAppNavigationSelector((state) => state.libraryRelevantState);
    // True only while the Library browse is the foreground surface — the
    // alphabet rail's ephemeral A–Z flip resets when this drops.
    const isLibrarySurface = useAppNavigationSelector(
        (state) =>
            state.activeTab === 'library' &&
            state.activeUtilityScreen === null &&
            state.mediaDetailState.status === 'idle',
    );

    return (
        <LibraryScreen
            fullCollections={libraryFullCollections}
            fullCollectionsEnabled={!isOfflineMode}
            hasServerConnections={Boolean(serverConnection)}
            isForeground={isLibrarySurface}
            libraryRelevantState={libraryRelevantState}
            onEnsureFullCollections={startLibraryFullCollectionLoad}
            onSelectItem={handleSelectMediaItem}
        />
    );
});

const SearchTabScene = memo(function SearchTabScene() {
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const searchState = useAppNavigationSelector((state) => state.searchState);
    return (
        <SearchScreen
            hasServerConnections={Boolean(serverConnection)}
            onSearch={handleSearch}
            onSelectItem={handleSelectMediaItem}
            onSelectRecentItem={handleSelectMediaItem}
            searchState={searchState}
            serverConnection={serverConnection}
        />
    );
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
    ) : tabId === 'library' ? (
        <LibraryTabScene />
    ) : tabId === 'search' ? (
        <SearchTabScene />
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
    const scrollBottomInset = useScrollContentBottomInset();
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

                // Home, Library and Playlists own their own virtualized
                // FlashList, so they render bare rather than in the shared tab
                // ScrollView — nesting a same-orientation VirtualizedList inside
                // a ScrollView disables virtualization (every row mounts and
                // stays mounted for the tab's whole life). Each applies the tab
                // bottom inset on its own list. Radio and Search stay on the
                // shared ScrollView: their content is short (a handful of
                // stations; an overlay-driven search) so virtualization buys
                // nothing, and Radio's 2-up grid keeps its exact flex-wrap
                // layout this way.
                const ownsList =
                    tab.id === 'library' || tab.id === 'home' || tab.id === 'playlists';
                return (
                    <TabSceneContainer
                        isActive={isSceneActive}
                        key={tab.id}
                        reducedMotion={reducedMotion}
                    >
                        {ownsList ? (
                            <ErrorBoundary label={`tab-${tab.id}`}>
                                {isSceneMounted ? renderTabSceneContent(tab.id) : null}
                            </ErrorBoundary>
                        ) : (
                            <ScrollView
                                contentContainerStyle={[
                                    styles.tabContent,
                                    { paddingBottom: scrollBottomInset },
                                ]}
                                showsVerticalScrollIndicator={false}
                                style={styles.tabSceneFill}
                            >
                                <ErrorBoundary label={`tab-${tab.id}`}>
                                    {isSceneMounted ? renderTabSceneContent(tab.id) : null}
                                </ErrorBoundary>
                            </ScrollView>
                        )}
                    </TabSceneContainer>
                );
            })}
        </View>
    );
});
