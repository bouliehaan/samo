import { BlurTargetView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
    AppState,
    Image,
    KeyboardAvoidingView,
    PermissionsAndroid,
    Platform,
    Text,
    TextInput,
    View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { ensureSamoStreamToken, ServerType } from '@samo/core/server';

import samoLogo from './assets/samo-logo.png';
import { AppOverlays } from './src/components/AppOverlays';
import { BottomChromeBackdrop } from './src/components/BottomChromeBackdrop';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { SearchOverlayHost } from './src/components/SearchOverlayHost';
import { SearchPullProvider } from './src/components/search-pull/SearchPullContext';
import { SearchPullScrim } from './src/components/search-pull/SearchPullScrim';
import { SearchPullGestureHost } from './src/components/search-pull/SearchPullGestureHost';
import { SearchPullSurface } from './src/components/search-pull/SearchPullSurface';
import { SheetPortalHost } from './src/components/SheetPortalHost';
import { StatusBarScrim } from './src/components/StatusBarScrim';
import { TabBar } from './src/components/TabBar';
import { TabScenes } from './src/components/TabScenes';
import { UtilityScreenHost } from './src/components/UtilityScreenHost';
import { MediaContextMenuContext } from './src/contexts/media-context-menu';
import { ServerConnectionsContext } from './src/contexts/server-connections';
import { bumpViewAllFetchToken, invalidateMediaDetailRequests } from './src/handlers/handler-state';
import { mediaContextMenuApi } from './src/hooks/use-android-context-menu';
import { useAndroidBackHandling } from './src/hooks/use-android-back-handling';
import { tabBarSinkTranslateY, worldDimOpacity } from './src/player/player-motion';
import { PlaybackEngine } from './src/player/PlaybackEngine';
import { PlayerDock } from './src/player/PlayerDock';
import { NowPlayingMetadataSync } from './src/player/PlayerSurface';
import { MediaDetailOverlayHost } from './src/screens/MediaDetailOverlayHost';
import { OnboardingGate } from './src/screens/onboarding/OnboardingGate';
import { ViewAllOverlayHost } from './src/screens/ViewAllOverlayHost';
import { prefetchCatalogArtwork } from './src/services/artwork-prefetch';
import {
    installCatalogSyncEventBridge,
    subscribeCatalogSyncCompleted,
} from './src/services/catalog/catalog-sync-events';
import { resumeDownloadsOnForeground } from './src/services/download-manager';
import { refreshHomeFromMirror } from './src/services/home-flow';
import { loadHomeLayoutHint } from './src/services/home-layout-hint';
import { formatJankBreadcrumb, traceAsync } from './src/services/jank-trace';
import { installMemoryReport } from './src/services/mem-report';
import {
    refreshLibraryFromMirror,
    resetLibraryContent,
    startLibraryRelevantLoad,
} from './src/services/library-flow';
import { loadLocalFavorites } from './src/services/local-favorites';
import {
    installNetworkBootstrap,
    refreshNetworkOnForeground,
} from './src/services/network-bootstrap';
import { loadPersistedRecentContentItems } from './src/services/recent-content';
import { restoreServersOnce } from './src/services/server-session';
import {
    getAppNavigation,
    setAppNavigationOptions,
    useAppNavigationSelector,
} from './src/state/app-navigation';
import {
    setFavoritedKeys,
    setLocalFavorites,
    setRecentContentItems,
} from './src/state/app-session';
import { getAuthSession, useAuthSessionSelector } from './src/state/auth-session';
import { hydrateHiddenHome } from './src/state/hidden-home';
import { isOfflineNow, useNetworkSelector } from './src/state/network-state';
import {
    DOCK_BLUR_TARGET,
    SEARCH_TRAY_BLUR_TARGET,
} from './src/theme/chrome-blur-targets';
import { styles } from './src/theme/styles';
import { fonts } from './src/theme/tokens';
import {
    HOME_ARTWORK_PREFETCH_LIMIT,
    LIBRARY_FULL_COLLECTION_PREFETCH_DELAY_MS,
} from './src/utils/app-constants';
import {
    backfillItemArtworkFields,
    prefetchArtworkSource,
    resolveSamoItemArtworkSourceForDisplay,
} from './src/utils/samo-artwork-url';

// @ts-ignore
Text.defaultProps = Text.defaultProps || {};
// @ts-ignore
Text.defaultProps.style = { fontFamily: fonts.body };
// @ts-ignore
TextInput.defaultProps = TextInput.defaultProps || {};
// @ts-ignore
TextInput.defaultProps.style = { fontFamily: fonts.body };

// Closing the media detail / View All must invalidate their in-flight loads
// so a late response can't clobber the restored surface. Wired once at module
// load — both sides are module singletons.
setAppNavigationOptions({
    onCloseMediaDetailSideEffects: invalidateMediaDetailRequests,
    onCloseViewAllSideEffects: bumpViewAllFetchToken,
});

// One Kotlin sync round emits a 'synced' event per source; this trailing window
// coalesces that burst into a single mirror refresh instead of one per source.
const POST_SYNC_COALESCE_MS = 450;

// How long the post-sync derive may wait for an idle frame before it runs
// anyway. A device that never goes idle must still get its mirror refresh.
const POST_SYNC_IDLE_TIMEOUT_MS = 3000;

// The actual post-sync work, deferred so it never lands in the middle of a tap
// or the player-open spring. Re-derives Home + Library from the freshly-synced
// mirror and warms cover art. The FTS index is no longer rebuilt here — Kotlin
// (SamoCatalogSearch) reconciles it inside the sync itself, before the 'synced'
// event that triggers this.
//
// `requestIdleCallback` rather than `InteractionManager.runAfterInteractions`,
// which React Native deprecated and warns about at runtime. It is also the
// better fit: this work wants the JS thread to actually be FREE, which is a
// stronger condition than every interaction handle having been released.
const flushPostSyncRefresh = () => {
    const auth = getAuthSession().serverConnection;
    if (!auth) {
        return;
    }
    requestIdleCallback(
        () => {
            void (async () => {
                try {
                    await refreshHomeFromMirror({ authoritative: true });
                    refreshLibraryFromMirror();
                    // Cleared only once the derive has actually landed. Clearing
                    // it up front meant a flush interrupted partway — a throw, or
                    // the process being killed while the prefetch walked the
                    // library — left the latch saying "nothing to do" about work
                    // that had not been done, and the next foreground skipped it.
                    mirrorDirty = false;
                    await traceAsync('catalog.prefetchArtwork', () =>
                        prefetchCatalogArtwork(auth),
                    );
                } catch (error) {
                    console.error('[catalog] post-sync derive/prefetch failed', error);
                }
            })();
        },
        { timeout: POST_SYNC_IDLE_TIMEOUT_MS },
    );
};

// Debounce token + dirty latch for the post-sync mirror refresh. The dirty
// latch defers the (expensive, JS-thread-bound) Home/Library derive whenever
// the app is backgrounded, so a long listening session with the screen off
// never burns seconds of JS thread re-deriving surfaces the user can't see.
// The AppState→active handler flushes it.
let postSyncDebounce: null | ReturnType<typeof setTimeout> = null;
let mirrorDirty = false;

export default function App() {
    // Keyed off the `fonts` tokens, not repeated string literals: the registered
    // family name and the name every style asks for are then the SAME value by
    // construction, so swapping a typeface is a one-line edit in tokens.ts plus
    // the asset — it can no longer half-land.
    const [fontsLoaded] = useFonts({
        [fonts.body]: require('./assets/fonts/Archivo.ttf'),
        [fonts.monoBold]: require('./assets/fonts/officecodepro-bold.otf'),
        [fonts.mono]: require('./assets/fonts/officecodepro-regular.otf'),
        [fonts.heading]: require('./assets/fonts/BricolageGrotesque-Bold.ttf'),
        [fonts.headingMedium]: require('./assets/fonts/BricolageGrotesque-Medium.ttf'),
    });

    // The ONLY store slices App itself subscribes to. Both change rarely
    // (connect/disconnect, offline toggle, home load edge); everything
    // high-churn lives behind the hosts below.
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isOffline = useNetworkSelector((state) => state.isOffline);
    const isHomeLoaded = useAppNavigationSelector(
        (state) => state.homeContentState.status === 'loaded',
    );
    const homeLoadedAt = useAppNavigationSelector((state) =>
        state.homeContentState.status === 'loaded' ? state.homeContentState.content.loadedAt : 0,
    );

    useAndroidBackHandling();

    // Unified animation source for the MiniPlayer ↔ FullScreenPlayer transition.
    // 0 = miniplayer visible, 1 = fullscreen visible. The dock, tab bar, and
    // world dim all derive their frame/opacity from this single shared value so
    // the motion reads as one physical object expanding or collapsing.
    const playerProgress = useSharedValue(0);
    const tabBarAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: tabBarSinkTranslateY(playerProgress.value) }],
    }));
    // World dim — the desk going darker under the card lifting off it. Lives
    // above the page content + tab bar, below the player shell.
    const worldDimStyle = useAnimatedStyle(() => ({
        opacity: worldDimOpacity(playerProgress.value),
    }));

    // Boot-time saved-session restore (idempotent module latch). Connectivity
    // is wired FIRST so the restore can consult it rather than discovering a
    // dead network one 30-second timeout at a time.
    useEffect(() => {
        installNetworkBootstrap();
        restoreServersOnce();
    }, []);

    // TEMPORARY DIAGNOSTIC — remove with services/mem-report.ts once the
    // retained-heap investigation is closed.
    useEffect(() => installMemoryReport(), []);

    // JS event-loop health probe: a 2s heartbeat that logs whenever it fires
    // late. "Tabs do nothing for 30 seconds while a song plays" is invisible
    // in logcat without this; with it, the freeze window and its duration are
    // named precisely, and the adjacent log lines name the culprit.
    useEffect(() => {
        let expected = Date.now() + 2000;
        const interval = setInterval(() => {
            const now = Date.now();
            const lagMs = now - expected;
            if (lagMs > 1500) {
                console.warn(
                    `[jank] JS thread blocked ~${Math.round(lagMs / 100) / 10}s${formatJankBreadcrumb()}`,
                );
            }
            expected = now + 2000;
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Kotlin → JS sync plumbing: every completed sync re-derives the
    // mirror-backed surfaces (Home, Library) and warms the cover-art cache.
    useEffect(() => {
        const uninstall = installCatalogSyncEventBridge();
        const unsubscribe = subscribeCatalogSyncCompleted(() => {
            if (postSyncDebounce) {
                clearTimeout(postSyncDebounce);
            }
            postSyncDebounce = setTimeout(() => {
                postSyncDebounce = null;
                // Foreground: refresh now. Background: mark dirty and let the
                // next foreground flush it — the whole point of the gate.
                if (AppState.currentState === 'active') {
                    flushPostSyncRefresh();
                } else {
                    mirrorDirty = true;
                }
            }, POST_SYNC_COALESCE_MS);
        });
        return () => {
            if (postSyncDebounce) {
                clearTimeout(postSyncDebounce);
                postSyncDebounce = null;
            }
            unsubscribe();
            uninstall();
        };
    }, []);

    // Flush a mirror refresh that was deferred while backgrounded AND
    // re-queue stranded downloads — consolidated into one AppState listener
    // so state changes don't tear down and re-create listeners.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next !== 'active') {
                return;
            }
            // Connectivity first: the system does not replay the callbacks it
            // fired while the process was frozen, so everything below would
            // otherwise act on whatever was true before the phone went to
            // sleep — including which of the server's addresses to use.
            void refreshNetworkOnForeground();

            // Re-mint the stream token BEFORE anything renders artwork. After
            // hours of native-driven playback nothing in the frozen JS world
            // has minted, so the cache is expired and every cover URL the
            // resolvers build 401s once before its per-tile retry heals it —
            // a whole screen flashing letter tiles on reopen. ensure() is a
            // no-op while the cached token is live, so this costs nothing on
            // ordinary foregrounds.
            const auth = getAuthSession().serverConnection;
            if (auth?.type === ServerType.SAMO && !isOfflineNow()) {
                void ensureSamoStreamToken(auth).catch(() => undefined);
            }
            if (mirrorDirty) {
                flushPostSyncRefresh();
            }
            void resumeDownloadsOnForeground(serverConnection);
        });
        return () => subscription.remove();
    }, [serverConnection]);

    // Paint Home from the mirror the moment connections exist (cold launch,
    // restore, connect) — no network on this path.
    useEffect(() => {
        if (serverConnection) {
            void refreshHomeFromMirror();
        }
    }, [serverConnection]);

    // Library loads follow the Home load edge (the mirror is warm by then).
    // Offline is NOT a reason to skip them — every one of these reads is served
    // by the on-device mirror. Clearing the Library when the Wi-Fi dropped is
    // what made offline mode look like it deleted the app's contents.
    useEffect(() => {
        if (!serverConnection) {
            resetLibraryContent();
            return;
        }

        if (!isHomeLoaded) {
            return;
        }

        const timeout = setTimeout(
            startLibraryRelevantLoad,
            LIBRARY_FULL_COLLECTION_PREFETCH_DELAY_MS,
        );

        return () => {
            clearTimeout(timeout);
        };
    }, [isHomeLoaded, serverConnection]);

    useEffect(() => {
        if (!serverConnection || isOffline) {
            return;
        }

        if (serverConnection.type === ServerType.SAMO) {
            void ensureSamoStreamToken(serverConnection).catch(() => undefined);
        }
    }, [isOffline, serverConnection]);

    // Warm the first visible covers into memory + disk so round-tripping
    // through detail pages does not refetch art the home screen just showed.
    // Keyed on loadedAt so a reconcile that only reorders sections doesn't
    // re-walk; a full refresh or connect does.
    useEffect(() => {
        if (homeLoadedAt === 0) return;
        // Defer until the JS thread is idle so the prefetch loop never lands on
        // a tap or transition frame. Cancelled on re-run, so a rapid sequence of
        // Home loads only ever warms the newest one's covers.
        const handle = requestIdleCallback(() => {
            const homeContentState = getAppNavigation().homeContentState;
            if (homeContentState.status !== 'loaded') return;
            const sources: Array<string | { headers: Record<string, string>; uri: string }> = [];
            for (const section of homeContentState.content.sections) {
                for (const item of section.items.slice(0, HOME_ARTWORK_PREFETCH_LIMIT)) {
                    const resolved = resolveSamoItemArtworkSourceForDisplay(
                        {
                            artworkImageId: item.artworkImageId,
                            artworkUrl: item.artworkUrl,
                            source: item.source,
                        },
                        serverConnection,
                    );
                    if (resolved) {
                        sources.push(resolved);
                    }
                }
            }
            for (const source of sources.slice(0, HOME_ARTWORK_PREFETCH_LIMIT)) {
                prefetchArtworkSource(source);
            }
        });
        return () => cancelIdleCallback(handle);
    }, [homeLoadedAt, serverConnection]);

    // Recents persisted before this server session may be missing artwork
    // fields the connection can now resolve — patch them in place once.
    useEffect(() => {
        if (!serverConnection) {
            return;
        }

        setRecentContentItems((current) => {
            let changed = false;
            const next = current.map((entry) => {
                const patched = backfillItemArtworkFields(entry.item, serverConnection);
                if (patched === entry.item) {
                    return entry;
                }
                changed = true;
                return { ...entry, item: patched };
            });
            return changed ? next : current;
        });
    }, [serverConnection]);

    // One-time boot hydration of persisted UI state.
    useEffect(() => {
        let isMounted = true;

        void loadPersistedRecentContentItems().then((items) => {
            if (isMounted) {
                setRecentContentItems(items);
            }
        });

        // Warm the home-layout hint cache so the next render can reserve the
        // live shelves' slots synchronously (cold-boot no-shift).
        void loadHomeLayoutHint();

        // Per-device "Remove from Home" hides — load before the first Home paint
        // so a hidden tile doesn't flash in on a cold start.
        void hydrateHiddenHome();

        void loadLocalFavorites().then((favorites) => {
            if (isMounted) {
                setLocalFavorites(favorites);
                setFavoritedKeys((current) => {
                    const next = new Set(current);
                    favorites.forEach((favorite) => next.add(favorite.key));
                    return next;
                });
            }
        });

        // In dev mode, Metro serves the brand logo over HTTP. Prefetch it
        // immediately on launch so it lands in Fresco's disk cache — that
        // way the logo still renders if you later flip to airplane mode and
        // Metro becomes unreachable. In release builds the asset is bundled
        // into the APK and this is a no-op fast path.
        try {
            const resolved = Image.resolveAssetSource(samoLogo);
            if (resolved?.uri) {
                void Image.prefetch(resolved.uri).catch(() => undefined);
            }
        } catch {
            // ignore — Image.resolveAssetSource throws in some edge cases
        }

        return () => {
            isMounted = false;
        };
    }, []);

    // Android 13+ requires runtime POST_NOTIFICATIONS consent before any
    // notification (including the MediaSession one that drives shade controls
    // and lock-screen artwork) can appear. Without this, the media notification
    // silently never shows up. Request once on boot; declined permissions
    // simply mean no notification.
    useEffect(() => {
        if (Platform.OS !== 'android' || Platform.Version < 33) return;
        void PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(
            () => undefined,
        );
    }, []);

    return (
        <GestureHandlerRootView style={styles.gestureRoot}>
            <ErrorBoundary label="App">
                {/* The engine mounts before the fonts gate, exactly like the old
                    monolith's hooks: playback recovery/hydration must not wait
                    on font IO. It renders null, so nothing unstyled can flash. */}
                <PlaybackEngine />
                {!fontsLoaded ? null : (
                    <ServerConnectionsContext.Provider value={serverConnection}>
                        <MediaContextMenuContext.Provider value={mediaContextMenuApi}>
                            <View style={styles.safeArea}>
                                {/* The app draws UNDER the status bar. SDK 57
                                dropped `translucent`/`backgroundColor` from
                                expo-status-bar because Android is now always
                                edge-to-edge, and `edgeToEdgeEnabled=true` in
                                gradle.properties is what carries it — the two
                                props were doing that job by hand on older
                                versions. Per-screen STATUS_BAR_INSET paddings
                                are the matching clearance below. The bar must
                                stay VISIBLE: `hidden` removes the clock/battery
                                and collapses STATUS_BAR_INSET to 0, shoving
                                every screen's header into the display cutout. */}
                                <StatusBar style="light" />
                                <NowPlayingMetadataSync />
                                {/* Gives the app worklet-level access to the real IME
                                position (useReanimatedKeyboardAnimation), so the
                                search surface can move WITH the keyboard instead
                                of being surprised by it. */}
                                <KeyboardProvider>
                                    <KeyboardAvoidingView
                                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                        style={styles.keyboardView}
                                    >
                                        <View style={styles.root}>
                                            <SearchPullProvider>
                                                <View style={styles.appContent}>
                                                    {/* The ONE pull-down search pan, above the
                                            tab scenes where <Freeze> cannot tear
                                            it down. It wraps ONLY the scenes:
                                            the overlays below are later
                                            siblings, so a pull can never be
                                            claimed out from under a detail page,
                                            View All or a utility screen — and
                                            TabScenes already drops its own
                                            pointerEvents when one of those is
                                            covering it, which disables the pan
                                            with no extra gate. */}
                                                    {/*
                                            THE TWO BLUR TARGETS — the content
                                            each glass pane samples.

                                            A BlurTarget records its ordinary
                                            draw pass into a RenderNode, so a
                                            BlurView can reference it instead of
                                            redrawing this entire hierarchy into
                                            a software bitmap on every frame.
                                            That redraw was the app's single
                                            largest per-frame cost, back when
                                            minSdk allowed devices without
                                            RenderNode snapshotting at all.

                                            THE NESTING IS LOAD-BEARING and the
                                            rule behind it is simple: a pane may
                                            never be inside the target it names.
                                            The tray is above the search results
                                            and the dock is above everything, so
                                            they want different content, and the
                                            only arrangement that gives both of
                                            them exactly what they had before is
                                            one target inside the other:

                                              dock target
                                                └ tray target
                                                    └ pages, overlays, scrims
                                                └ full-search results
                                              (tray pane — outside the tray
                                               target, inside the dock's)
                                              (dock pane — outside both, in the
                                               root below)

                                            zIndex ordering is untouched: every
                                            layer keeps the value it had, and
                                            the targets themselves are inert
                                            containers at the default level. */}
                                                    <BlurTargetView
                                                        ref={DOCK_BLUR_TARGET}
                                                        style={styles.chromeBlurTarget}
                                                    >
                                                        <BlurTargetView
                                                            ref={SEARCH_TRAY_BLUR_TARGET}
                                                            style={styles.chromeBlurTarget}
                                                        >
                                                            <SearchPullGestureHost>
                                                                <TabScenes />
                                                            </SearchPullGestureHost>
                                                            <UtilityScreenHost />
                                                            <MediaDetailOverlayHost />
                                                            <ViewAllOverlayHost />
                                                            {/* Status-bar legibility veil over
                                                    the edge-to-edge pages/overlays.
                                                    zIndex 9500: above every scrolling
                                                    surface, below the search overlay
                                                    (11000); the player + tab bar are
                                                    LATER SIBLINGS of appContent, so
                                                    they paint over it by tree order. */}
                                                            <StatusBarScrim />
                                                            {/* The dim behind the search tray
                                                    (10550). PAGE-side, so it lives in
                                                    the target the tray samples — the
                                                    glass has to show a dimmed page,
                                                    not an undimmed one. */}
                                                            <SearchPullScrim />
                                                        </BlurTargetView>
                                                        <SearchOverlayHost />
                                                    </BlurTargetView>
                                                    {/* The pull-down search tray (11100) sits
                                            above the page, the scrim AND the full
                                            search overlay, so a commit paints
                                            under the bar you just pulled down. */}
                                                    <SearchPullSurface />
                                                </View>
                                            </SearchPullProvider>
                                            {/* World dim — fades in over the page + tab bar as the
                                        player rises. Below the player shells (zIndex 9000 vs
                                        their 9999/10000). pointerEvents:none so the page
                                        below stays interactive while the player is closed. */}
                                            <Reanimated.View
                                                pointerEvents="none"
                                                style={[styles.playerWorldDim, worldDimStyle]}
                                            />
                                            <BottomChromeBackdrop sinkStyle={tabBarAnimatedStyle} />
                                            {/* TabBar mounts BEFORE PlayerDock: the icons only need
                                        to sit above the glass pane, while the OPEN full
                                        player must cover the whole screen INCLUDING the tab
                                        bar. They tie at zIndex 10000, so sibling order is
                                        the tiebreak — dock last, or the icons paint over the
                                        open player. Rest-state taps still reach the bar via
                                        the player shell's pointerEvents gate. */}
                                            <TabBar
                                                playerProgress={playerProgress}
                                                sinkStyle={tabBarAnimatedStyle}
                                            />
                                            <PlayerDock playerProgress={playerProgress} />
                                            {/* Every sheet and menu in the app, drawn here
                                        rather than each opening its own Android window
                                        (which cost ~380ms per sheet). Last child of the
                                        root and zIndex 12000, so it clears the tab bar
                                        and dock; inside the providers above, because
                                        sheets are DECLARED at their call sites but
                                        MOUNT here, and that is where their context is
                                        resolved. Inside KeyboardProvider too, so a
                                        sheet with a text field still tracks the IME. */}
                                            <SheetPortalHost />
                                        </View>
                                    </KeyboardAvoidingView>
                                </KeyboardProvider>
                                <AppOverlays />
                                <OnboardingGate />
                            </View>
                        </MediaContextMenuContext.Provider>
                    </ServerConnectionsContext.Provider>
                )}
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}
