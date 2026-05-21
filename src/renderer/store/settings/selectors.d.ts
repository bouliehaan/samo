import { ItemListKey } from '/@/shared/types/types';
import type { ItemListSettings, SettingsState } from './schemas';
export declare const useSettingsStoreActions: () => {
    addCollection: (collection: import("../../../shared/types/domain-types").SavedCollection) => void;
    removeCollection: (id: string) => void;
    reset: () => void;
    resetSampleRate: () => void;
    setArtistItems: (item: import("./schemas").SortableItem<import("./schemas").ArtistItem>[]) => void;
    setArtistReleaseTypeItems: (item: import("./schemas").SortableItem<import("./schemas").ArtistReleaseTypeItem>[]) => void;
    setGenreBehavior: (target: import("./schemas").GenreTarget) => void;
    setHomeItems: (item: import("./schemas").SortableItem<import("./schemas").HomeItem>[]) => void;
    setList: (type: ItemListKey, data: import("./utils").DeepPartial<ItemListSettings>) => void;
    setPlaybackFilters: (filters: import("./schemas").PlayerFilter[]) => void;
    setPlayerItems: (items: import("./schemas").SortableItem<import("./schemas").PlayerItem>[]) => void;
    setPlaylistBehavior: (target: import("./schemas").PlaylistTarget) => void;
    setSettings: (data: import("./utils").DeepPartial<SettingsState>) => void;
    setSidebarItems: (items: import("./schemas").SidebarItemType[]) => void;
    setTable: (type: ItemListKey, data: import("./schemas").DataTableProps) => void;
    setTranscodingConfig: (config: import("./schemas").TranscodingConfig) => void;
    toggleMediaSession: () => void;
    toggleSidebarCollapseShare: () => void;
    updateCollection: (id: string, updates: Partial<Omit<import("../../../shared/types/domain-types").SavedCollection, "id">>) => void;
};
export declare const usePlaybackSettings: () => {
    scrobble: {
        enabled: boolean;
        notify: boolean;
        scrobbleAtDuration: number;
        scrobbleAtPercentage: number;
    };
    filters: {
        id: string;
        value: string | number | boolean | (string | number)[];
        field: "duration" | "favorite" | "name" | "note" | "path" | "rating" | "year" | "artist" | "genre" | "albumArtist" | "playCount";
        operator: "contains" | "is" | "regex" | "startsWith" | "endsWith" | "isNot" | "before" | "after" | "inTheLast" | "notInTheLast" | "inTheRange" | "beforeDate" | "afterDate" | "inTheRangeDate" | "notContains" | "gt" | "lt";
        isEnabled?: boolean | undefined;
    }[];
    type: import("@samo/core").PlayerType;
    transcode: {
        enabled: boolean;
        bitrate?: number | undefined;
        format?: string | undefined;
    };
    audioFadeOnStatusChange: boolean;
    mediaSession: boolean;
    mpvExtraParameters: string[];
    mpvProperties: {
        audioExclusiveMode: "no" | "yes";
        gaplessAudio: "no" | "yes" | "weak";
        replayGainClip: boolean;
        replayGainMode: "no" | "album" | "track";
        audioFormat?: "float" | "s16" | "s32" | undefined;
        audioSampleRateHz?: number | undefined;
        replayGainFallbackDB?: number | undefined;
        replayGainPreampDB?: number | undefined;
    };
    preservePitch: boolean;
    webAudio: boolean;
    audioDeviceId?: string | null | undefined;
    mpvAudioDeviceId?: string | null | undefined;
};
export declare const useTableSettings: (type: ItemListKey) => {
    table: {
        size: "default" | "compact" | "large";
        columns: {
            id: import("/@/shared/types/types").TableColumn;
            width: number;
            align: "center" | "start" | "end";
            isEnabled: boolean;
            pinned: "left" | "right" | null;
            autoSize?: boolean | undefined;
        }[];
        enableAlternateRowColors: boolean;
        enableHeader: boolean;
        enableHorizontalBorders: boolean;
        enableRowHoverHighlight: boolean;
        enableVerticalBorders: boolean;
        autoFitColumns: boolean;
    };
    pagination: import("/@/shared/types/types").ListPaginationType;
    grid: {
        size: "default" | "compact" | "large";
        itemGap: "lg" | "md" | "sm" | "xl" | "xs";
        itemsPerRow: number;
        itemsPerRowEnabled: boolean;
        rows: {
            id: import("/@/shared/types/types").TableColumn;
            align: "center" | "start" | "end";
            isEnabled: boolean;
        }[];
    };
    display: import("/@/shared/types/types").ListDisplayType;
    itemsPerPage: number;
    detail?: {
        size: "default" | "compact" | "large";
        columns: {
            id: import("/@/shared/types/types").TableColumn;
            width: number;
            align: "center" | "start" | "end";
            isEnabled: boolean;
            pinned: "left" | "right" | null;
            autoSize?: boolean | undefined;
        }[];
        enableAlternateRowColors: boolean;
        enableHeader: boolean;
        enableHorizontalBorders: boolean;
        enableRowHoverHighlight: boolean;
        enableVerticalBorders: boolean;
    } | undefined;
} | undefined;
export declare const useGeneralSettings: () => {
    theme: import("../../../shared/themes/app-theme-types").AppTheme;
    collections: {
        id: string;
        name: string;
        type: import("@samo/core").LibraryItem.ALBUM | import("@samo/core").LibraryItem.SONG;
        filterQueryString: string;
    }[];
    language: string;
    primaryShade: number;
    accent: string;
    albumBackground: boolean;
    albumBackgroundBlur: number;
    artistBackground: boolean;
    artistBackgroundBlur: number;
    artistItems: {
        id: "biography" | "similarArtists" | "compilations" | "favoriteSongs" | "recentAlbums" | "topSongs";
        disabled: boolean;
    }[];
    artistRadioCount: number;
    artistReleaseTypeItems: {
        id: "releaseTypeAlbum" | "releaseTypeEp" | "releaseTypeSingle" | "releaseTypeBroadcast" | "releaseTypeOther" | "releaseTypeCompilation" | "appearsOn" | "releaseTypeAudioDrama" | "releaseTypeAudiobook" | "releaseTypeDemo" | "releaseTypeDjMix" | "releaseTypeFieldRecording" | "releaseTypeInterview" | "releaseTypeLive" | "releaseTypeMixtapeStreet" | "releaseTypeRemix" | "releaseTypeSoundtrack" | "releaseTypeSpokenWord";
        disabled: boolean;
    }[];
    autoSave: {
        count: number;
        enabled: boolean;
    };
    blurExplicitImages: boolean;
    buttonSize: number;
    combinedLyricsAndVisualizer: boolean;
    disabledContextMenu: Record<string, boolean>;
    enableGridMultiSelect: boolean;
    externalLinks: boolean;
    followCurrentSong: boolean;
    followSystemTheme: boolean;
    genreTarget: "album" | "track";
    homeFeature: boolean;
    homeFeatureStyle: import("./schemas").HomeFeatureStyle;
    homeItems: {
        id: "random" | "genres" | "recentlyAdded" | "recentlyPlayed" | "mostPlayed" | "recentlyReleased";
        disabled: boolean;
    }[];
    imageRes: {
        sidebar: number;
        table: number;
        header: number;
        fullScreenPlayer: number;
        itemCard: number;
    };
    lastFM: boolean;
    lastfmApiKey: string;
    listenBrainz: boolean;
    musicBrainz: boolean;
    nativeAspectRatio: boolean;
    nativeSpotify: boolean;
    offlineMode: boolean;
    pathReplace: string;
    pathReplaceWith: string;
    playButtonBehavior: import("@samo/core").Play;
    playerbarOpenDrawer: boolean;
    playerbarSlider: {
        type: "slider" | "waveform";
        barAlign: "center" | "top" | "bottom";
        barGap: number;
        barRadius: number;
        barWidth: number;
        loadingDelay: number;
    };
    playerItems: {
        id: "bpm" | "codec" | "genres" | "bit_depth" | "bit_rate" | "disc_number" | "sample_rate" | "track_number" | "release_year" | "release_type" | "release_date";
        disabled: boolean;
    }[];
    playlistTarget: "album" | "track";
    qobuz: boolean;
    resume: boolean;
    showLyricsInSidebar: boolean;
    showRatings: boolean;
    showVisualizerInSidebar: boolean;
    sidebarCollapsedNavigation: boolean;
    sidebarCollapseShared: boolean;
    sidebarItems: {
        id: string;
        label: string;
        disabled: boolean;
        route: string;
    }[];
    sidebarPanelOrder: ("visualizer" | "lyrics" | "queue")[];
    sidebarPlaylistList: boolean;
    sidebarPlaylistListFilterRegex: string;
    sidebarPlaylistSorting: boolean;
    sideQueueLayout: "horizontal" | "vertical";
    sideQueueType: "sideQueue" | "sideDrawerQueue";
    skipButtons: {
        enabled: boolean;
        skipBackwardSeconds: number;
        skipForwardSeconds: number;
    };
    spotify: boolean;
    themeDark: import("../../../shared/themes/app-theme-types").AppTheme;
    themeLight: import("../../../shared/themes/app-theme-types").AppTheme;
    useThemeAccentColor: boolean;
    useThemePrimaryShade: boolean;
    volumeWheelStep: number;
    volumeWidth: number;
    zoomFactor: number;
    passwordStore?: string | undefined;
};
export declare const useOfflineMode: () => boolean;
export declare const usePlaybackType: () => import("@samo/core").PlayerType;
export declare const usePlayButtonBehavior: () => import("@samo/core").Play;
export declare const useWindowSettings: () => {
    disableAutoUpdate: boolean;
    exitToTray: boolean;
    minimizeToTray: boolean;
    preventSleepOnPlayback: boolean;
    releaseChannel: "beta" | "latest" | "alpha";
    startMinimized: boolean;
    tray: boolean;
    windowBarStyle: import("/@/shared/types/types").Platform;
};
export declare const useWindowBarStyle: () => import("/@/shared/types/types").Platform;
export declare const useHotkeySettings: () => {
    bindings: Required<Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
        allowGlobal: boolean;
        hotkey: string;
        isGlobal: boolean;
    }>>>;
    globalMediaHotkeys: boolean;
};
export declare const useHotkeyBindings: () => Required<Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
    allowGlobal: boolean;
    hotkey: string;
    isGlobal: boolean;
}>>>;
export declare const useLayoutHotkeyBindings: () => {
    browserBack: {
        allowGlobal: boolean;
        hotkey: string;
        isGlobal: boolean;
    };
    browserForward: {
        allowGlobal: boolean;
        hotkey: string;
        isGlobal: boolean;
    };
    globalSearch: {
        allowGlobal: boolean;
        hotkey: string;
        isGlobal: boolean;
    };
    navigateHome: {
        allowGlobal: boolean;
        hotkey: string;
        isGlobal: boolean;
    };
    zoomIn: {
        allowGlobal: boolean;
        hotkey: string;
        isGlobal: boolean;
    };
    zoomOut: {
        allowGlobal: boolean;
        hotkey: string;
        isGlobal: boolean;
    };
};
export declare const useMpvSettings: () => {
    audioExclusiveMode: "no" | "yes";
    gaplessAudio: "no" | "yes" | "weak";
    replayGainClip: boolean;
    replayGainMode: "no" | "album" | "track";
    audioFormat?: "float" | "s16" | "s32" | undefined;
    audioSampleRateHz?: number | undefined;
    replayGainFallbackDB?: number | undefined;
    replayGainPreampDB?: number | undefined;
};
export declare const useLyricsSettings: () => {
    fetch: boolean;
    alignment: "center" | "left" | "right";
    delayMs: number;
    enableAutoTranslation: boolean;
    follow: boolean;
    preferLocalLyrics: boolean;
    showMatch: boolean;
    showProvider: boolean;
    sources: import("../../../shared/types/domain-types").LyricSource[];
    translationApiKey: string;
    translationApiProvider: string | null;
    translationTargetLanguage: string | null;
};
export declare const useLyricsDisplaySettings: (key?: string) => {
    gap: number;
    fontSize: number;
    fontSizeUnsync: number;
    gapUnsync: number;
    opacityNonActive: number;
    scaleNonActive: number;
};
export declare const useRemoteSettings: () => {
    password: string;
    username: string;
    enabled: boolean;
    port: number;
};
export declare const useFontSettings: () => {
    custom: string | null;
    type: import("/@/shared/types/types").FontType;
    builtIn: string;
    system: string | null;
};
export declare const useDiscordSettings: () => {
    enabled: boolean;
    clientId: string;
    displayType: "artist" | "song" | "samo";
    linkType: "none" | "last_fm" | "musicbrainz" | "musicbrainz_last_fm";
    showAsListening: boolean;
    showPaused: boolean;
    showServerImage: boolean;
    showStateIcon: boolean;
};
export declare const useCssSettings: () => {
    content: string;
    enabled: boolean;
};
export declare const useQueryBuilderSettings: () => {
    tag: {
        label: string;
        type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
        value: string;
    }[];
};
export declare const useSettingsForExport: () => SettingsState & {
    version: number;
};
export declare const migrateSettings: (settings: SettingsState, settingsVersion: number) => SettingsState;
export declare const useListSettings: (type: ItemListKey) => ItemListSettings;
export declare const usePrimaryColor: () => string;
export declare const usePlayerbarSlider: () => {
    type: "slider" | "waveform";
    barAlign: "center" | "top" | "bottom";
    barGap: number;
    barRadius: number;
    barWidth: number;
    loadingDelay: number;
};
export declare const useGenreTarget: () => "album" | "track";
export declare const usePlaylistTarget: () => "album" | "track";
export declare const useLanguage: () => string;
export declare const useAccent: () => string;
export declare const useNativeAspectRatio: () => boolean;
export declare const useButtonSize: () => number;
export declare const useSkipButtons: () => {
    enabled: boolean;
    skipBackwardSeconds: number;
    skipForwardSeconds: number;
};
export declare const useImageRes: () => {
    sidebar: number;
    table: number;
    header: number;
    fullScreenPlayer: number;
    itemCard: number;
};
export declare const useVolumeWidth: () => number;
export declare const useFollowCurrentSong: () => boolean;
export declare const useThemeSettings: () => {
    followSystemTheme: boolean;
    primaryShade: number;
    theme: import("../../../shared/themes/app-theme-types").AppTheme;
    themeDark: import("../../../shared/themes/app-theme-types").AppTheme;
    themeLight: import("../../../shared/themes/app-theme-types").AppTheme;
    useThemeAccentColor: boolean;
    useThemePrimaryShade: boolean;
};
export declare const useSideQueueType: () => "sideQueue" | "sideDrawerQueue";
export declare const useSideQueueLayout: () => "horizontal" | "vertical";
export declare const useVolumeWheelStep: () => number;
export declare const useCollections: () => {
    id: string;
    name: string;
    type: import("@samo/core").LibraryItem.ALBUM | import("@samo/core").LibraryItem.SONG;
    filterQueryString: string;
}[];
export declare const useSidebarPlaylistList: () => boolean;
export declare const useSidebarPlaylistSorting: () => boolean;
export declare const useSidebarPlaylistListFilterRegex: () => string;
export declare const useSidebarItems: () => {
    id: string;
    label: string;
    disabled: boolean;
    route: string;
}[];
export declare const usePlayerItems: () => {
    id: "bpm" | "codec" | "genres" | "bit_depth" | "bit_rate" | "disc_number" | "sample_rate" | "track_number" | "release_year" | "release_type" | "release_date";
    disabled: boolean;
}[];
export declare const useSidebarCollapsedNavigation: () => boolean;
export declare const usePlayerbarOpenDrawer: () => boolean;
export declare const useShowRatings: () => boolean;
export declare const useArtistRadioCount: () => number;
export declare const useArtistBackground: () => {
    artistBackground: boolean;
    artistBackgroundBlur: number;
};
export declare const useAlbumBackground: () => {
    albumBackground: boolean;
    albumBackgroundBlur: number;
};
export declare const useExternalLinks: () => {
    externalLinks: boolean;
    lastFM: boolean;
    listenBrainz: boolean;
    musicBrainz: boolean;
    nativeSpotify: boolean;
    qobuz: boolean;
    spotify: boolean;
};
export declare const useHomeFeature: () => boolean;
export declare const useHomeFeatureStyle: () => import("./schemas").HomeFeatureStyle;
export declare const useHomeItems: () => {
    id: "random" | "genres" | "recentlyAdded" | "recentlyPlayed" | "mostPlayed" | "recentlyReleased";
    disabled: boolean;
}[];
export declare const useArtistItems: () => {
    id: "biography" | "similarArtists" | "compilations" | "favoriteSongs" | "recentAlbums" | "topSongs";
    disabled: boolean;
}[];
export declare const useArtistReleaseTypeItems: () => {
    id: "releaseTypeAlbum" | "releaseTypeEp" | "releaseTypeSingle" | "releaseTypeBroadcast" | "releaseTypeOther" | "releaseTypeCompilation" | "appearsOn" | "releaseTypeAudioDrama" | "releaseTypeAudiobook" | "releaseTypeDemo" | "releaseTypeDjMix" | "releaseTypeFieldRecording" | "releaseTypeInterview" | "releaseTypeLive" | "releaseTypeMixtapeStreet" | "releaseTypeRemix" | "releaseTypeSoundtrack" | "releaseTypeSpokenWord";
    disabled: boolean;
}[];
export declare const useZoomFactor: () => number;
export declare const usePathReplace: () => {
    pathReplace: string;
    pathReplaceWith: string;
};
export declare const useLastfmApiKey: () => string;
export declare const useSidebarPanelOrder: () => ("visualizer" | "lyrics" | "queue")[];
export declare const useCombinedLyricsAndVisualizer: () => boolean;
export declare const useShowLyricsInSidebar: () => boolean;
export declare const useShowVisualizerInSidebar: () => boolean;
export declare const useAutoDJSettings: () => {
    timing: number;
    enabled: boolean;
    itemCount: number;
};
export declare const useVisualizerSettings: () => {
    type: "audiomotionanalyzer" | "butterchurn";
    audiomotionanalyzer: {
        opacity: number;
        mode: number;
        radius: number;
        alphaBars: boolean;
        ansiBands: boolean;
        barSpace: number;
        channelLayout: "single" | "dual-combined" | "dual-horizontal" | "dual-vertical";
        gradient: string;
        colorMode: "gradient" | "bar-index" | "bar-level";
        customGradients: {
            name: string;
            colorStops: {
                color: string;
                level?: number | undefined;
                levelEnabled?: boolean | undefined;
                pos?: number | undefined;
                positionEnabled?: boolean | undefined;
            }[];
            dir?: string | undefined;
        }[];
        fadePeaks: boolean;
        fftSize: number;
        fillAlpha: number;
        frequencyScale: "linear" | "bark" | "log" | "mel";
        gravity: number;
        ledBars: boolean;
        linearAmplitude: boolean;
        linearBoost: number;
        lineWidth: number;
        loRes: boolean;
        lumiBars: boolean;
        maxDecibels: number;
        maxFPS: number;
        maxFreq: number;
        minDecibels: number;
        minFreq: number;
        mirror: number;
        noteLabels: boolean;
        outlineBars: boolean;
        peakFadeTime: number;
        peakHoldTime: number;
        peakLine: boolean;
        presets: {
            id: string;
            name: string;
            value?: any;
        }[];
        radial: boolean;
        radialInvert: boolean;
        reflexAlpha: number;
        reflexBright: number;
        reflexFit: boolean;
        reflexRatio: number;
        roundBars: boolean;
        showFPS: boolean;
        showPeaks: boolean;
        showScaleX: boolean;
        showScaleY: boolean;
        smoothing: number;
        spinSpeed: number;
        splitGradient: boolean;
        trueLeds: boolean;
        volume: number;
        weightingFilter: "" | "A" | "B" | "C" | "D" | "Z";
        gradientLeft?: string | undefined;
        gradientRight?: string | undefined;
    };
    butterchurn: {
        opacity: number;
        maxFPS: number;
        blendTime: number;
        cyclePresets: boolean;
        cycleTime: number;
        ignoredPresets: string[];
        includeAllPresets: boolean;
        randomizeNextPreset: boolean;
        selectedPresets: string[];
        currentPreset?: string | undefined;
    };
};
export declare const subscribeButterchurnPreset: (onChange: (preset: string | undefined, prevPreset: string | undefined) => void) => () => void;
export declare const useButterchurnSettings: () => {
    blendTime: number;
    cyclePresets: boolean;
    cycleTime: number;
    ignoredPresets: string[];
    includeAllPresets: boolean;
    maxFPS: number;
    opacity: number;
    randomizeNextPreset: boolean;
    selectedPresets: string[];
};
