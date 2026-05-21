import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import { ItemListKey } from '/@/shared/types/types';

import type { ItemListSettings, SettingsState } from './schemas';
import { useSettingsStore } from './store';

export const useSettingsStoreActions = () => useSettingsStore((state) => state.actions);

export const usePlaybackSettings = () => useSettingsStore((state) => state.playback, shallow);

export const useTableSettings = (type: ItemListKey) =>
    useSettingsStore((state) => state.lists[type as keyof typeof state.lists]);

export const useGeneralSettings = () => useSettingsStore((state) => state.general, shallow);

export const useOfflineMode = () => useSettingsStore((state) => state.general.offlineMode);

export const usePlaybackType = () => useSettingsStore((state) => state.playback.type, shallow);

export const usePlayButtonBehavior = () =>
    useSettingsStore((state) => state.general.playButtonBehavior, shallow);

export const useWindowSettings = () => useSettingsStore((state) => state.window, shallow);

export const useWindowBarStyle = () =>
    useSettingsStore((state) => state.window.windowBarStyle, shallow);

export const useHotkeySettings = () => useSettingsStore((state) => state.hotkeys, shallow);

export const useHotkeyBindings = () => useSettingsStore((state) => state.hotkeys.bindings, shallow);

export const useLayoutHotkeyBindings = () =>
    useSettingsStore(
        (state) => ({
            browserBack: state.hotkeys.bindings.browserBack,
            browserForward: state.hotkeys.bindings.browserForward,
            globalSearch: state.hotkeys.bindings.globalSearch,
            navigateHome: state.hotkeys.bindings.navigateHome,
            zoomIn: state.hotkeys.bindings.zoomIn,
            zoomOut: state.hotkeys.bindings.zoomOut,
        }),
        shallow,
    );

export const useMpvSettings = () =>
    useSettingsStore((state) => state.playback.mpvProperties, shallow);

export const useLyricsSettings = () => useSettingsStore((state) => state.lyrics, shallow);

export const useLyricsDisplaySettings = (key: string = 'default') =>
    useSettingsStore((state) => state.lyricsDisplay[key] || state.lyricsDisplay.default, shallow);

export const useRemoteSettings = () => useSettingsStore((state) => state.remote, shallow);

export const useFontSettings = () => useSettingsStore((state) => state.font, shallow);

export const useDiscordSettings = () => useSettingsStore((state) => state.discord, shallow);

export const useCssSettings = () => useSettingsStore((state) => state.css, shallow);

export const useQueryBuilderSettings = () =>
    useSettingsStore((state) => state.queryBuilder, shallow);

const getSettingsStoreVersion = () => useSettingsStore.persist.getOptions().version!;

export const useSettingsForExport = (): SettingsState & { version: number } =>
    useSettingsStore((state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- actions needs to be omitted from the export as it contains store functions
        const { actions, ...otherSettings } = state;
        return {
            ...otherSettings,
            version: getSettingsStoreVersion(),
        };
    });

export const migrateSettings = (settings: SettingsState, settingsVersion: number): SettingsState =>
    useSettingsStore.persist.getOptions().migrate!(settings, settingsVersion) as SettingsState;

export const useListSettings = (type: ItemListKey) =>
    useSettingsStore(
        (state) => state.lists[type as keyof typeof state.lists],
        shallow,
    ) as ItemListSettings;

export const usePrimaryColor = () => useSettingsStore((store) => store.general.accent, shallow);

export const usePlayerbarSlider = () =>
    useSettingsStore((store) => store.general.playerbarSlider, shallow);

export const useGenreTarget = () => useSettingsStore((store) => store.general.genreTarget, shallow);

export const usePlaylistTarget = () =>
    useSettingsStore((store) => store.general.playlistTarget, shallow);

export const useLanguage = () => useSettingsStore((state) => state.general.language, shallow);

export const useAccent = () => useSettingsStore((state) => state.general.accent, shallow);

export const useNativeAspectRatio = () =>
    useSettingsStore((state) => state.general.nativeAspectRatio, shallow);

export const useButtonSize = () => useSettingsStore((state) => state.general.buttonSize, shallow);

export const useSkipButtons = () => useSettingsStore((state) => state.general.skipButtons, shallow);

export const useImageRes = () => useSettingsStore((state) => state.general.imageRes, shallow);

export const useVolumeWidth = () => useSettingsStore((state) => state.general.volumeWidth, shallow);

export const useFollowCurrentSong = () =>
    useSettingsStore((state) => state.general.followCurrentSong, shallow);

export const useThemeSettings = () =>
    useSettingsStore(
        (state) => ({
            followSystemTheme: state.general.followSystemTheme,
            primaryShade: state.general.primaryShade,
            theme: state.general.theme,
            themeDark: state.general.themeDark,
            themeLight: state.general.themeLight,
            useThemeAccentColor: state.general.useThemeAccentColor,
            useThemePrimaryShade: state.general.useThemePrimaryShade,
        }),
        shallow,
    );

export const useSideQueueType = () =>
    useSettingsStore((state) => state.general.sideQueueType, shallow);

export const useSideQueueLayout = () =>
    useSettingsStore((state) => state.general.sideQueueLayout, shallow);

export const useVolumeWheelStep = () =>
    useSettingsStore((state) => state.general.volumeWheelStep, shallow);

export const useCollections = () => {
    const collections = useSettingsStore((state) => state.general.collections, shallow);

    return useMemo(
        () => [...(collections ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
        [collections],
    );
};

export const useSidebarPlaylistList = () =>
    useSettingsStore((state) => state.general.sidebarPlaylistList, shallow);

export const useSidebarPlaylistSorting = () =>
    useSettingsStore((state) => state.general.sidebarPlaylistSorting, shallow);

export const useSidebarPlaylistListFilterRegex = () =>
    useSettingsStore((state) => state.general.sidebarPlaylistListFilterRegex, shallow);

export const useSidebarItems = () =>
    useSettingsStore((state) => state.general.sidebarItems, shallow);

export const usePlayerItems = () => useSettingsStore((state) => state.general.playerItems, shallow);

export const useSidebarCollapsedNavigation = () =>
    useSettingsStore((state) => state.general.sidebarCollapsedNavigation, shallow);

export const usePlayerbarOpenDrawer = () =>
    useSettingsStore((state) => state.general.playerbarOpenDrawer, shallow);

export const useShowRatings = () => useSettingsStore((state) => state.general.showRatings, shallow);

export const useArtistRadioCount = () =>
    useSettingsStore((state) => state.general.artistRadioCount, shallow);

export const useArtistBackground = () =>
    useSettingsStore(
        (state) => ({
            artistBackground: state.general.artistBackground,
            artistBackgroundBlur: state.general.artistBackgroundBlur,
        }),
        shallow,
    );

export const useAlbumBackground = () =>
    useSettingsStore(
        (state) => ({
            albumBackground: state.general.albumBackground,
            albumBackgroundBlur: state.general.albumBackgroundBlur,
        }),
        shallow,
    );

export const useExternalLinks = () =>
    useSettingsStore(
        (state) => ({
            externalLinks: state.general.externalLinks,
            lastFM: state.general.lastFM,
            listenBrainz: state.general.listenBrainz,
            musicBrainz: state.general.musicBrainz,
            nativeSpotify: state.general.nativeSpotify,
            qobuz: state.general.qobuz,
            spotify: state.general.spotify,
        }),
        shallow,
    );

export const useHomeFeature = () => useSettingsStore((state) => state.general.homeFeature, shallow);

export const useHomeFeatureStyle = () =>
    useSettingsStore((state) => state.general.homeFeatureStyle);

export const useHomeItems = () => useSettingsStore((state) => state.general.homeItems, shallow);

export const useArtistItems = () => useSettingsStore((state) => state.general.artistItems, shallow);

export const useArtistReleaseTypeItems = () =>
    useSettingsStore((state) => state.general.artistReleaseTypeItems, shallow);

export const useZoomFactor = () => useSettingsStore((state) => state.general.zoomFactor, shallow);

export const usePathReplace = () =>
    useSettingsStore(
        (state) => ({
            pathReplace: state.general.pathReplace,
            pathReplaceWith: state.general.pathReplaceWith,
        }),
        shallow,
    );

export const useLastfmApiKey = () =>
    useSettingsStore((state) => state.general.lastfmApiKey, shallow);

export const useSidebarPanelOrder = () =>
    useSettingsStore((state) => state.general.sidebarPanelOrder, shallow);

export const useCombinedLyricsAndVisualizer = () =>
    useSettingsStore((state) => state.general.combinedLyricsAndVisualizer, shallow);

export const useShowLyricsInSidebar = () =>
    useSettingsStore((state) => state.general.showLyricsInSidebar, shallow);

export const useShowVisualizerInSidebar = () =>
    useSettingsStore((state) => state.general.showVisualizerInSidebar, shallow);

export const useAutoDJSettings = () => useSettingsStore((store) => store.autoDJ, shallow);

export const useVisualizerSettings = () => useSettingsStore((store) => store.visualizer, shallow);

export const subscribeButterchurnPreset = (
    onChange: (preset: string | undefined, prevPreset: string | undefined) => void,
) => {
    return useSettingsStore.subscribe(
        (state) => state.visualizer.butterchurn.currentPreset,
        (preset, prevPreset) => {
            onChange(preset, prevPreset);
        },
    );
};

export const useButterchurnSettings = () => {
    return useSettingsStore((store) => {
        return {
            blendTime: store.visualizer.butterchurn.blendTime,
            cyclePresets: store.visualizer.butterchurn.cyclePresets,
            cycleTime: store.visualizer.butterchurn.cycleTime,
            ignoredPresets: store.visualizer.butterchurn.ignoredPresets,
            includeAllPresets: store.visualizer.butterchurn.includeAllPresets,
            maxFPS: store.visualizer.butterchurn.maxFPS,
            opacity: store.visualizer.butterchurn.opacity,
            randomizeNextPreset: store.visualizer.butterchurn.randomizeNextPreset,
            selectedPresets: store.visualizer.butterchurn.selectedPresets,
        };
    }, shallow);
};
