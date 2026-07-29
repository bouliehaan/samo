import { SAMO_MOBILE_TABS, type SamoMobileTabId } from '@samo/core/navigation';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
import { useTabReselect } from '../state/tab-reselect';
import { useAuthSessionSelector } from '../state/auth-session';
import { durations } from '../theme/motion';
import { styles } from '../theme/styles';
import { getTabTitle } from '../utils/tab-title';
import { ErrorBoundary } from './ErrorBoundary';
import { TabSceneContainer } from './TabSceneContainer';

const handleOpenManageServers = () => setActiveUtilityScreen('manage-servers');

/** How long after an overlay starts covering the tab scenes before they are
 *  provably invisible: its full cross-fade, plus the same slack
 *  TabSceneContainer and usePresenceTransition leave past a last animated
 *  frame. */
const COVERED_BY_OVERLAY_MS = durations.screenEnter + 30;

const HomeTabScene = memo(function HomeTabScene() {
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const [isRefreshingHome, setIsRefreshingHome] = useState(false);

    // Now that EVERY Home press refreshes, not just a re-tap on a settled page,
    // this can be asked for far more often than before — bouncing between tabs
    // would otherwise stack a catalog sync and a live re-fetch per press. A ref
    // rather than `isRefreshingHome`: that is render state, so two presses in
    // the same frame would both read it as false.
    const refreshInFlight = useRef(false);

    const handleRefreshHome = useCallback(async (): Promise<void> => {
        if (!serverConnection || refreshInFlight.current) {
            return;
        }
        refreshInFlight.current = true;
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
            refreshInFlight.current = false;
            setIsRefreshingHome(false);
        }
    }, [serverConnection]);

    // Pressing the Home tab is the ONLY way to refresh: the pull-down gesture
    // belongs to search (see useSearchPull), so Home's RefreshControl is
    // display-only. The press glides the page to the top and fires the refresh;
    // the spinner still shows via the isRefreshingHome → RefreshControl wiring.
    //
    // Via the catch-up hook rather than a bare subscription: this scene is
    // frozen whenever Home is in the background, which tears its effects down —
    // so the press that brings you BACK to Home, the most important one, was
    // landing while nothing was listening. See state/tab-reselect.
    useTabReselect('home', () => {
        void handleRefreshHome();
    });

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

    // The tab we just came from, held THAWED instead of refreezing straight
    // away. Freezing is what makes a background tab free, but unfreezing costs
    // a full re-render of the scene — measured at 62-140ms, paid on the
    // critical path of every single switch, which is most of why switching felt
    // slow. Bouncing between two tabs is the overwhelmingly common pattern, and
    // the return trip now skips the thaw entirely. Exactly ONE extra scene is
    // ever left live, so the "idle tabs cost nothing" property still holds for
    // the other three.
    const previousTabRef = useRef<SamoMobileTabId | null>(null);
    const [warmTab, setWarmTab] = useState<SamoMobileTabId | null>(null);
    useEffect(() => {
        const cameFrom = previousTabRef.current;
        previousTabRef.current = activeTab;
        if (cameFrom !== null && cameFrom !== activeTab) {
            setWarmTab(cameFrom);
        }
    }, [activeTab]);
    // Any overlay above the tab scenes swallows their pointer events.
    const isCovered = useAppNavigationSelector(
        (state) =>
            (state.activeUtilityScreen !== null && state.activeUtilityScreen !== 'view-all') ||
            state.mediaDetailState.status !== 'idle' ||
            (state.activeUtilityScreen === 'view-all' && state.viewAllRoute !== null),
    );

    // ...and it also stops them being DRAWN. A covered tab scene is not a cheap
    // thing to leave painting: the active tab stays fully mounted and opaque
    // behind every full-screen overlay, so Android measures, lays out and draws
    // the whole of Home — its shelves, tiles and ~180 text views — on every
    // frame of a screen the user cannot see. Traced on a V60 release build,
    // flinging a 100-track playlist drew 272 ReactTextViews per frame; only ~92
    // of those belonged to the list in front. Two thirds of the text drawing,
    // and the traversal that carries it, was going to Home underneath.
    //
    // TabSceneContainer already does exactly this for a tab scene covered by
    // another tab scene ("it stops a full-screen opaque layer from drawing
    // behind the active one") — this is the same rule applied to overlays,
    // which is the case that was missing.
    //
    // Opacity, not `display: 'none'`: GONE would re-run layout on the way back
    // and Android resets a ScrollView's offset when it does, so returning from
    // a detail page would lose Home's scroll position. Alpha 0 lets HWUI skip
    // the subtree's draw while leaving layout — and therefore scroll state —
    // exactly as it was.
    //
    // DELAYED, because the overlay CROSS-FADES in over `screenEnter`: the tab
    // scenes are genuinely visible through that fade, and blanking them on the
    // covering render would make the overlay rise out of black instead of out
    // of the page behind it. Hide only once the overlay is provably opaque;
    // un-hide immediately on uncover so the exit fade has something to reveal.
    const [isCoveredOpaque, setIsCoveredOpaque] = useState(false);
    useEffect(() => {
        if (!isCovered) {
            setIsCoveredOpaque(false);
            return;
        }
        const timer = setTimeout(() => setIsCoveredOpaque(true), COVERED_BY_OVERLAY_MS);
        return () => clearTimeout(timer);
    }, [isCovered]);

    return (
        <View
            pointerEvents={isCovered ? 'none' : 'auto'}
            style={[styles.tabSceneHost, isCoveredOpaque ? styles.tabSceneHostCovered : null]}
        >
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
                        keepWarm={tab.id === warmTab}
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
