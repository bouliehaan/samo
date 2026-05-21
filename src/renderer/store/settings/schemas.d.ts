import { z } from 'zod';
import { AppRoute } from '/@/renderer/router/routes';
import { AppTheme } from '/@/shared/themes/app-theme-types';
import { LibraryItem, LyricSource, SavedCollection } from '/@/shared/types/domain-types';
import { FontType, ItemListKey, ListDisplayType, ListPaginationType, Platform, Play, PlayerType, TableColumn } from '/@/shared/types/types';
import type { DeepPartial } from './utils';
declare const SideQueueTypeSchema: z.ZodEnum<["sideDrawerQueue", "sideQueue"]>;
declare const SideQueueLayoutSchema: z.ZodEnum<["horizontal", "vertical"]>;
declare const SidebarItemTypeSchema: z.ZodObject<{
    disabled: z.ZodBoolean;
    id: z.ZodString;
    label: z.ZodString;
    route: z.ZodUnion<[z.ZodNativeEnum<typeof AppRoute>, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    disabled: boolean;
    route: string;
}, {
    id: string;
    label: string;
    disabled: boolean;
    route: string;
}>;
declare const ItemTableListColumnConfigSchema: z.ZodObject<{
    align: z.ZodEnum<["center", "end", "start"]>;
    autoSize: z.ZodOptional<z.ZodBoolean>;
    id: z.ZodNativeEnum<typeof TableColumn>;
    isEnabled: z.ZodBoolean;
    pinned: z.ZodUnion<[z.ZodLiteral<"left">, z.ZodLiteral<"right">, z.ZodLiteral<null>]>;
    width: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: TableColumn;
    width: number;
    align: "center" | "start" | "end";
    isEnabled: boolean;
    pinned: "left" | "right" | null;
    autoSize?: boolean | undefined;
}, {
    id: TableColumn;
    width: number;
    align: "center" | "start" | "end";
    isEnabled: boolean;
    pinned: "left" | "right" | null;
    autoSize?: boolean | undefined;
}>;
export type ItemTableListColumnConfig = z.infer<typeof ItemTableListColumnConfigSchema>;
declare const ItemGridListRowConfigSchema: z.ZodObject<{
    align: z.ZodEnum<["center", "end", "start"]>;
    id: z.ZodNativeEnum<typeof TableColumn>;
    isEnabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: TableColumn;
    align: "center" | "start" | "end";
    isEnabled: boolean;
}, {
    id: TableColumn;
    align: "center" | "start" | "end";
    isEnabled: boolean;
}>;
export type ItemGridListRowConfig = z.infer<typeof ItemGridListRowConfigSchema>;
declare const ItemTableListPropsSchema: z.ZodObject<{
    autoFitColumns: z.ZodBoolean;
    columns: z.ZodArray<z.ZodObject<{
        align: z.ZodEnum<["center", "end", "start"]>;
        autoSize: z.ZodOptional<z.ZodBoolean>;
        id: z.ZodNativeEnum<typeof TableColumn>;
        isEnabled: z.ZodBoolean;
        pinned: z.ZodUnion<[z.ZodLiteral<"left">, z.ZodLiteral<"right">, z.ZodLiteral<null>]>;
        width: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: TableColumn;
        width: number;
        align: "center" | "start" | "end";
        isEnabled: boolean;
        pinned: "left" | "right" | null;
        autoSize?: boolean | undefined;
    }, {
        id: TableColumn;
        width: number;
        align: "center" | "start" | "end";
        isEnabled: boolean;
        pinned: "left" | "right" | null;
        autoSize?: boolean | undefined;
    }>, "many">;
    enableAlternateRowColors: z.ZodBoolean;
    enableHeader: z.ZodBoolean;
    enableHorizontalBorders: z.ZodBoolean;
    enableRowHoverHighlight: z.ZodBoolean;
    enableVerticalBorders: z.ZodBoolean;
    size: z.ZodEnum<["compact", "default", "large"]>;
}, "strip", z.ZodTypeAny, {
    size: "default" | "compact" | "large";
    columns: {
        id: TableColumn;
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
}, {
    size: "default" | "compact" | "large";
    columns: {
        id: TableColumn;
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
}>;
declare const ItemDetailListPropsSchema: z.ZodObject<{
    columns: z.ZodArray<z.ZodObject<{
        align: z.ZodEnum<["center", "end", "start"]>;
        autoSize: z.ZodOptional<z.ZodBoolean>;
        id: z.ZodNativeEnum<typeof TableColumn>;
        isEnabled: z.ZodBoolean;
        pinned: z.ZodUnion<[z.ZodLiteral<"left">, z.ZodLiteral<"right">, z.ZodLiteral<null>]>;
        width: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: TableColumn;
        width: number;
        align: "center" | "start" | "end";
        isEnabled: boolean;
        pinned: "left" | "right" | null;
        autoSize?: boolean | undefined;
    }, {
        id: TableColumn;
        width: number;
        align: "center" | "start" | "end";
        isEnabled: boolean;
        pinned: "left" | "right" | null;
        autoSize?: boolean | undefined;
    }>, "many">;
    enableAlternateRowColors: z.ZodBoolean;
    enableHeader: z.ZodBoolean;
    enableHorizontalBorders: z.ZodBoolean;
    enableRowHoverHighlight: z.ZodBoolean;
    enableVerticalBorders: z.ZodBoolean;
    size: z.ZodEnum<["compact", "default", "large"]>;
}, "strip", z.ZodTypeAny, {
    size: "default" | "compact" | "large";
    columns: {
        id: TableColumn;
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
}, {
    size: "default" | "compact" | "large";
    columns: {
        id: TableColumn;
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
}>;
declare const TranscodingConfigSchema: z.ZodObject<{
    bitrate: z.ZodOptional<z.ZodNumber>;
    enabled: z.ZodBoolean;
    format: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    bitrate?: number | undefined;
    format?: string | undefined;
}, {
    enabled: boolean;
    bitrate?: number | undefined;
    format?: string | undefined;
}>;
export declare enum HomeFeatureStyle {
    MULTIPLE = "multiple",
    SINGLE = "single"
}
export declare const GeneralSettingsSchema: z.ZodObject<{
    accent: z.ZodEffects<z.ZodString, string, string>;
    albumBackground: z.ZodBoolean;
    albumBackgroundBlur: z.ZodNumber;
    artistBackground: z.ZodBoolean;
    artistBackgroundBlur: z.ZodNumber;
    artistItems: z.ZodArray<z.ZodObject<{
        disabled: z.ZodBoolean;
        id: z.ZodEnum<["biography", "compilations", "favoriteSongs", "recentAlbums", "similarArtists", "topSongs"]>;
    }, "strip", z.ZodTypeAny, {
        id: "biography" | "similarArtists" | "compilations" | "favoriteSongs" | "recentAlbums" | "topSongs";
        disabled: boolean;
    }, {
        id: "biography" | "similarArtists" | "compilations" | "favoriteSongs" | "recentAlbums" | "topSongs";
        disabled: boolean;
    }>, "many">;
    artistRadioCount: z.ZodNumber;
    artistReleaseTypeItems: z.ZodArray<z.ZodObject<{
        disabled: z.ZodBoolean;
        id: z.ZodEnum<["releaseTypeAlbum", "releaseTypeEp", "releaseTypeSingle", "releaseTypeBroadcast", "releaseTypeOther", "releaseTypeCompilation", "appearsOn", "releaseTypeAudioDrama", "releaseTypeAudiobook", "releaseTypeDemo", "releaseTypeDjMix", "releaseTypeFieldRecording", "releaseTypeInterview", "releaseTypeLive", "releaseTypeMixtapeStreet", "releaseTypeRemix", "releaseTypeSoundtrack", "releaseTypeSpokenWord"]>;
    }, "strip", z.ZodTypeAny, {
        id: "releaseTypeAlbum" | "releaseTypeEp" | "releaseTypeSingle" | "releaseTypeBroadcast" | "releaseTypeOther" | "releaseTypeCompilation" | "appearsOn" | "releaseTypeAudioDrama" | "releaseTypeAudiobook" | "releaseTypeDemo" | "releaseTypeDjMix" | "releaseTypeFieldRecording" | "releaseTypeInterview" | "releaseTypeLive" | "releaseTypeMixtapeStreet" | "releaseTypeRemix" | "releaseTypeSoundtrack" | "releaseTypeSpokenWord";
        disabled: boolean;
    }, {
        id: "releaseTypeAlbum" | "releaseTypeEp" | "releaseTypeSingle" | "releaseTypeBroadcast" | "releaseTypeOther" | "releaseTypeCompilation" | "appearsOn" | "releaseTypeAudioDrama" | "releaseTypeAudiobook" | "releaseTypeDemo" | "releaseTypeDjMix" | "releaseTypeFieldRecording" | "releaseTypeInterview" | "releaseTypeLive" | "releaseTypeMixtapeStreet" | "releaseTypeRemix" | "releaseTypeSoundtrack" | "releaseTypeSpokenWord";
        disabled: boolean;
    }>, "many">;
    autoSave: z.ZodObject<{
        count: z.ZodNumber;
        enabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        count: number;
        enabled: boolean;
    }, {
        count: number;
        enabled: boolean;
    }>;
    blurExplicitImages: z.ZodBoolean;
    buttonSize: z.ZodNumber;
    collections: z.ZodArray<z.ZodObject<{
        filterQueryString: z.ZodString;
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<[LibraryItem.ALBUM, LibraryItem.SONG]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        type: LibraryItem.ALBUM | LibraryItem.SONG;
        filterQueryString: string;
    }, {
        id: string;
        name: string;
        type: LibraryItem.ALBUM | LibraryItem.SONG;
        filterQueryString: string;
    }>, "many">;
    combinedLyricsAndVisualizer: z.ZodBoolean;
    disabledContextMenu: z.ZodRecord<z.ZodString, z.ZodBoolean>;
    enableGridMultiSelect: z.ZodBoolean;
    externalLinks: z.ZodBoolean;
    followCurrentSong: z.ZodBoolean;
    followSystemTheme: z.ZodBoolean;
    genreTarget: z.ZodEnum<["album", "track"]>;
    homeFeature: z.ZodBoolean;
    homeFeatureStyle: z.ZodNativeEnum<typeof HomeFeatureStyle>;
    homeItems: z.ZodArray<z.ZodObject<{
        disabled: z.ZodBoolean;
        id: z.ZodEnum<["genres", "mostPlayed", "random", "recentlyAdded", "recentlyPlayed", "recentlyReleased"]>;
    }, "strip", z.ZodTypeAny, {
        id: "random" | "genres" | "recentlyAdded" | "recentlyPlayed" | "mostPlayed" | "recentlyReleased";
        disabled: boolean;
    }, {
        id: "random" | "genres" | "recentlyAdded" | "recentlyPlayed" | "mostPlayed" | "recentlyReleased";
        disabled: boolean;
    }>, "many">;
    imageRes: z.ZodObject<{
        fullScreenPlayer: z.ZodNumber;
        header: z.ZodNumber;
        itemCard: z.ZodNumber;
        sidebar: z.ZodNumber;
        table: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sidebar: number;
        table: number;
        header: number;
        fullScreenPlayer: number;
        itemCard: number;
    }, {
        sidebar: number;
        table: number;
        header: number;
        fullScreenPlayer: number;
        itemCard: number;
    }>;
    language: z.ZodString;
    lastFM: z.ZodBoolean;
    lastfmApiKey: z.ZodString;
    listenBrainz: z.ZodBoolean;
    musicBrainz: z.ZodBoolean;
    nativeAspectRatio: z.ZodBoolean;
    nativeSpotify: z.ZodBoolean;
    offlineMode: z.ZodBoolean;
    passwordStore: z.ZodOptional<z.ZodString>;
    pathReplace: z.ZodString;
    pathReplaceWith: z.ZodString;
    playButtonBehavior: z.ZodNativeEnum<typeof Play>;
    playerbarOpenDrawer: z.ZodBoolean;
    playerbarSlider: z.ZodObject<{
        barAlign: z.ZodEnum<["top", "bottom", "center"]>;
        barGap: z.ZodNumber;
        barRadius: z.ZodNumber;
        barWidth: z.ZodNumber;
        loadingDelay: z.ZodNumber;
        type: z.ZodEnum<["slider", "waveform"]>;
    }, "strip", z.ZodTypeAny, {
        type: "slider" | "waveform";
        barAlign: "center" | "top" | "bottom";
        barGap: number;
        barRadius: number;
        barWidth: number;
        loadingDelay: number;
    }, {
        type: "slider" | "waveform";
        barAlign: "center" | "top" | "bottom";
        barGap: number;
        barRadius: number;
        barWidth: number;
        loadingDelay: number;
    }>;
    playerItems: z.ZodArray<z.ZodObject<{
        disabled: z.ZodBoolean;
        id: z.ZodEnum<["bit_depth", "bit_rate", "bpm", "disc_number", "sample_rate", "track_number", "codec", "release_year", "release_type", "release_date", "genres"]>;
    }, "strip", z.ZodTypeAny, {
        id: "bpm" | "codec" | "genres" | "bit_depth" | "bit_rate" | "disc_number" | "sample_rate" | "track_number" | "release_year" | "release_type" | "release_date";
        disabled: boolean;
    }, {
        id: "bpm" | "codec" | "genres" | "bit_depth" | "bit_rate" | "disc_number" | "sample_rate" | "track_number" | "release_year" | "release_type" | "release_date";
        disabled: boolean;
    }>, "many">;
    playlistTarget: z.ZodEnum<["album", "track"]>;
    primaryShade: z.ZodNumber;
    qobuz: z.ZodBoolean;
    resume: z.ZodBoolean;
    showLyricsInSidebar: z.ZodBoolean;
    showRatings: z.ZodBoolean;
    showVisualizerInSidebar: z.ZodBoolean;
    sidebarCollapsedNavigation: z.ZodBoolean;
    sidebarCollapseShared: z.ZodBoolean;
    sidebarItems: z.ZodArray<z.ZodObject<{
        disabled: z.ZodBoolean;
        id: z.ZodString;
        label: z.ZodString;
        route: z.ZodUnion<[z.ZodNativeEnum<typeof AppRoute>, z.ZodString]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
        disabled: boolean;
        route: string;
    }, {
        id: string;
        label: string;
        disabled: boolean;
        route: string;
    }>, "many">;
    sidebarPanelOrder: z.ZodArray<z.ZodEnum<["queue", "lyrics", "visualizer"]>, "many">;
    sidebarPlaylistList: z.ZodBoolean;
    sidebarPlaylistListFilterRegex: z.ZodString;
    sidebarPlaylistSorting: z.ZodBoolean;
    sideQueueLayout: z.ZodEnum<["horizontal", "vertical"]>;
    sideQueueType: z.ZodEnum<["sideDrawerQueue", "sideQueue"]>;
    skipButtons: z.ZodObject<{
        enabled: z.ZodBoolean;
        skipBackwardSeconds: z.ZodNumber;
        skipForwardSeconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        skipBackwardSeconds: number;
        skipForwardSeconds: number;
    }, {
        enabled: boolean;
        skipBackwardSeconds: number;
        skipForwardSeconds: number;
    }>;
    spotify: z.ZodBoolean;
    theme: z.ZodNativeEnum<typeof AppTheme>;
    themeDark: z.ZodNativeEnum<typeof AppTheme>;
    themeLight: z.ZodNativeEnum<typeof AppTheme>;
    useThemeAccentColor: z.ZodBoolean;
    useThemePrimaryShade: z.ZodBoolean;
    volumeWheelStep: z.ZodNumber;
    volumeWidth: z.ZodNumber;
    zoomFactor: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    theme: AppTheme;
    collections: {
        id: string;
        name: string;
        type: LibraryItem.ALBUM | LibraryItem.SONG;
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
    homeFeatureStyle: HomeFeatureStyle;
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
    playButtonBehavior: Play;
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
    themeDark: AppTheme;
    themeLight: AppTheme;
    useThemeAccentColor: boolean;
    useThemePrimaryShade: boolean;
    volumeWheelStep: number;
    volumeWidth: number;
    zoomFactor: number;
    passwordStore?: string | undefined;
}, {
    theme: AppTheme;
    collections: {
        id: string;
        name: string;
        type: LibraryItem.ALBUM | LibraryItem.SONG;
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
    homeFeatureStyle: HomeFeatureStyle;
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
    playButtonBehavior: Play;
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
    themeDark: AppTheme;
    themeLight: AppTheme;
    useThemeAccentColor: boolean;
    useThemePrimaryShade: boolean;
    volumeWheelStep: number;
    volumeWidth: number;
    zoomFactor: number;
    passwordStore?: string | undefined;
}>;
declare const PlayerFilterFieldSchema: z.ZodEnum<["name", "albumArtist", "artist", "duration", "genre", "year", "note", "path", "playCount", "favorite", "rating"]>;
declare const PlayerFilterOperatorSchema: z.ZodEnum<["is", "isNot", "contains", "notContains", "startsWith", "endsWith", "regex", "gt", "lt", "inTheRange", "before", "after", "beforeDate", "afterDate", "inTheRangeDate", "inTheLast", "notInTheLast"]>;
declare const PlayerFilterSchema: z.ZodObject<{
    field: z.ZodEnum<["name", "albumArtist", "artist", "duration", "genre", "year", "note", "path", "playCount", "favorite", "rating"]>;
    id: z.ZodString;
    isEnabled: z.ZodOptional<z.ZodBoolean>;
    operator: z.ZodEnum<["is", "isNot", "contains", "notContains", "startsWith", "endsWith", "regex", "gt", "lt", "inTheRange", "before", "after", "beforeDate", "afterDate", "inTheRangeDate", "inTheLast", "notInTheLast"]>;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    value: string | number | boolean | (string | number)[];
    field: "duration" | "favorite" | "name" | "note" | "path" | "rating" | "year" | "artist" | "genre" | "albumArtist" | "playCount";
    operator: "contains" | "is" | "regex" | "startsWith" | "endsWith" | "isNot" | "before" | "after" | "inTheLast" | "notInTheLast" | "inTheRange" | "beforeDate" | "afterDate" | "inTheRangeDate" | "notContains" | "gt" | "lt";
    isEnabled?: boolean | undefined;
}, {
    id: string;
    value: string | number | boolean | (string | number)[];
    field: "duration" | "favorite" | "name" | "note" | "path" | "rating" | "year" | "artist" | "genre" | "albumArtist" | "playCount";
    operator: "contains" | "is" | "regex" | "startsWith" | "endsWith" | "isNot" | "before" | "after" | "inTheLast" | "notInTheLast" | "inTheRange" | "beforeDate" | "afterDate" | "inTheRangeDate" | "notContains" | "gt" | "lt";
    isEnabled?: boolean | undefined;
}>;
/**
 * This schema is used for validation of the imported settings json
 */
export declare const ValidationSettingsStateSchema: z.ZodObject<{
    autoDJ: z.ZodObject<{
        enabled: z.ZodBoolean;
        itemCount: z.ZodNumber;
        timing: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timing: number;
        enabled: boolean;
        itemCount: number;
    }, {
        timing: number;
        enabled: boolean;
        itemCount: number;
    }>;
    css: z.ZodObject<{
        content: z.ZodEffects<z.ZodString, string, string>;
        enabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        content: string;
        enabled: boolean;
    }, {
        content: string;
        enabled: boolean;
    }>;
    discord: z.ZodObject<{
        clientId: z.ZodString;
        displayType: z.ZodEnum<["artist", "samo", "song"]>;
        enabled: z.ZodBoolean;
        linkType: z.ZodEnum<["last_fm", "musicbrainz", "musicbrainz_last_fm", "none"]>;
        showAsListening: z.ZodBoolean;
        showPaused: z.ZodBoolean;
        showServerImage: z.ZodBoolean;
        showStateIcon: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        clientId: string;
        displayType: "artist" | "song" | "samo";
        linkType: "none" | "last_fm" | "musicbrainz" | "musicbrainz_last_fm";
        showAsListening: boolean;
        showPaused: boolean;
        showServerImage: boolean;
        showStateIcon: boolean;
    }, {
        enabled: boolean;
        clientId: string;
        displayType: "artist" | "song" | "samo";
        linkType: "none" | "last_fm" | "musicbrainz" | "musicbrainz_last_fm";
        showAsListening: boolean;
        showPaused: boolean;
        showServerImage: boolean;
        showStateIcon: boolean;
    }>;
    font: z.ZodObject<{
        builtIn: z.ZodEnum<[string, ...string[]]>;
        custom: z.ZodNullable<z.ZodString>;
        system: z.ZodNullable<z.ZodString>;
        type: z.ZodNativeEnum<typeof FontType>;
    }, "strip", z.ZodTypeAny, {
        custom: string | null;
        type: FontType;
        builtIn: string;
        system: string | null;
    }, {
        custom: string | null;
        type: FontType;
        builtIn: string;
        system: string | null;
    }>;
    general: z.ZodObject<{
        accent: z.ZodEffects<z.ZodString, string, string>;
        albumBackground: z.ZodBoolean;
        albumBackgroundBlur: z.ZodNumber;
        artistBackground: z.ZodBoolean;
        artistBackgroundBlur: z.ZodNumber;
        artistItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodEnum<["biography", "compilations", "favoriteSongs", "recentAlbums", "similarArtists", "topSongs"]>;
        }, "strip", z.ZodTypeAny, {
            id: "biography" | "similarArtists" | "compilations" | "favoriteSongs" | "recentAlbums" | "topSongs";
            disabled: boolean;
        }, {
            id: "biography" | "similarArtists" | "compilations" | "favoriteSongs" | "recentAlbums" | "topSongs";
            disabled: boolean;
        }>, "many">;
        artistRadioCount: z.ZodNumber;
        artistReleaseTypeItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodEnum<["releaseTypeAlbum", "releaseTypeEp", "releaseTypeSingle", "releaseTypeBroadcast", "releaseTypeOther", "releaseTypeCompilation", "appearsOn", "releaseTypeAudioDrama", "releaseTypeAudiobook", "releaseTypeDemo", "releaseTypeDjMix", "releaseTypeFieldRecording", "releaseTypeInterview", "releaseTypeLive", "releaseTypeMixtapeStreet", "releaseTypeRemix", "releaseTypeSoundtrack", "releaseTypeSpokenWord"]>;
        }, "strip", z.ZodTypeAny, {
            id: "releaseTypeAlbum" | "releaseTypeEp" | "releaseTypeSingle" | "releaseTypeBroadcast" | "releaseTypeOther" | "releaseTypeCompilation" | "appearsOn" | "releaseTypeAudioDrama" | "releaseTypeAudiobook" | "releaseTypeDemo" | "releaseTypeDjMix" | "releaseTypeFieldRecording" | "releaseTypeInterview" | "releaseTypeLive" | "releaseTypeMixtapeStreet" | "releaseTypeRemix" | "releaseTypeSoundtrack" | "releaseTypeSpokenWord";
            disabled: boolean;
        }, {
            id: "releaseTypeAlbum" | "releaseTypeEp" | "releaseTypeSingle" | "releaseTypeBroadcast" | "releaseTypeOther" | "releaseTypeCompilation" | "appearsOn" | "releaseTypeAudioDrama" | "releaseTypeAudiobook" | "releaseTypeDemo" | "releaseTypeDjMix" | "releaseTypeFieldRecording" | "releaseTypeInterview" | "releaseTypeLive" | "releaseTypeMixtapeStreet" | "releaseTypeRemix" | "releaseTypeSoundtrack" | "releaseTypeSpokenWord";
            disabled: boolean;
        }>, "many">;
        autoSave: z.ZodObject<{
            count: z.ZodNumber;
            enabled: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            count: number;
            enabled: boolean;
        }, {
            count: number;
            enabled: boolean;
        }>;
        blurExplicitImages: z.ZodBoolean;
        buttonSize: z.ZodNumber;
        collections: z.ZodArray<z.ZodObject<{
            filterQueryString: z.ZodString;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodEnum<[LibraryItem.ALBUM, LibraryItem.SONG]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
            filterQueryString: string;
        }, {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
            filterQueryString: string;
        }>, "many">;
        combinedLyricsAndVisualizer: z.ZodBoolean;
        disabledContextMenu: z.ZodRecord<z.ZodString, z.ZodBoolean>;
        enableGridMultiSelect: z.ZodBoolean;
        externalLinks: z.ZodBoolean;
        followCurrentSong: z.ZodBoolean;
        followSystemTheme: z.ZodBoolean;
        genreTarget: z.ZodEnum<["album", "track"]>;
        homeFeature: z.ZodBoolean;
        homeFeatureStyle: z.ZodNativeEnum<typeof HomeFeatureStyle>;
        homeItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodEnum<["genres", "mostPlayed", "random", "recentlyAdded", "recentlyPlayed", "recentlyReleased"]>;
        }, "strip", z.ZodTypeAny, {
            id: "random" | "genres" | "recentlyAdded" | "recentlyPlayed" | "mostPlayed" | "recentlyReleased";
            disabled: boolean;
        }, {
            id: "random" | "genres" | "recentlyAdded" | "recentlyPlayed" | "mostPlayed" | "recentlyReleased";
            disabled: boolean;
        }>, "many">;
        imageRes: z.ZodObject<{
            fullScreenPlayer: z.ZodNumber;
            header: z.ZodNumber;
            itemCard: z.ZodNumber;
            sidebar: z.ZodNumber;
            table: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            sidebar: number;
            table: number;
            header: number;
            fullScreenPlayer: number;
            itemCard: number;
        }, {
            sidebar: number;
            table: number;
            header: number;
            fullScreenPlayer: number;
            itemCard: number;
        }>;
        language: z.ZodString;
        lastFM: z.ZodBoolean;
        lastfmApiKey: z.ZodString;
        listenBrainz: z.ZodBoolean;
        musicBrainz: z.ZodBoolean;
        nativeAspectRatio: z.ZodBoolean;
        nativeSpotify: z.ZodBoolean;
        offlineMode: z.ZodBoolean;
        passwordStore: z.ZodOptional<z.ZodString>;
        pathReplace: z.ZodString;
        pathReplaceWith: z.ZodString;
        playButtonBehavior: z.ZodNativeEnum<typeof Play>;
        playerbarOpenDrawer: z.ZodBoolean;
        playerbarSlider: z.ZodObject<{
            barAlign: z.ZodEnum<["top", "bottom", "center"]>;
            barGap: z.ZodNumber;
            barRadius: z.ZodNumber;
            barWidth: z.ZodNumber;
            loadingDelay: z.ZodNumber;
            type: z.ZodEnum<["slider", "waveform"]>;
        }, "strip", z.ZodTypeAny, {
            type: "slider" | "waveform";
            barAlign: "center" | "top" | "bottom";
            barGap: number;
            barRadius: number;
            barWidth: number;
            loadingDelay: number;
        }, {
            type: "slider" | "waveform";
            barAlign: "center" | "top" | "bottom";
            barGap: number;
            barRadius: number;
            barWidth: number;
            loadingDelay: number;
        }>;
        playerItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodEnum<["bit_depth", "bit_rate", "bpm", "disc_number", "sample_rate", "track_number", "codec", "release_year", "release_type", "release_date", "genres"]>;
        }, "strip", z.ZodTypeAny, {
            id: "bpm" | "codec" | "genres" | "bit_depth" | "bit_rate" | "disc_number" | "sample_rate" | "track_number" | "release_year" | "release_type" | "release_date";
            disabled: boolean;
        }, {
            id: "bpm" | "codec" | "genres" | "bit_depth" | "bit_rate" | "disc_number" | "sample_rate" | "track_number" | "release_year" | "release_type" | "release_date";
            disabled: boolean;
        }>, "many">;
        playlistTarget: z.ZodEnum<["album", "track"]>;
        primaryShade: z.ZodNumber;
        qobuz: z.ZodBoolean;
        resume: z.ZodBoolean;
        showLyricsInSidebar: z.ZodBoolean;
        showRatings: z.ZodBoolean;
        showVisualizerInSidebar: z.ZodBoolean;
        sidebarCollapsedNavigation: z.ZodBoolean;
        sidebarCollapseShared: z.ZodBoolean;
        sidebarItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodString;
            label: z.ZodString;
            route: z.ZodUnion<[z.ZodNativeEnum<typeof AppRoute>, z.ZodString]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
            disabled: boolean;
            route: string;
        }, {
            id: string;
            label: string;
            disabled: boolean;
            route: string;
        }>, "many">;
        sidebarPanelOrder: z.ZodArray<z.ZodEnum<["queue", "lyrics", "visualizer"]>, "many">;
        sidebarPlaylistList: z.ZodBoolean;
        sidebarPlaylistListFilterRegex: z.ZodString;
        sidebarPlaylistSorting: z.ZodBoolean;
        sideQueueLayout: z.ZodEnum<["horizontal", "vertical"]>;
        sideQueueType: z.ZodEnum<["sideDrawerQueue", "sideQueue"]>;
        skipButtons: z.ZodObject<{
            enabled: z.ZodBoolean;
            skipBackwardSeconds: z.ZodNumber;
            skipForwardSeconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            skipBackwardSeconds: number;
            skipForwardSeconds: number;
        }, {
            enabled: boolean;
            skipBackwardSeconds: number;
            skipForwardSeconds: number;
        }>;
        spotify: z.ZodBoolean;
        theme: z.ZodNativeEnum<typeof AppTheme>;
        themeDark: z.ZodNativeEnum<typeof AppTheme>;
        themeLight: z.ZodNativeEnum<typeof AppTheme>;
        useThemeAccentColor: z.ZodBoolean;
        useThemePrimaryShade: z.ZodBoolean;
        volumeWheelStep: z.ZodNumber;
        volumeWidth: z.ZodNumber;
        zoomFactor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        theme: AppTheme;
        collections: {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
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
        homeFeatureStyle: HomeFeatureStyle;
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
        playButtonBehavior: Play;
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
        themeDark: AppTheme;
        themeLight: AppTheme;
        useThemeAccentColor: boolean;
        useThemePrimaryShade: boolean;
        volumeWheelStep: number;
        volumeWidth: number;
        zoomFactor: number;
        passwordStore?: string | undefined;
    }, {
        theme: AppTheme;
        collections: {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
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
        homeFeatureStyle: HomeFeatureStyle;
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
        playButtonBehavior: Play;
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
        themeDark: AppTheme;
        themeLight: AppTheme;
        useThemeAccentColor: boolean;
        useThemePrimaryShade: boolean;
        volumeWheelStep: number;
        volumeWidth: number;
        zoomFactor: number;
        passwordStore?: string | undefined;
    }>;
    hotkeys: z.ZodObject<{
        bindings: z.ZodEffects<z.ZodRecord<z.ZodEnum<["browserBack", "browserForward", "favoriteCurrentAdd", "favoriteCurrentRemove", "favoriteCurrentToggle", "favoritePreviousAdd", "favoritePreviousRemove", "favoritePreviousToggle", "globalSearch", "localSearch", "volumeMute", "navigateHome", "next", "pause", "play", "playPause", "previous", "rate0", "rate1", "rate2", "rate3", "rate4", "rate5", "toggleShuffle", "skipBackward", "skipForward", "stop", "toggleFullscreenPlayer", "toggleQueue", "toggleRepeat", "volumeDown", "volumeUp", "zoomIn", "zoomOut", "listPlayDefault", "listPlayNow", "listPlayNext", "listPlayLast", "listNavigateToPage"]>, z.ZodObject<{
            allowGlobal: z.ZodBoolean;
            hotkey: z.ZodString;
            isGlobal: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }, {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>, Required<Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>>, Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>>;
        globalMediaHotkeys: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        bindings: Required<Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>>;
        globalMediaHotkeys: boolean;
    }, {
        bindings: Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>;
        globalMediaHotkeys: boolean;
    }>;
    lists: z.ZodRecord<z.ZodNativeEnum<typeof ItemListKey>, z.ZodObject<{
        detail: z.ZodOptional<z.ZodObject<{
            columns: z.ZodArray<z.ZodObject<{
                align: z.ZodEnum<["center", "end", "start"]>;
                autoSize: z.ZodOptional<z.ZodBoolean>;
                id: z.ZodNativeEnum<typeof TableColumn>;
                isEnabled: z.ZodBoolean;
                pinned: z.ZodUnion<[z.ZodLiteral<"left">, z.ZodLiteral<"right">, z.ZodLiteral<null>]>;
                width: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: TableColumn;
                width: number;
                align: "center" | "start" | "end";
                isEnabled: boolean;
                pinned: "left" | "right" | null;
                autoSize?: boolean | undefined;
            }, {
                id: TableColumn;
                width: number;
                align: "center" | "start" | "end";
                isEnabled: boolean;
                pinned: "left" | "right" | null;
                autoSize?: boolean | undefined;
            }>, "many">;
            enableAlternateRowColors: z.ZodBoolean;
            enableHeader: z.ZodBoolean;
            enableHorizontalBorders: z.ZodBoolean;
            enableRowHoverHighlight: z.ZodBoolean;
            enableVerticalBorders: z.ZodBoolean;
            size: z.ZodEnum<["compact", "default", "large"]>;
        }, "strip", z.ZodTypeAny, {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        }, {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        }>>;
        display: z.ZodNativeEnum<typeof ListDisplayType>;
        grid: z.ZodObject<{
            itemGap: z.ZodEnum<["lg", "md", "sm", "xl", "xs"]>;
            itemsPerRow: z.ZodNumber;
            itemsPerRowEnabled: z.ZodBoolean;
            rows: z.ZodArray<z.ZodObject<{
                align: z.ZodEnum<["center", "end", "start"]>;
                id: z.ZodNativeEnum<typeof TableColumn>;
                isEnabled: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }, {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }>, "many">;
            size: z.ZodEnum<["compact", "default", "large"]>;
        }, "strip", z.ZodTypeAny, {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        }, {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        }>;
        itemsPerPage: z.ZodNumber;
        pagination: z.ZodNativeEnum<typeof ListPaginationType>;
        table: z.ZodObject<{
            autoFitColumns: z.ZodBoolean;
            columns: z.ZodArray<z.ZodObject<{
                align: z.ZodEnum<["center", "end", "start"]>;
                autoSize: z.ZodOptional<z.ZodBoolean>;
                id: z.ZodNativeEnum<typeof TableColumn>;
                isEnabled: z.ZodBoolean;
                pinned: z.ZodUnion<[z.ZodLiteral<"left">, z.ZodLiteral<"right">, z.ZodLiteral<null>]>;
                width: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: TableColumn;
                width: number;
                align: "center" | "start" | "end";
                isEnabled: boolean;
                pinned: "left" | "right" | null;
                autoSize?: boolean | undefined;
            }, {
                id: TableColumn;
                width: number;
                align: "center" | "start" | "end";
                isEnabled: boolean;
                pinned: "left" | "right" | null;
                autoSize?: boolean | undefined;
            }>, "many">;
            enableAlternateRowColors: z.ZodBoolean;
            enableHeader: z.ZodBoolean;
            enableHorizontalBorders: z.ZodBoolean;
            enableRowHoverHighlight: z.ZodBoolean;
            enableVerticalBorders: z.ZodBoolean;
            size: z.ZodEnum<["compact", "default", "large"]>;
        }, "strip", z.ZodTypeAny, {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        }, {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        }>;
    }, "strip", z.ZodTypeAny, {
        table: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        pagination: ListPaginationType;
        grid: {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        };
        display: ListDisplayType;
        itemsPerPage: number;
        detail?: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
    }, {
        table: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        pagination: ListPaginationType;
        grid: {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        };
        display: ListDisplayType;
        itemsPerPage: number;
        detail?: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
    }>>;
    lyrics: z.ZodObject<{
        alignment: z.ZodEnum<["center", "left", "right"]>;
        delayMs: z.ZodNumber;
        enableAutoTranslation: z.ZodBoolean;
        fetch: z.ZodBoolean;
        follow: z.ZodBoolean;
        preferLocalLyrics: z.ZodBoolean;
        showMatch: z.ZodBoolean;
        showProvider: z.ZodBoolean;
        sources: z.ZodArray<z.ZodNativeEnum<typeof LyricSource>, "many">;
        translationApiKey: z.ZodString;
        translationApiProvider: z.ZodNullable<z.ZodString>;
        translationTargetLanguage: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        fetch: boolean;
        alignment: "center" | "left" | "right";
        delayMs: number;
        enableAutoTranslation: boolean;
        follow: boolean;
        preferLocalLyrics: boolean;
        showMatch: boolean;
        showProvider: boolean;
        sources: LyricSource[];
        translationApiKey: string;
        translationApiProvider: string | null;
        translationTargetLanguage: string | null;
    }, {
        fetch: boolean;
        alignment: "center" | "left" | "right";
        delayMs: number;
        enableAutoTranslation: boolean;
        follow: boolean;
        preferLocalLyrics: boolean;
        showMatch: boolean;
        showProvider: boolean;
        sources: LyricSource[];
        translationApiKey: string;
        translationApiProvider: string | null;
        translationTargetLanguage: string | null;
    }>;
    lyricsDisplay: z.ZodRecord<z.ZodString, z.ZodObject<{
        fontSize: z.ZodNumber;
        fontSizeUnsync: z.ZodNumber;
        gap: z.ZodNumber;
        gapUnsync: z.ZodNumber;
        opacityNonActive: z.ZodNumber;
        scaleNonActive: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        gap: number;
        fontSize: number;
        fontSizeUnsync: number;
        gapUnsync: number;
        opacityNonActive: number;
        scaleNonActive: number;
    }, {
        gap: number;
        fontSize: number;
        fontSizeUnsync: number;
        gapUnsync: number;
        opacityNonActive: number;
        scaleNonActive: number;
    }>>;
    playback: z.ZodObject<{
        audioDeviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        audioFadeOnStatusChange: z.ZodBoolean;
        filters: z.ZodArray<z.ZodObject<{
            field: z.ZodEnum<["name", "albumArtist", "artist", "duration", "genre", "year", "note", "path", "playCount", "favorite", "rating"]>;
            id: z.ZodString;
            isEnabled: z.ZodOptional<z.ZodBoolean>;
            operator: z.ZodEnum<["is", "isNot", "contains", "notContains", "startsWith", "endsWith", "regex", "gt", "lt", "inTheRange", "before", "after", "beforeDate", "afterDate", "inTheRangeDate", "inTheLast", "notInTheLast"]>;
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            value: string | number | boolean | (string | number)[];
            field: "duration" | "favorite" | "name" | "note" | "path" | "rating" | "year" | "artist" | "genre" | "albumArtist" | "playCount";
            operator: "contains" | "is" | "regex" | "startsWith" | "endsWith" | "isNot" | "before" | "after" | "inTheLast" | "notInTheLast" | "inTheRange" | "beforeDate" | "afterDate" | "inTheRangeDate" | "notContains" | "gt" | "lt";
            isEnabled?: boolean | undefined;
        }, {
            id: string;
            value: string | number | boolean | (string | number)[];
            field: "duration" | "favorite" | "name" | "note" | "path" | "rating" | "year" | "artist" | "genre" | "albumArtist" | "playCount";
            operator: "contains" | "is" | "regex" | "startsWith" | "endsWith" | "isNot" | "before" | "after" | "inTheLast" | "notInTheLast" | "inTheRange" | "beforeDate" | "afterDate" | "inTheRangeDate" | "notContains" | "gt" | "lt";
            isEnabled?: boolean | undefined;
        }>, "many">;
        mediaSession: z.ZodBoolean;
        mpvAudioDeviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        mpvExtraParameters: z.ZodArray<z.ZodString, "many">;
        mpvProperties: z.ZodObject<{
            audioExclusiveMode: z.ZodEnum<["no", "yes"]>;
            audioFormat: z.ZodOptional<z.ZodEnum<["float", "s16", "s32"]>>;
            audioSampleRateHz: z.ZodOptional<z.ZodNumber>;
            gaplessAudio: z.ZodEnum<["no", "weak", "yes"]>;
            replayGainClip: z.ZodBoolean;
            replayGainFallbackDB: z.ZodOptional<z.ZodNumber>;
            replayGainMode: z.ZodEnum<["album", "no", "track"]>;
            replayGainPreampDB: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            audioExclusiveMode: "no" | "yes";
            gaplessAudio: "no" | "yes" | "weak";
            replayGainClip: boolean;
            replayGainMode: "no" | "album" | "track";
            audioFormat?: "float" | "s16" | "s32" | undefined;
            audioSampleRateHz?: number | undefined;
            replayGainFallbackDB?: number | undefined;
            replayGainPreampDB?: number | undefined;
        }, {
            audioExclusiveMode: "no" | "yes";
            gaplessAudio: "no" | "yes" | "weak";
            replayGainClip: boolean;
            replayGainMode: "no" | "album" | "track";
            audioFormat?: "float" | "s16" | "s32" | undefined;
            audioSampleRateHz?: number | undefined;
            replayGainFallbackDB?: number | undefined;
            replayGainPreampDB?: number | undefined;
        }>;
        preservePitch: z.ZodBoolean;
        scrobble: z.ZodObject<{
            enabled: z.ZodBoolean;
            notify: z.ZodBoolean;
            scrobbleAtDuration: z.ZodNumber;
            scrobbleAtPercentage: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            notify: boolean;
            scrobbleAtDuration: number;
            scrobbleAtPercentage: number;
        }, {
            enabled: boolean;
            notify: boolean;
            scrobbleAtDuration: number;
            scrobbleAtPercentage: number;
        }>;
        transcode: z.ZodObject<{
            bitrate: z.ZodOptional<z.ZodNumber>;
            enabled: z.ZodBoolean;
            format: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            bitrate?: number | undefined;
            format?: string | undefined;
        }, {
            enabled: boolean;
            bitrate?: number | undefined;
            format?: string | undefined;
        }>;
        type: z.ZodNativeEnum<typeof PlayerType>;
        webAudio: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
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
        type: PlayerType;
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
    }, {
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
        type: PlayerType;
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
    }>;
    queryBuilder: z.ZodObject<{
        tag: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            type: z.ZodEnum<["boolean", "date", "dateRange", "number", "playlist", "string"]>;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }, {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        tag: {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }[];
    }, {
        tag: {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }[];
    }>;
    remote: z.ZodObject<{
        enabled: z.ZodBoolean;
        password: z.ZodString;
        port: z.ZodNumber;
        username: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
        username: string;
        enabled: boolean;
        port: number;
    }, {
        password: string;
        username: string;
        enabled: boolean;
        port: number;
    }>;
    tab: z.ZodUnion<[z.ZodLiteral<"general">, z.ZodLiteral<"hotkeys">, z.ZodLiteral<"playback">, z.ZodLiteral<"window">, z.ZodString]>;
    visualizer: z.ZodObject<{
        audiomotionanalyzer: z.ZodObject<{
            alphaBars: z.ZodBoolean;
            ansiBands: z.ZodBoolean;
            barSpace: z.ZodNumber;
            channelLayout: z.ZodEnum<["single", "dual-combined", "dual-horizontal", "dual-vertical"]>;
            colorMode: z.ZodEnum<["gradient", "bar-index", "bar-level"]>;
            customGradients: z.ZodArray<z.ZodObject<{
                colorStops: z.ZodArray<z.ZodObject<{
                    color: z.ZodString;
                    level: z.ZodOptional<z.ZodNumber>;
                    levelEnabled: z.ZodOptional<z.ZodBoolean>;
                    pos: z.ZodOptional<z.ZodNumber>;
                    positionEnabled: z.ZodOptional<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    color: string;
                    level?: number | undefined;
                    levelEnabled?: boolean | undefined;
                    pos?: number | undefined;
                    positionEnabled?: boolean | undefined;
                }, {
                    color: string;
                    level?: number | undefined;
                    levelEnabled?: boolean | undefined;
                    pos?: number | undefined;
                    positionEnabled?: boolean | undefined;
                }>, "many">;
                dir: z.ZodOptional<z.ZodString>;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                colorStops: {
                    color: string;
                    level?: number | undefined;
                    levelEnabled?: boolean | undefined;
                    pos?: number | undefined;
                    positionEnabled?: boolean | undefined;
                }[];
                dir?: string | undefined;
            }, {
                name: string;
                colorStops: {
                    color: string;
                    level?: number | undefined;
                    levelEnabled?: boolean | undefined;
                    pos?: number | undefined;
                    positionEnabled?: boolean | undefined;
                }[];
                dir?: string | undefined;
            }>, "many">;
            fadePeaks: z.ZodBoolean;
            fftSize: z.ZodNumber;
            fillAlpha: z.ZodNumber;
            frequencyScale: z.ZodEnum<["bark", "linear", "log", "mel"]>;
            gradient: z.ZodString;
            gradientLeft: z.ZodOptional<z.ZodString>;
            gradientRight: z.ZodOptional<z.ZodString>;
            gravity: z.ZodNumber;
            ledBars: z.ZodBoolean;
            linearAmplitude: z.ZodBoolean;
            linearBoost: z.ZodNumber;
            lineWidth: z.ZodNumber;
            loRes: z.ZodBoolean;
            lumiBars: z.ZodBoolean;
            maxDecibels: z.ZodNumber;
            maxFPS: z.ZodNumber;
            maxFreq: z.ZodNumber;
            minDecibels: z.ZodNumber;
            minFreq: z.ZodNumber;
            mirror: z.ZodNumber;
            mode: z.ZodNumber;
            noteLabels: z.ZodBoolean;
            opacity: z.ZodNumber;
            outlineBars: z.ZodBoolean;
            peakFadeTime: z.ZodNumber;
            peakHoldTime: z.ZodNumber;
            peakLine: z.ZodBoolean;
            presets: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                value: z.ZodAny;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                value?: any;
            }, {
                id: string;
                name: string;
                value?: any;
            }>, "many">;
            radial: z.ZodBoolean;
            radialInvert: z.ZodBoolean;
            radius: z.ZodNumber;
            reflexAlpha: z.ZodNumber;
            reflexBright: z.ZodNumber;
            reflexFit: z.ZodBoolean;
            reflexRatio: z.ZodNumber;
            roundBars: z.ZodBoolean;
            showFPS: z.ZodBoolean;
            showPeaks: z.ZodBoolean;
            showScaleX: z.ZodBoolean;
            showScaleY: z.ZodBoolean;
            smoothing: z.ZodNumber;
            spinSpeed: z.ZodNumber;
            splitGradient: z.ZodBoolean;
            trueLeds: z.ZodBoolean;
            volume: z.ZodNumber;
            weightingFilter: z.ZodEnum<["", "A", "B", "C", "D", "Z"]>;
        }, "strip", z.ZodTypeAny, {
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
        }, {
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
        }>;
        butterchurn: z.ZodObject<{
            blendTime: z.ZodNumber;
            currentPreset: z.ZodOptional<z.ZodString>;
            cyclePresets: z.ZodBoolean;
            cycleTime: z.ZodNumber;
            ignoredPresets: z.ZodArray<z.ZodString, "many">;
            includeAllPresets: z.ZodBoolean;
            maxFPS: z.ZodNumber;
            opacity: z.ZodNumber;
            randomizeNextPreset: z.ZodBoolean;
            selectedPresets: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
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
        }, {
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
        }>;
        type: z.ZodEnum<["audiomotionanalyzer", "butterchurn"]>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>;
    window: z.ZodObject<{
        disableAutoUpdate: z.ZodBoolean;
        exitToTray: z.ZodBoolean;
        minimizeToTray: z.ZodBoolean;
        preventSleepOnPlayback: z.ZodBoolean;
        releaseChannel: z.ZodEnum<["alpha", "beta", "latest"]>;
        startMinimized: z.ZodBoolean;
        tray: z.ZodBoolean;
        windowBarStyle: z.ZodNativeEnum<typeof Platform>;
    }, "strip", z.ZodTypeAny, {
        disableAutoUpdate: boolean;
        exitToTray: boolean;
        minimizeToTray: boolean;
        preventSleepOnPlayback: boolean;
        releaseChannel: "beta" | "latest" | "alpha";
        startMinimized: boolean;
        tray: boolean;
        windowBarStyle: Platform;
    }, {
        disableAutoUpdate: boolean;
        exitToTray: boolean;
        minimizeToTray: boolean;
        preventSleepOnPlayback: boolean;
        releaseChannel: "beta" | "latest" | "alpha";
        startMinimized: boolean;
        tray: boolean;
        windowBarStyle: Platform;
    }>;
}, "strip", z.ZodTypeAny, {
    general: {
        theme: AppTheme;
        collections: {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
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
        homeFeatureStyle: HomeFeatureStyle;
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
        playButtonBehavior: Play;
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
        themeDark: AppTheme;
        themeLight: AppTheme;
        useThemeAccentColor: boolean;
        useThemePrimaryShade: boolean;
        volumeWheelStep: number;
        volumeWidth: number;
        zoomFactor: number;
        passwordStore?: string | undefined;
    };
    discord: {
        enabled: boolean;
        clientId: string;
        displayType: "artist" | "song" | "samo";
        linkType: "none" | "last_fm" | "musicbrainz" | "musicbrainz_last_fm";
        showAsListening: boolean;
        showPaused: boolean;
        showServerImage: boolean;
        showStateIcon: boolean;
    };
    visualizer: {
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
    lyrics: {
        fetch: boolean;
        alignment: "center" | "left" | "right";
        delayMs: number;
        enableAutoTranslation: boolean;
        follow: boolean;
        preferLocalLyrics: boolean;
        showMatch: boolean;
        showProvider: boolean;
        sources: LyricSource[];
        translationApiKey: string;
        translationApiProvider: string | null;
        translationTargetLanguage: string | null;
    };
    hotkeys: {
        bindings: Required<Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>>;
        globalMediaHotkeys: boolean;
    };
    playback: {
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
        type: PlayerType;
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
    window: {
        disableAutoUpdate: boolean;
        exitToTray: boolean;
        minimizeToTray: boolean;
        preventSleepOnPlayback: boolean;
        releaseChannel: "beta" | "latest" | "alpha";
        startMinimized: boolean;
        tray: boolean;
        windowBarStyle: Platform;
    };
    remote: {
        password: string;
        username: string;
        enabled: boolean;
        port: number;
    };
    font: {
        custom: string | null;
        type: FontType;
        builtIn: string;
        system: string | null;
    };
    autoDJ: {
        timing: number;
        enabled: boolean;
        itemCount: number;
    };
    css: {
        content: string;
        enabled: boolean;
    };
    lists: Partial<Record<ItemListKey, {
        table: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        pagination: ListPaginationType;
        grid: {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        };
        display: ListDisplayType;
        itemsPerPage: number;
        detail?: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
    }>>;
    lyricsDisplay: Record<string, {
        gap: number;
        fontSize: number;
        fontSizeUnsync: number;
        gapUnsync: number;
        opacityNonActive: number;
        scaleNonActive: number;
    }>;
    queryBuilder: {
        tag: {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }[];
    };
    tab: string;
}, {
    general: {
        theme: AppTheme;
        collections: {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
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
        homeFeatureStyle: HomeFeatureStyle;
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
        playButtonBehavior: Play;
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
        themeDark: AppTheme;
        themeLight: AppTheme;
        useThemeAccentColor: boolean;
        useThemePrimaryShade: boolean;
        volumeWheelStep: number;
        volumeWidth: number;
        zoomFactor: number;
        passwordStore?: string | undefined;
    };
    discord: {
        enabled: boolean;
        clientId: string;
        displayType: "artist" | "song" | "samo";
        linkType: "none" | "last_fm" | "musicbrainz" | "musicbrainz_last_fm";
        showAsListening: boolean;
        showPaused: boolean;
        showServerImage: boolean;
        showStateIcon: boolean;
    };
    visualizer: {
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
    lyrics: {
        fetch: boolean;
        alignment: "center" | "left" | "right";
        delayMs: number;
        enableAutoTranslation: boolean;
        follow: boolean;
        preferLocalLyrics: boolean;
        showMatch: boolean;
        showProvider: boolean;
        sources: LyricSource[];
        translationApiKey: string;
        translationApiProvider: string | null;
        translationTargetLanguage: string | null;
    };
    hotkeys: {
        bindings: Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>;
        globalMediaHotkeys: boolean;
    };
    playback: {
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
        type: PlayerType;
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
    window: {
        disableAutoUpdate: boolean;
        exitToTray: boolean;
        minimizeToTray: boolean;
        preventSleepOnPlayback: boolean;
        releaseChannel: "beta" | "latest" | "alpha";
        startMinimized: boolean;
        tray: boolean;
        windowBarStyle: Platform;
    };
    remote: {
        password: string;
        username: string;
        enabled: boolean;
        port: number;
    };
    font: {
        custom: string | null;
        type: FontType;
        builtIn: string;
        system: string | null;
    };
    autoDJ: {
        timing: number;
        enabled: boolean;
        itemCount: number;
    };
    css: {
        content: string;
        enabled: boolean;
    };
    lists: Partial<Record<ItemListKey, {
        table: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        pagination: ListPaginationType;
        grid: {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        };
        display: ListDisplayType;
        itemsPerPage: number;
        detail?: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
    }>>;
    lyricsDisplay: Record<string, {
        gap: number;
        fontSize: number;
        fontSizeUnsync: number;
        gapUnsync: number;
        opacityNonActive: number;
        scaleNonActive: number;
    }>;
    queryBuilder: {
        tag: {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }[];
    };
    tab: string;
}>;
/**
 * This schema is merged below to create the full SettingsSchema but not used during import validation
 */
export declare const NonValidatedSettingsStateSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const SettingsStateSchema: z.ZodObject<{
    autoDJ: z.ZodObject<{
        enabled: z.ZodBoolean;
        itemCount: z.ZodNumber;
        timing: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timing: number;
        enabled: boolean;
        itemCount: number;
    }, {
        timing: number;
        enabled: boolean;
        itemCount: number;
    }>;
    css: z.ZodObject<{
        content: z.ZodEffects<z.ZodString, string, string>;
        enabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        content: string;
        enabled: boolean;
    }, {
        content: string;
        enabled: boolean;
    }>;
    discord: z.ZodObject<{
        clientId: z.ZodString;
        displayType: z.ZodEnum<["artist", "samo", "song"]>;
        enabled: z.ZodBoolean;
        linkType: z.ZodEnum<["last_fm", "musicbrainz", "musicbrainz_last_fm", "none"]>;
        showAsListening: z.ZodBoolean;
        showPaused: z.ZodBoolean;
        showServerImage: z.ZodBoolean;
        showStateIcon: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        clientId: string;
        displayType: "artist" | "song" | "samo";
        linkType: "none" | "last_fm" | "musicbrainz" | "musicbrainz_last_fm";
        showAsListening: boolean;
        showPaused: boolean;
        showServerImage: boolean;
        showStateIcon: boolean;
    }, {
        enabled: boolean;
        clientId: string;
        displayType: "artist" | "song" | "samo";
        linkType: "none" | "last_fm" | "musicbrainz" | "musicbrainz_last_fm";
        showAsListening: boolean;
        showPaused: boolean;
        showServerImage: boolean;
        showStateIcon: boolean;
    }>;
    font: z.ZodObject<{
        builtIn: z.ZodEnum<[string, ...string[]]>;
        custom: z.ZodNullable<z.ZodString>;
        system: z.ZodNullable<z.ZodString>;
        type: z.ZodNativeEnum<typeof FontType>;
    }, "strip", z.ZodTypeAny, {
        custom: string | null;
        type: FontType;
        builtIn: string;
        system: string | null;
    }, {
        custom: string | null;
        type: FontType;
        builtIn: string;
        system: string | null;
    }>;
    general: z.ZodObject<{
        accent: z.ZodEffects<z.ZodString, string, string>;
        albumBackground: z.ZodBoolean;
        albumBackgroundBlur: z.ZodNumber;
        artistBackground: z.ZodBoolean;
        artistBackgroundBlur: z.ZodNumber;
        artistItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodEnum<["biography", "compilations", "favoriteSongs", "recentAlbums", "similarArtists", "topSongs"]>;
        }, "strip", z.ZodTypeAny, {
            id: "biography" | "similarArtists" | "compilations" | "favoriteSongs" | "recentAlbums" | "topSongs";
            disabled: boolean;
        }, {
            id: "biography" | "similarArtists" | "compilations" | "favoriteSongs" | "recentAlbums" | "topSongs";
            disabled: boolean;
        }>, "many">;
        artistRadioCount: z.ZodNumber;
        artistReleaseTypeItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodEnum<["releaseTypeAlbum", "releaseTypeEp", "releaseTypeSingle", "releaseTypeBroadcast", "releaseTypeOther", "releaseTypeCompilation", "appearsOn", "releaseTypeAudioDrama", "releaseTypeAudiobook", "releaseTypeDemo", "releaseTypeDjMix", "releaseTypeFieldRecording", "releaseTypeInterview", "releaseTypeLive", "releaseTypeMixtapeStreet", "releaseTypeRemix", "releaseTypeSoundtrack", "releaseTypeSpokenWord"]>;
        }, "strip", z.ZodTypeAny, {
            id: "releaseTypeAlbum" | "releaseTypeEp" | "releaseTypeSingle" | "releaseTypeBroadcast" | "releaseTypeOther" | "releaseTypeCompilation" | "appearsOn" | "releaseTypeAudioDrama" | "releaseTypeAudiobook" | "releaseTypeDemo" | "releaseTypeDjMix" | "releaseTypeFieldRecording" | "releaseTypeInterview" | "releaseTypeLive" | "releaseTypeMixtapeStreet" | "releaseTypeRemix" | "releaseTypeSoundtrack" | "releaseTypeSpokenWord";
            disabled: boolean;
        }, {
            id: "releaseTypeAlbum" | "releaseTypeEp" | "releaseTypeSingle" | "releaseTypeBroadcast" | "releaseTypeOther" | "releaseTypeCompilation" | "appearsOn" | "releaseTypeAudioDrama" | "releaseTypeAudiobook" | "releaseTypeDemo" | "releaseTypeDjMix" | "releaseTypeFieldRecording" | "releaseTypeInterview" | "releaseTypeLive" | "releaseTypeMixtapeStreet" | "releaseTypeRemix" | "releaseTypeSoundtrack" | "releaseTypeSpokenWord";
            disabled: boolean;
        }>, "many">;
        autoSave: z.ZodObject<{
            count: z.ZodNumber;
            enabled: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            count: number;
            enabled: boolean;
        }, {
            count: number;
            enabled: boolean;
        }>;
        blurExplicitImages: z.ZodBoolean;
        buttonSize: z.ZodNumber;
        collections: z.ZodArray<z.ZodObject<{
            filterQueryString: z.ZodString;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodEnum<[LibraryItem.ALBUM, LibraryItem.SONG]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
            filterQueryString: string;
        }, {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
            filterQueryString: string;
        }>, "many">;
        combinedLyricsAndVisualizer: z.ZodBoolean;
        disabledContextMenu: z.ZodRecord<z.ZodString, z.ZodBoolean>;
        enableGridMultiSelect: z.ZodBoolean;
        externalLinks: z.ZodBoolean;
        followCurrentSong: z.ZodBoolean;
        followSystemTheme: z.ZodBoolean;
        genreTarget: z.ZodEnum<["album", "track"]>;
        homeFeature: z.ZodBoolean;
        homeFeatureStyle: z.ZodNativeEnum<typeof HomeFeatureStyle>;
        homeItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodEnum<["genres", "mostPlayed", "random", "recentlyAdded", "recentlyPlayed", "recentlyReleased"]>;
        }, "strip", z.ZodTypeAny, {
            id: "random" | "genres" | "recentlyAdded" | "recentlyPlayed" | "mostPlayed" | "recentlyReleased";
            disabled: boolean;
        }, {
            id: "random" | "genres" | "recentlyAdded" | "recentlyPlayed" | "mostPlayed" | "recentlyReleased";
            disabled: boolean;
        }>, "many">;
        imageRes: z.ZodObject<{
            fullScreenPlayer: z.ZodNumber;
            header: z.ZodNumber;
            itemCard: z.ZodNumber;
            sidebar: z.ZodNumber;
            table: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            sidebar: number;
            table: number;
            header: number;
            fullScreenPlayer: number;
            itemCard: number;
        }, {
            sidebar: number;
            table: number;
            header: number;
            fullScreenPlayer: number;
            itemCard: number;
        }>;
        language: z.ZodString;
        lastFM: z.ZodBoolean;
        lastfmApiKey: z.ZodString;
        listenBrainz: z.ZodBoolean;
        musicBrainz: z.ZodBoolean;
        nativeAspectRatio: z.ZodBoolean;
        nativeSpotify: z.ZodBoolean;
        offlineMode: z.ZodBoolean;
        passwordStore: z.ZodOptional<z.ZodString>;
        pathReplace: z.ZodString;
        pathReplaceWith: z.ZodString;
        playButtonBehavior: z.ZodNativeEnum<typeof Play>;
        playerbarOpenDrawer: z.ZodBoolean;
        playerbarSlider: z.ZodObject<{
            barAlign: z.ZodEnum<["top", "bottom", "center"]>;
            barGap: z.ZodNumber;
            barRadius: z.ZodNumber;
            barWidth: z.ZodNumber;
            loadingDelay: z.ZodNumber;
            type: z.ZodEnum<["slider", "waveform"]>;
        }, "strip", z.ZodTypeAny, {
            type: "slider" | "waveform";
            barAlign: "center" | "top" | "bottom";
            barGap: number;
            barRadius: number;
            barWidth: number;
            loadingDelay: number;
        }, {
            type: "slider" | "waveform";
            barAlign: "center" | "top" | "bottom";
            barGap: number;
            barRadius: number;
            barWidth: number;
            loadingDelay: number;
        }>;
        playerItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodEnum<["bit_depth", "bit_rate", "bpm", "disc_number", "sample_rate", "track_number", "codec", "release_year", "release_type", "release_date", "genres"]>;
        }, "strip", z.ZodTypeAny, {
            id: "bpm" | "codec" | "genres" | "bit_depth" | "bit_rate" | "disc_number" | "sample_rate" | "track_number" | "release_year" | "release_type" | "release_date";
            disabled: boolean;
        }, {
            id: "bpm" | "codec" | "genres" | "bit_depth" | "bit_rate" | "disc_number" | "sample_rate" | "track_number" | "release_year" | "release_type" | "release_date";
            disabled: boolean;
        }>, "many">;
        playlistTarget: z.ZodEnum<["album", "track"]>;
        primaryShade: z.ZodNumber;
        qobuz: z.ZodBoolean;
        resume: z.ZodBoolean;
        showLyricsInSidebar: z.ZodBoolean;
        showRatings: z.ZodBoolean;
        showVisualizerInSidebar: z.ZodBoolean;
        sidebarCollapsedNavigation: z.ZodBoolean;
        sidebarCollapseShared: z.ZodBoolean;
        sidebarItems: z.ZodArray<z.ZodObject<{
            disabled: z.ZodBoolean;
            id: z.ZodString;
            label: z.ZodString;
            route: z.ZodUnion<[z.ZodNativeEnum<typeof AppRoute>, z.ZodString]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
            disabled: boolean;
            route: string;
        }, {
            id: string;
            label: string;
            disabled: boolean;
            route: string;
        }>, "many">;
        sidebarPanelOrder: z.ZodArray<z.ZodEnum<["queue", "lyrics", "visualizer"]>, "many">;
        sidebarPlaylistList: z.ZodBoolean;
        sidebarPlaylistListFilterRegex: z.ZodString;
        sidebarPlaylistSorting: z.ZodBoolean;
        sideQueueLayout: z.ZodEnum<["horizontal", "vertical"]>;
        sideQueueType: z.ZodEnum<["sideDrawerQueue", "sideQueue"]>;
        skipButtons: z.ZodObject<{
            enabled: z.ZodBoolean;
            skipBackwardSeconds: z.ZodNumber;
            skipForwardSeconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            skipBackwardSeconds: number;
            skipForwardSeconds: number;
        }, {
            enabled: boolean;
            skipBackwardSeconds: number;
            skipForwardSeconds: number;
        }>;
        spotify: z.ZodBoolean;
        theme: z.ZodNativeEnum<typeof AppTheme>;
        themeDark: z.ZodNativeEnum<typeof AppTheme>;
        themeLight: z.ZodNativeEnum<typeof AppTheme>;
        useThemeAccentColor: z.ZodBoolean;
        useThemePrimaryShade: z.ZodBoolean;
        volumeWheelStep: z.ZodNumber;
        volumeWidth: z.ZodNumber;
        zoomFactor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        theme: AppTheme;
        collections: {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
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
        homeFeatureStyle: HomeFeatureStyle;
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
        playButtonBehavior: Play;
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
        themeDark: AppTheme;
        themeLight: AppTheme;
        useThemeAccentColor: boolean;
        useThemePrimaryShade: boolean;
        volumeWheelStep: number;
        volumeWidth: number;
        zoomFactor: number;
        passwordStore?: string | undefined;
    }, {
        theme: AppTheme;
        collections: {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
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
        homeFeatureStyle: HomeFeatureStyle;
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
        playButtonBehavior: Play;
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
        themeDark: AppTheme;
        themeLight: AppTheme;
        useThemeAccentColor: boolean;
        useThemePrimaryShade: boolean;
        volumeWheelStep: number;
        volumeWidth: number;
        zoomFactor: number;
        passwordStore?: string | undefined;
    }>;
    hotkeys: z.ZodObject<{
        bindings: z.ZodEffects<z.ZodRecord<z.ZodEnum<["browserBack", "browserForward", "favoriteCurrentAdd", "favoriteCurrentRemove", "favoriteCurrentToggle", "favoritePreviousAdd", "favoritePreviousRemove", "favoritePreviousToggle", "globalSearch", "localSearch", "volumeMute", "navigateHome", "next", "pause", "play", "playPause", "previous", "rate0", "rate1", "rate2", "rate3", "rate4", "rate5", "toggleShuffle", "skipBackward", "skipForward", "stop", "toggleFullscreenPlayer", "toggleQueue", "toggleRepeat", "volumeDown", "volumeUp", "zoomIn", "zoomOut", "listPlayDefault", "listPlayNow", "listPlayNext", "listPlayLast", "listNavigateToPage"]>, z.ZodObject<{
            allowGlobal: z.ZodBoolean;
            hotkey: z.ZodString;
            isGlobal: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }, {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>, Required<Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>>, Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>>;
        globalMediaHotkeys: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        bindings: Required<Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>>;
        globalMediaHotkeys: boolean;
    }, {
        bindings: Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>;
        globalMediaHotkeys: boolean;
    }>;
    lists: z.ZodRecord<z.ZodNativeEnum<typeof ItemListKey>, z.ZodObject<{
        detail: z.ZodOptional<z.ZodObject<{
            columns: z.ZodArray<z.ZodObject<{
                align: z.ZodEnum<["center", "end", "start"]>;
                autoSize: z.ZodOptional<z.ZodBoolean>;
                id: z.ZodNativeEnum<typeof TableColumn>;
                isEnabled: z.ZodBoolean;
                pinned: z.ZodUnion<[z.ZodLiteral<"left">, z.ZodLiteral<"right">, z.ZodLiteral<null>]>;
                width: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: TableColumn;
                width: number;
                align: "center" | "start" | "end";
                isEnabled: boolean;
                pinned: "left" | "right" | null;
                autoSize?: boolean | undefined;
            }, {
                id: TableColumn;
                width: number;
                align: "center" | "start" | "end";
                isEnabled: boolean;
                pinned: "left" | "right" | null;
                autoSize?: boolean | undefined;
            }>, "many">;
            enableAlternateRowColors: z.ZodBoolean;
            enableHeader: z.ZodBoolean;
            enableHorizontalBorders: z.ZodBoolean;
            enableRowHoverHighlight: z.ZodBoolean;
            enableVerticalBorders: z.ZodBoolean;
            size: z.ZodEnum<["compact", "default", "large"]>;
        }, "strip", z.ZodTypeAny, {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        }, {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        }>>;
        display: z.ZodNativeEnum<typeof ListDisplayType>;
        grid: z.ZodObject<{
            itemGap: z.ZodEnum<["lg", "md", "sm", "xl", "xs"]>;
            itemsPerRow: z.ZodNumber;
            itemsPerRowEnabled: z.ZodBoolean;
            rows: z.ZodArray<z.ZodObject<{
                align: z.ZodEnum<["center", "end", "start"]>;
                id: z.ZodNativeEnum<typeof TableColumn>;
                isEnabled: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }, {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }>, "many">;
            size: z.ZodEnum<["compact", "default", "large"]>;
        }, "strip", z.ZodTypeAny, {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        }, {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        }>;
        itemsPerPage: z.ZodNumber;
        pagination: z.ZodNativeEnum<typeof ListPaginationType>;
        table: z.ZodObject<{
            autoFitColumns: z.ZodBoolean;
            columns: z.ZodArray<z.ZodObject<{
                align: z.ZodEnum<["center", "end", "start"]>;
                autoSize: z.ZodOptional<z.ZodBoolean>;
                id: z.ZodNativeEnum<typeof TableColumn>;
                isEnabled: z.ZodBoolean;
                pinned: z.ZodUnion<[z.ZodLiteral<"left">, z.ZodLiteral<"right">, z.ZodLiteral<null>]>;
                width: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: TableColumn;
                width: number;
                align: "center" | "start" | "end";
                isEnabled: boolean;
                pinned: "left" | "right" | null;
                autoSize?: boolean | undefined;
            }, {
                id: TableColumn;
                width: number;
                align: "center" | "start" | "end";
                isEnabled: boolean;
                pinned: "left" | "right" | null;
                autoSize?: boolean | undefined;
            }>, "many">;
            enableAlternateRowColors: z.ZodBoolean;
            enableHeader: z.ZodBoolean;
            enableHorizontalBorders: z.ZodBoolean;
            enableRowHoverHighlight: z.ZodBoolean;
            enableVerticalBorders: z.ZodBoolean;
            size: z.ZodEnum<["compact", "default", "large"]>;
        }, "strip", z.ZodTypeAny, {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        }, {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        }>;
    }, "strip", z.ZodTypeAny, {
        table: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        pagination: ListPaginationType;
        grid: {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        };
        display: ListDisplayType;
        itemsPerPage: number;
        detail?: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
    }, {
        table: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        pagination: ListPaginationType;
        grid: {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        };
        display: ListDisplayType;
        itemsPerPage: number;
        detail?: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
    }>>;
    lyrics: z.ZodObject<{
        alignment: z.ZodEnum<["center", "left", "right"]>;
        delayMs: z.ZodNumber;
        enableAutoTranslation: z.ZodBoolean;
        fetch: z.ZodBoolean;
        follow: z.ZodBoolean;
        preferLocalLyrics: z.ZodBoolean;
        showMatch: z.ZodBoolean;
        showProvider: z.ZodBoolean;
        sources: z.ZodArray<z.ZodNativeEnum<typeof LyricSource>, "many">;
        translationApiKey: z.ZodString;
        translationApiProvider: z.ZodNullable<z.ZodString>;
        translationTargetLanguage: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        fetch: boolean;
        alignment: "center" | "left" | "right";
        delayMs: number;
        enableAutoTranslation: boolean;
        follow: boolean;
        preferLocalLyrics: boolean;
        showMatch: boolean;
        showProvider: boolean;
        sources: LyricSource[];
        translationApiKey: string;
        translationApiProvider: string | null;
        translationTargetLanguage: string | null;
    }, {
        fetch: boolean;
        alignment: "center" | "left" | "right";
        delayMs: number;
        enableAutoTranslation: boolean;
        follow: boolean;
        preferLocalLyrics: boolean;
        showMatch: boolean;
        showProvider: boolean;
        sources: LyricSource[];
        translationApiKey: string;
        translationApiProvider: string | null;
        translationTargetLanguage: string | null;
    }>;
    lyricsDisplay: z.ZodRecord<z.ZodString, z.ZodObject<{
        fontSize: z.ZodNumber;
        fontSizeUnsync: z.ZodNumber;
        gap: z.ZodNumber;
        gapUnsync: z.ZodNumber;
        opacityNonActive: z.ZodNumber;
        scaleNonActive: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        gap: number;
        fontSize: number;
        fontSizeUnsync: number;
        gapUnsync: number;
        opacityNonActive: number;
        scaleNonActive: number;
    }, {
        gap: number;
        fontSize: number;
        fontSizeUnsync: number;
        gapUnsync: number;
        opacityNonActive: number;
        scaleNonActive: number;
    }>>;
    playback: z.ZodObject<{
        audioDeviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        audioFadeOnStatusChange: z.ZodBoolean;
        filters: z.ZodArray<z.ZodObject<{
            field: z.ZodEnum<["name", "albumArtist", "artist", "duration", "genre", "year", "note", "path", "playCount", "favorite", "rating"]>;
            id: z.ZodString;
            isEnabled: z.ZodOptional<z.ZodBoolean>;
            operator: z.ZodEnum<["is", "isNot", "contains", "notContains", "startsWith", "endsWith", "regex", "gt", "lt", "inTheRange", "before", "after", "beforeDate", "afterDate", "inTheRangeDate", "inTheLast", "notInTheLast"]>;
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            value: string | number | boolean | (string | number)[];
            field: "duration" | "favorite" | "name" | "note" | "path" | "rating" | "year" | "artist" | "genre" | "albumArtist" | "playCount";
            operator: "contains" | "is" | "regex" | "startsWith" | "endsWith" | "isNot" | "before" | "after" | "inTheLast" | "notInTheLast" | "inTheRange" | "beforeDate" | "afterDate" | "inTheRangeDate" | "notContains" | "gt" | "lt";
            isEnabled?: boolean | undefined;
        }, {
            id: string;
            value: string | number | boolean | (string | number)[];
            field: "duration" | "favorite" | "name" | "note" | "path" | "rating" | "year" | "artist" | "genre" | "albumArtist" | "playCount";
            operator: "contains" | "is" | "regex" | "startsWith" | "endsWith" | "isNot" | "before" | "after" | "inTheLast" | "notInTheLast" | "inTheRange" | "beforeDate" | "afterDate" | "inTheRangeDate" | "notContains" | "gt" | "lt";
            isEnabled?: boolean | undefined;
        }>, "many">;
        mediaSession: z.ZodBoolean;
        mpvAudioDeviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        mpvExtraParameters: z.ZodArray<z.ZodString, "many">;
        mpvProperties: z.ZodObject<{
            audioExclusiveMode: z.ZodEnum<["no", "yes"]>;
            audioFormat: z.ZodOptional<z.ZodEnum<["float", "s16", "s32"]>>;
            audioSampleRateHz: z.ZodOptional<z.ZodNumber>;
            gaplessAudio: z.ZodEnum<["no", "weak", "yes"]>;
            replayGainClip: z.ZodBoolean;
            replayGainFallbackDB: z.ZodOptional<z.ZodNumber>;
            replayGainMode: z.ZodEnum<["album", "no", "track"]>;
            replayGainPreampDB: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            audioExclusiveMode: "no" | "yes";
            gaplessAudio: "no" | "yes" | "weak";
            replayGainClip: boolean;
            replayGainMode: "no" | "album" | "track";
            audioFormat?: "float" | "s16" | "s32" | undefined;
            audioSampleRateHz?: number | undefined;
            replayGainFallbackDB?: number | undefined;
            replayGainPreampDB?: number | undefined;
        }, {
            audioExclusiveMode: "no" | "yes";
            gaplessAudio: "no" | "yes" | "weak";
            replayGainClip: boolean;
            replayGainMode: "no" | "album" | "track";
            audioFormat?: "float" | "s16" | "s32" | undefined;
            audioSampleRateHz?: number | undefined;
            replayGainFallbackDB?: number | undefined;
            replayGainPreampDB?: number | undefined;
        }>;
        preservePitch: z.ZodBoolean;
        scrobble: z.ZodObject<{
            enabled: z.ZodBoolean;
            notify: z.ZodBoolean;
            scrobbleAtDuration: z.ZodNumber;
            scrobbleAtPercentage: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            notify: boolean;
            scrobbleAtDuration: number;
            scrobbleAtPercentage: number;
        }, {
            enabled: boolean;
            notify: boolean;
            scrobbleAtDuration: number;
            scrobbleAtPercentage: number;
        }>;
        transcode: z.ZodObject<{
            bitrate: z.ZodOptional<z.ZodNumber>;
            enabled: z.ZodBoolean;
            format: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            bitrate?: number | undefined;
            format?: string | undefined;
        }, {
            enabled: boolean;
            bitrate?: number | undefined;
            format?: string | undefined;
        }>;
        type: z.ZodNativeEnum<typeof PlayerType>;
        webAudio: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
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
        type: PlayerType;
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
    }, {
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
        type: PlayerType;
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
    }>;
    queryBuilder: z.ZodObject<{
        tag: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            type: z.ZodEnum<["boolean", "date", "dateRange", "number", "playlist", "string"]>;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }, {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        tag: {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }[];
    }, {
        tag: {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }[];
    }>;
    remote: z.ZodObject<{
        enabled: z.ZodBoolean;
        password: z.ZodString;
        port: z.ZodNumber;
        username: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
        username: string;
        enabled: boolean;
        port: number;
    }, {
        password: string;
        username: string;
        enabled: boolean;
        port: number;
    }>;
    tab: z.ZodUnion<[z.ZodLiteral<"general">, z.ZodLiteral<"hotkeys">, z.ZodLiteral<"playback">, z.ZodLiteral<"window">, z.ZodString]>;
    visualizer: z.ZodObject<{
        audiomotionanalyzer: z.ZodObject<{
            alphaBars: z.ZodBoolean;
            ansiBands: z.ZodBoolean;
            barSpace: z.ZodNumber;
            channelLayout: z.ZodEnum<["single", "dual-combined", "dual-horizontal", "dual-vertical"]>;
            colorMode: z.ZodEnum<["gradient", "bar-index", "bar-level"]>;
            customGradients: z.ZodArray<z.ZodObject<{
                colorStops: z.ZodArray<z.ZodObject<{
                    color: z.ZodString;
                    level: z.ZodOptional<z.ZodNumber>;
                    levelEnabled: z.ZodOptional<z.ZodBoolean>;
                    pos: z.ZodOptional<z.ZodNumber>;
                    positionEnabled: z.ZodOptional<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    color: string;
                    level?: number | undefined;
                    levelEnabled?: boolean | undefined;
                    pos?: number | undefined;
                    positionEnabled?: boolean | undefined;
                }, {
                    color: string;
                    level?: number | undefined;
                    levelEnabled?: boolean | undefined;
                    pos?: number | undefined;
                    positionEnabled?: boolean | undefined;
                }>, "many">;
                dir: z.ZodOptional<z.ZodString>;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                colorStops: {
                    color: string;
                    level?: number | undefined;
                    levelEnabled?: boolean | undefined;
                    pos?: number | undefined;
                    positionEnabled?: boolean | undefined;
                }[];
                dir?: string | undefined;
            }, {
                name: string;
                colorStops: {
                    color: string;
                    level?: number | undefined;
                    levelEnabled?: boolean | undefined;
                    pos?: number | undefined;
                    positionEnabled?: boolean | undefined;
                }[];
                dir?: string | undefined;
            }>, "many">;
            fadePeaks: z.ZodBoolean;
            fftSize: z.ZodNumber;
            fillAlpha: z.ZodNumber;
            frequencyScale: z.ZodEnum<["bark", "linear", "log", "mel"]>;
            gradient: z.ZodString;
            gradientLeft: z.ZodOptional<z.ZodString>;
            gradientRight: z.ZodOptional<z.ZodString>;
            gravity: z.ZodNumber;
            ledBars: z.ZodBoolean;
            linearAmplitude: z.ZodBoolean;
            linearBoost: z.ZodNumber;
            lineWidth: z.ZodNumber;
            loRes: z.ZodBoolean;
            lumiBars: z.ZodBoolean;
            maxDecibels: z.ZodNumber;
            maxFPS: z.ZodNumber;
            maxFreq: z.ZodNumber;
            minDecibels: z.ZodNumber;
            minFreq: z.ZodNumber;
            mirror: z.ZodNumber;
            mode: z.ZodNumber;
            noteLabels: z.ZodBoolean;
            opacity: z.ZodNumber;
            outlineBars: z.ZodBoolean;
            peakFadeTime: z.ZodNumber;
            peakHoldTime: z.ZodNumber;
            peakLine: z.ZodBoolean;
            presets: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                value: z.ZodAny;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                value?: any;
            }, {
                id: string;
                name: string;
                value?: any;
            }>, "many">;
            radial: z.ZodBoolean;
            radialInvert: z.ZodBoolean;
            radius: z.ZodNumber;
            reflexAlpha: z.ZodNumber;
            reflexBright: z.ZodNumber;
            reflexFit: z.ZodBoolean;
            reflexRatio: z.ZodNumber;
            roundBars: z.ZodBoolean;
            showFPS: z.ZodBoolean;
            showPeaks: z.ZodBoolean;
            showScaleX: z.ZodBoolean;
            showScaleY: z.ZodBoolean;
            smoothing: z.ZodNumber;
            spinSpeed: z.ZodNumber;
            splitGradient: z.ZodBoolean;
            trueLeds: z.ZodBoolean;
            volume: z.ZodNumber;
            weightingFilter: z.ZodEnum<["", "A", "B", "C", "D", "Z"]>;
        }, "strip", z.ZodTypeAny, {
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
        }, {
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
        }>;
        butterchurn: z.ZodObject<{
            blendTime: z.ZodNumber;
            currentPreset: z.ZodOptional<z.ZodString>;
            cyclePresets: z.ZodBoolean;
            cycleTime: z.ZodNumber;
            ignoredPresets: z.ZodArray<z.ZodString, "many">;
            includeAllPresets: z.ZodBoolean;
            maxFPS: z.ZodNumber;
            opacity: z.ZodNumber;
            randomizeNextPreset: z.ZodBoolean;
            selectedPresets: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
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
        }, {
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
        }>;
        type: z.ZodEnum<["audiomotionanalyzer", "butterchurn"]>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>;
    window: z.ZodObject<{
        disableAutoUpdate: z.ZodBoolean;
        exitToTray: z.ZodBoolean;
        minimizeToTray: z.ZodBoolean;
        preventSleepOnPlayback: z.ZodBoolean;
        releaseChannel: z.ZodEnum<["alpha", "beta", "latest"]>;
        startMinimized: z.ZodBoolean;
        tray: z.ZodBoolean;
        windowBarStyle: z.ZodNativeEnum<typeof Platform>;
    }, "strip", z.ZodTypeAny, {
        disableAutoUpdate: boolean;
        exitToTray: boolean;
        minimizeToTray: boolean;
        preventSleepOnPlayback: boolean;
        releaseChannel: "beta" | "latest" | "alpha";
        startMinimized: boolean;
        tray: boolean;
        windowBarStyle: Platform;
    }, {
        disableAutoUpdate: boolean;
        exitToTray: boolean;
        minimizeToTray: boolean;
        preventSleepOnPlayback: boolean;
        releaseChannel: "beta" | "latest" | "alpha";
        startMinimized: boolean;
        tray: boolean;
        windowBarStyle: Platform;
    }>;
}, "strip", z.ZodTypeAny, {
    general: {
        theme: AppTheme;
        collections: {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
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
        homeFeatureStyle: HomeFeatureStyle;
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
        playButtonBehavior: Play;
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
        themeDark: AppTheme;
        themeLight: AppTheme;
        useThemeAccentColor: boolean;
        useThemePrimaryShade: boolean;
        volumeWheelStep: number;
        volumeWidth: number;
        zoomFactor: number;
        passwordStore?: string | undefined;
    };
    discord: {
        enabled: boolean;
        clientId: string;
        displayType: "artist" | "song" | "samo";
        linkType: "none" | "last_fm" | "musicbrainz" | "musicbrainz_last_fm";
        showAsListening: boolean;
        showPaused: boolean;
        showServerImage: boolean;
        showStateIcon: boolean;
    };
    visualizer: {
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
    lyrics: {
        fetch: boolean;
        alignment: "center" | "left" | "right";
        delayMs: number;
        enableAutoTranslation: boolean;
        follow: boolean;
        preferLocalLyrics: boolean;
        showMatch: boolean;
        showProvider: boolean;
        sources: LyricSource[];
        translationApiKey: string;
        translationApiProvider: string | null;
        translationTargetLanguage: string | null;
    };
    hotkeys: {
        bindings: Required<Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>>;
        globalMediaHotkeys: boolean;
    };
    playback: {
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
        type: PlayerType;
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
    window: {
        disableAutoUpdate: boolean;
        exitToTray: boolean;
        minimizeToTray: boolean;
        preventSleepOnPlayback: boolean;
        releaseChannel: "beta" | "latest" | "alpha";
        startMinimized: boolean;
        tray: boolean;
        windowBarStyle: Platform;
    };
    remote: {
        password: string;
        username: string;
        enabled: boolean;
        port: number;
    };
    font: {
        custom: string | null;
        type: FontType;
        builtIn: string;
        system: string | null;
    };
    autoDJ: {
        timing: number;
        enabled: boolean;
        itemCount: number;
    };
    css: {
        content: string;
        enabled: boolean;
    };
    lists: Partial<Record<ItemListKey, {
        table: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        pagination: ListPaginationType;
        grid: {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        };
        display: ListDisplayType;
        itemsPerPage: number;
        detail?: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
    }>>;
    lyricsDisplay: Record<string, {
        gap: number;
        fontSize: number;
        fontSizeUnsync: number;
        gapUnsync: number;
        opacityNonActive: number;
        scaleNonActive: number;
    }>;
    queryBuilder: {
        tag: {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }[];
    };
    tab: string;
}, {
    general: {
        theme: AppTheme;
        collections: {
            id: string;
            name: string;
            type: LibraryItem.ALBUM | LibraryItem.SONG;
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
        homeFeatureStyle: HomeFeatureStyle;
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
        playButtonBehavior: Play;
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
        themeDark: AppTheme;
        themeLight: AppTheme;
        useThemeAccentColor: boolean;
        useThemePrimaryShade: boolean;
        volumeWheelStep: number;
        volumeWidth: number;
        zoomFactor: number;
        passwordStore?: string | undefined;
    };
    discord: {
        enabled: boolean;
        clientId: string;
        displayType: "artist" | "song" | "samo";
        linkType: "none" | "last_fm" | "musicbrainz" | "musicbrainz_last_fm";
        showAsListening: boolean;
        showPaused: boolean;
        showServerImage: boolean;
        showStateIcon: boolean;
    };
    visualizer: {
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
    lyrics: {
        fetch: boolean;
        alignment: "center" | "left" | "right";
        delayMs: number;
        enableAutoTranslation: boolean;
        follow: boolean;
        preferLocalLyrics: boolean;
        showMatch: boolean;
        showProvider: boolean;
        sources: LyricSource[];
        translationApiKey: string;
        translationApiProvider: string | null;
        translationTargetLanguage: string | null;
    };
    hotkeys: {
        bindings: Partial<Record<"next" | "play" | "previous" | "stop" | "pause" | "toggleRepeat" | "toggleShuffle" | "browserBack" | "browserForward" | "favoriteCurrentAdd" | "favoriteCurrentRemove" | "favoriteCurrentToggle" | "favoritePreviousAdd" | "favoritePreviousRemove" | "favoritePreviousToggle" | "globalSearch" | "localSearch" | "volumeMute" | "navigateHome" | "playPause" | "rate0" | "rate1" | "rate2" | "rate3" | "rate4" | "rate5" | "skipBackward" | "skipForward" | "toggleFullscreenPlayer" | "toggleQueue" | "volumeDown" | "volumeUp" | "zoomIn" | "zoomOut" | "listPlayDefault" | "listPlayNow" | "listPlayNext" | "listPlayLast" | "listNavigateToPage", {
            allowGlobal: boolean;
            hotkey: string;
            isGlobal: boolean;
        }>>;
        globalMediaHotkeys: boolean;
    };
    playback: {
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
        type: PlayerType;
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
    window: {
        disableAutoUpdate: boolean;
        exitToTray: boolean;
        minimizeToTray: boolean;
        preventSleepOnPlayback: boolean;
        releaseChannel: "beta" | "latest" | "alpha";
        startMinimized: boolean;
        tray: boolean;
        windowBarStyle: Platform;
    };
    remote: {
        password: string;
        username: string;
        enabled: boolean;
        port: number;
    };
    font: {
        custom: string | null;
        type: FontType;
        builtIn: string;
        system: string | null;
    };
    autoDJ: {
        timing: number;
        enabled: boolean;
        itemCount: number;
    };
    css: {
        content: string;
        enabled: boolean;
    };
    lists: Partial<Record<ItemListKey, {
        table: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
        pagination: ListPaginationType;
        grid: {
            size: "default" | "compact" | "large";
            itemGap: "lg" | "md" | "sm" | "xl" | "xs";
            itemsPerRow: number;
            itemsPerRowEnabled: boolean;
            rows: {
                id: TableColumn;
                align: "center" | "start" | "end";
                isEnabled: boolean;
            }[];
        };
        display: ListDisplayType;
        itemsPerPage: number;
        detail?: {
            size: "default" | "compact" | "large";
            columns: {
                id: TableColumn;
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
    }>>;
    lyricsDisplay: Record<string, {
        gap: number;
        fontSize: number;
        fontSizeUnsync: number;
        gapUnsync: number;
        opacityNonActive: number;
        scaleNonActive: number;
    }>;
    queryBuilder: {
        tag: {
            label: string;
            type: "string" | "number" | "boolean" | "playlist" | "date" | "dateRange";
            value: string;
        }[];
    };
    tab: string;
}>;
export declare enum ArtistItem {
    BIOGRAPHY = "biography",
    FAVORITE_SONGS = "favoriteSongs",
    RECENT_ALBUMS = "recentAlbums",
    SIMILAR_ARTISTS = "similarArtists",
    TOP_SONGS = "topSongs"
}
export declare enum ArtistReleaseTypeItem {
    APPEARS_ON = "appearsOn",
    RELEASE_TYPE_ALBUM = "releaseTypeAlbum",
    RELEASE_TYPE_AUDIO_DRAMA = "releaseTypeAudioDrama",
    RELEASE_TYPE_AUDIOBOOK = "releaseTypeAudiobook",
    RELEASE_TYPE_BROADCAST = "releaseTypeBroadcast",
    RELEASE_TYPE_COMPILATION = "releaseTypeCompilation",
    RELEASE_TYPE_DEMO = "releaseTypeDemo",
    RELEASE_TYPE_DJ_MIX = "releaseTypeDjMix",
    RELEASE_TYPE_EP = "releaseTypeEp",
    RELEASE_TYPE_FIELD_RECORDING = "releaseTypeFieldRecording",
    RELEASE_TYPE_INTERVIEW = "releaseTypeInterview",
    RELEASE_TYPE_LIVE = "releaseTypeLive",
    RELEASE_TYPE_MIXTAPE_STREET = "releaseTypeMixtapeStreet",
    RELEASE_TYPE_OTHER = "releaseTypeOther",
    RELEASE_TYPE_REMIX = "releaseTypeRemix",
    RELEASE_TYPE_SINGLE = "releaseTypeSingle",
    RELEASE_TYPE_SOUNDTRACK = "releaseTypeSoundtrack",
    RELEASE_TYPE_SPOKENWORD = "releaseTypeSpokenWord"
}
export declare enum BarAlign {
    BOTTOM = "bottom",
    CENTER = "center",
    TOP = "top"
}
export declare enum BindingActions {
    BROWSER_BACK = "browserBack",
    BROWSER_FORWARD = "browserForward",
    FAVORITE_CURRENT_ADD = "favoriteCurrentAdd",
    FAVORITE_CURRENT_REMOVE = "favoriteCurrentRemove",
    FAVORITE_CURRENT_TOGGLE = "favoriteCurrentToggle",
    FAVORITE_PREVIOUS_ADD = "favoritePreviousAdd",
    FAVORITE_PREVIOUS_REMOVE = "favoritePreviousRemove",
    FAVORITE_PREVIOUS_TOGGLE = "favoritePreviousToggle",
    GLOBAL_SEARCH = "globalSearch",
    LIST_NAVIGATE_TO_PAGE = "listNavigateToPage",
    LIST_PLAY_DEFAULT = "listPlayDefault",
    LIST_PLAY_LAST = "listPlayLast",
    LIST_PLAY_NEXT = "listPlayNext",
    LIST_PLAY_NOW = "listPlayNow",
    LOCAL_SEARCH = "localSearch",
    MUTE = "volumeMute",
    NAVIGATE_HOME = "navigateHome",
    NEXT = "next",
    PAUSE = "pause",
    PLAY = "play",
    PLAY_PAUSE = "playPause",
    PREVIOUS = "previous",
    RATE_0 = "rate0",
    RATE_1 = "rate1",
    RATE_2 = "rate2",
    RATE_3 = "rate3",
    RATE_4 = "rate4",
    RATE_5 = "rate5",
    SHUFFLE = "toggleShuffle",
    SKIP_BACKWARD = "skipBackward",
    SKIP_FORWARD = "skipForward",
    STOP = "stop",
    TOGGLE_FULLSCREEN_PLAYER = "toggleFullscreenPlayer",
    TOGGLE_QUEUE = "toggleQueue",
    TOGGLE_REPEAT = "toggleRepeat",
    VOLUME_DOWN = "volumeDown",
    VOLUME_UP = "volumeUp",
    ZOOM_IN = "zoomIn",
    ZOOM_OUT = "zoomOut"
}
export declare enum DiscordDisplayType {
    ARTIST_NAME = "artist",
    SAMO = "samo",
    SONG_NAME = "song"
}
export declare enum DiscordLinkType {
    LAST_FM = "last_fm",
    MBZ = "musicbrainz",
    MBZ_LAST_FM = "musicbrainz_last_fm",
    NONE = "none"
}
export declare enum GenreTarget {
    ALBUM = "album",
    TRACK = "track"
}
export declare enum HomeItem {
    GENRES = "genres",
    MOST_PLAYED = "mostPlayed",
    RANDOM = "random",
    RECENTLY_ADDED = "recentlyAdded",
    RECENTLY_PLAYED = "recentlyPlayed",
    RECENTLY_RELEASED = "recentlyReleased"
}
export declare enum PlayerbarSliderType {
    SLIDER = "slider",
    WAVEFORM = "waveform"
}
export declare enum PlayerItem {
    BIT_DEPTH = "bit_depth",
    BIT_RATE = "bit_rate",
    BPM = "bpm",
    CODEC = "codec",
    DISC_NUMBER = "disc_number",
    GENRES = "genres",
    RELEASE_DATE = "release_date",
    RELEASE_TYPE = "release_type",
    RELEASE_YEAR = "release_year",
    SAMPLE_RATE = "sample_rate",
    TRACK_NUMBER = "track_number"
}
export declare enum PlaylistTarget {
    ALBUM = "album",
    TRACK = "track"
}
export declare enum SidebarItem {
    ALBUMS = "Albums",
    ARTISTS = "Artists",
    ARTISTS_ALL = "Artists-all",
    COLLECTIONS = "Collections",
    FAVORITES = "Favorites",
    FOLDERS = "Folders",
    GENRES = "Genres",
    HOME = "Home",
    NOW_PLAYING = "Now Playing",
    PLAYLISTS = "Playlists",
    RADIO = "Radio",
    SEARCH = "Search",
    SETTINGS = "Settings",
    TRACKS = "Tracks"
}
export type DataGridProps = {
    itemGap: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    itemsPerRow: number;
    itemsPerRowEnabled: boolean;
    rows: ItemGridListRowConfig[];
    size: 'compact' | 'default' | 'large';
};
export type DataTableProps = z.infer<typeof ItemTableListPropsSchema>;
export type ItemDetailListProps = z.infer<typeof ItemDetailListPropsSchema>;
export type ItemListSettings = {
    detail?: ItemDetailListProps;
    display: ListDisplayType;
    grid: DataGridProps;
    itemsPerPage: number;
    pagination: ListPaginationType;
    table: DataTableProps;
};
export type PlayerFilter = z.infer<typeof PlayerFilterSchema>;
export type PlayerFilterField = z.infer<typeof PlayerFilterFieldSchema>;
export type PlayerFilterOperator = z.infer<typeof PlayerFilterOperatorSchema>;
export interface SettingsSlice extends z.infer<typeof SettingsStateSchema> {
    actions: {
        addCollection: (collection: SavedCollection) => void;
        removeCollection: (id: string) => void;
        reset: () => void;
        resetSampleRate: () => void;
        setArtistItems: (item: SortableItem<ArtistItem>[]) => void;
        setArtistReleaseTypeItems: (item: SortableItem<ArtistReleaseTypeItem>[]) => void;
        setGenreBehavior: (target: GenreTarget) => void;
        setHomeItems: (item: SortableItem<HomeItem>[]) => void;
        setList: (type: ItemListKey, data: DeepPartial<ItemListSettings>) => void;
        setPlaybackFilters: (filters: PlayerFilter[]) => void;
        setPlayerItems: (items: SortableItem<PlayerItem>[]) => void;
        setPlaylistBehavior: (target: PlaylistTarget) => void;
        setSettings: (data: DeepPartial<SettingsState>) => void;
        setSidebarItems: (items: SidebarItemType[]) => void;
        setTable: (type: ItemListKey, data: DataTableProps) => void;
        setTranscodingConfig: (config: TranscodingConfig) => void;
        toggleMediaSession: () => void;
        toggleSidebarCollapseShare: () => void;
        updateCollection: (id: string, updates: Partial<Omit<SavedCollection, 'id'>>) => void;
    };
}
export interface SettingsState extends z.infer<typeof SettingsStateSchema> {
}
export type SidebarItemType = z.infer<typeof SidebarItemTypeSchema>;
export type SideQueueLayout = z.infer<typeof SideQueueLayoutSchema>;
export type SideQueueType = z.infer<typeof SideQueueTypeSchema>;
export type SortableItem<T extends string> = {
    disabled: boolean;
    id: T;
};
export type TranscodingConfig = z.infer<typeof TranscodingConfigSchema>;
export type VersionedSettings = SettingsState & {
    version: number;
};
export {};
