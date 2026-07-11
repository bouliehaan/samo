import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
    AppState,
    Image,
    InteractionManager,
    KeyboardAvoidingView,
    PermissionsAndroid,
    Platform,
    Text,
    TextInput,
    View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { ensureSamoStreamToken, ServerType } from '@samo/core/server';

import samoLogo from './assets/samo-logo.png';
import { AppOverlays } from './src/components/AppOverlays';
import { BottomChromeBackdrop } from './src/components/BottomChromeBackdrop';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { SearchOverlayHost } from './src/components/SearchOverlayHost';
import { TabBar } from './src/components/TabBar';
import { TabScenes } from './src/components/TabScenes';
import { UtilityScreenHost } from './src/components/UtilityScreenHost';
import { MediaContextMenuContext } from './src/contexts/media-context-menu';
import { ServerConnectionsContext } from './src/contexts/server-connections';
import {
    bumpViewAllFetchToken,
    invalidateMediaDetailRequests,
} from './src/handlers/handler-state';
import { mediaContextMenuApi } from './src/hooks/use-android-context-menu';
import { useAndroidBackHandling } from './src/hooks/use-android-back-handling';
import {
    tabBarSinkTranslateY,
    worldDimOpacity,
} from './src/player/player-motion';
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
import { formatJankBreadcrumb } from './src/services/jank-trace';
import {
    refreshLibraryFromMirror,
    resetLibraryContent,
    startLibraryRelevantLoad,
} from './src/services/library-flow';
import { loadLocalFavorites } from './src/services/local-favorites';
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
import { useDownloadsSelector } from './src/state/downloads-state';
import { hydrateHiddenHome } from './src/state/hidden-home';
import { styles } from './src/theme/styles';
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
Text.defaultProps.style = { fontFamily: 'Archivo' };
// @ts-ignore
TextInput.defaultProps = TextInput.defaultProps || {};
// @ts-ignore
TextInput.defaultProps.style = { fontFamily: 'Archivo' };

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

// The actual post-sync work, deferred past any in-flight gesture/animation so
// it never lands in the middle of a tap or the player-open spring. Re-derives
// Home + Library from the freshly-synced mirror and warms cover art. The FTS
// index is no longer rebuilt here — Kotlin (SamoCatalogSearch) reconciles it
// inside the sync itself, before the 'synced' event that triggers this.
const flushPostSyncRefresh = () => {
    const auth = getAuthSession().serverConnection;
    if (!auth) {
        return;
    }
    mirrorDirty = false;
    InteractionManager.runAfterInteractions(() => {
        void (async () => {
            try {
                await refreshHomeFromMirror({ authoritative: true });
                refreshLibraryFromMirror();
                await prefetchCatalogArtwork(auth);
            } catch (error) {
                console.error('[catalog] post-sync derive/prefetch failed', error);
            }
        })();
    });
};

// Debounce token + dirty latch for the post-sync mirror refresh. The dirty
// latch defers the (expensive, JS-thread-bound) Home/Library derive whenever
// the app is backgrounded, so a long listening session with the screen off
// never burns seconds of JS thread re-deriving surfaces the user can't see.
// The AppState→active handler flushes it.
let postSyncDebounce: null | ReturnType<typeof setTimeout> = null;
let mirrorDirty = false;

export default function App() {
    const [fontsLoaded] = useFonts({
        Archivo: require('./assets/fonts/Archivo.ttf'),
        'OfficeCodePro-Bold': require('./assets/fonts/officecodepro-bold.otf'),
        'OfficeCodePro-Regular': require('./assets/fonts/officecodepro-regular.otf'),
        'YoungSerif-Bold': require('./assets/fonts/YoungSerif-Bold.ttf'),
        'YoungSerif-Regular': require('./assets/fonts/YoungSerif-Regular.ttf'),
    });

    // The ONLY store slices App itself subscribes to. Both change rarely
    // (connect/disconnect, offline toggle, home load edge); everything
    // high-churn lives behind the hosts below.
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isOfflineMode = useDownloadsSelector((state) => state.isOfflineMode);
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

    // Boot-time saved-session restore (idempotent module latch).
    useEffect(() => {
        restoreServersOnce();
    }, []);

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

    // Flush a mirror refresh that was deferred while backgrounded. This is the
    // moment the user reopens the app after a long listening session — derive
    // once here instead of having frozen the UI repeatedly in the background.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next !== 'active') {
                return;
            }
            // Re-mint the stream token BEFORE anything renders artwork. After
            // hours of native-driven playback nothing in the frozen JS world
            // has minted, so the cache is expired and every cover URL the
            // resolvers build 401s once before its per-tile retry heals it —
            // a whole screen flashing letter tiles on reopen. ensure() is a
            // no-op while the cached token is live, so this costs nothing on
            // ordinary foregrounds.
            const auth = getAuthSession().serverConnection;
            if (auth?.type === ServerType.SAMO) {
                void ensureSamoStreamToken(auth).catch(() => undefined);
            }
            if (mirrorDirty) {
                flushPostSyncRefresh();
            }
        });
        return () => subscription.remove();
    }, []);

    // Paint Home from the mirror the moment connections exist (cold launch,
    // restore, connect) — no network on this path.
    useEffect(() => {
        if (serverConnection) {
            void refreshHomeFromMirror();
        }
    }, [serverConnection]);

    // Resume any stranded downloads when the app returns to the foreground —
    // re-queues transfers the OS suspended in the background and pumps the queue
    // so it doesn't sit on "queued" forever after a backgrounding.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
                void resumeDownloadsOnForeground(serverConnection);
            }
        });
        return () => subscription.remove();
    }, [serverConnection]);

    // Library loads follow the Home load edge (the mirror is warm by then).
    useEffect(() => {
        if (isOfflineMode || !serverConnection) {
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
    }, [isHomeLoaded, isOfflineMode, serverConnection]);

    useEffect(() => {
        if (!serverConnection) {
            return;
        }

        if (serverConnection.type === ServerType.SAMO) {
            void ensureSamoStreamToken(serverConnection).catch(() => undefined);
        }
    }, [serverConnection]);

    // Warm the first visible covers into memory + disk so round-tripping
    // through detail pages does not refetch art the home screen just showed.
    // Keyed on loadedAt so a reconcile that only reorders sections doesn't
    // re-walk; a full refresh or connect does.
    useEffect(() => {
        if (homeLoadedAt === 0) return;
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
                            {/* translucent + transparent draws the app UNDER the
                                status bar on every Android version. app.json's
                                edgeToEdgeEnabled is prebuild-only — this bare
                                workflow never applies it, so older devices (no
                                OS-enforced edge-to-edge) showed an opaque bar
                                that visually cut the Home glass off. safeArea's
                                STATUS_BAR_INSET padding is the matching, single
                                clearance for the content below. */}
                            <StatusBar backgroundColor="transparent" style="light" translucent />
                            <NowPlayingMetadataSync />
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                style={styles.keyboardView}
                            >
                                <View style={styles.root}>
                                    <View style={styles.appContent}>
                                        <TabScenes />
                                        <UtilityScreenHost />
                                        <MediaDetailOverlayHost />
                                        <ViewAllOverlayHost />
                                        <SearchOverlayHost />
                                    </View>
                                    {/* World dim — fades in over the page + tab bar as the
                                        player rises. Below the player shells (zIndex 9000 vs
                                        their 9999/10000). pointerEvents:none so the page
                                        below stays interactive while the player is closed. */}
                                    <Reanimated.View
                                        pointerEvents="none"
                                        style={[styles.playerWorldDim, worldDimStyle]}
                                    />
                                    <BottomChromeBackdrop sinkStyle={tabBarAnimatedStyle} />
                                    <PlayerDock playerProgress={playerProgress} />
                                    <TabBar
                                        playerProgress={playerProgress}
                                        sinkStyle={tabBarAnimatedStyle}
                                    />
                                </View>
                            </KeyboardAvoidingView>
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
