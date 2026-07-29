import { z } from 'zod';

import type { DeepPartial } from './utils';

import { AppRoute } from '/@/renderer/router/routes';
import { FontValueSchema } from '/@/renderer/types/fonts';
import { sanitizeCss } from '/@/renderer/utils/sanitize';
import { AppTheme } from '/@/shared/themes/app-theme-types';
import { LibraryItem, LyricSource, SavedCollection } from '/@/shared/types/domain-types';
import { BindingActions } from '/@/shared/types/hotkeys';
import {
    FontType,
    ItemListKey,
    ListDisplayType,
    ListPaginationType,
    Platform,
    Play,
    PlayerType,
    TableColumn,
} from '/@/shared/types/types';

const HomeItemSchema = z.enum([
    'genres',
    'mostPlayed',
    'random',
    'recentlyAdded',
    'recentlyPlayed',
    'recentlyReleased',
]);

const PlayerItemSchema = z.enum([
    'bit_depth',
    'bit_rate',
    'bpm',
    'disc_number',
    'sample_rate',
    'track_number',
    'codec',
    'release_year',
    'release_type',
    'release_date',
    'genres',
]);

const ArtistItemSchema = z.enum([
    'biography',
    'compilations',
    'favoriteSongs',
    'recentAlbums',
    'similarArtists',
    'topSongs',
]);

const ArtistReleaseTypeItemSchema = z.enum([
    'releaseTypeAlbum',
    'releaseTypeEp',
    'releaseTypeSingle',
    'releaseTypeBroadcast',
    'releaseTypeOther',
    'releaseTypeCompilation',
    'appearsOn',
    'releaseTypeAudioDrama',
    'releaseTypeAudiobook',
    'releaseTypeDemo',
    'releaseTypeDjMix',
    'releaseTypeFieldRecording',
    'releaseTypeInterview',
    'releaseTypeLive',
    'releaseTypeMixtapeStreet',
    'releaseTypeRemix',
    'releaseTypeSoundtrack',
    'releaseTypeSpokenWord',
]);

const BindingActionsSchema = z.nativeEnum(BindingActions);

const GenreTargetSchema = z.enum(['album', 'track']);

const PlaylistTargetSchema = z.enum(['album', 'track']);

const SideQueueTypeSchema = z.enum(['sideDrawerQueue', 'sideQueue']);
const SideQueueLayoutSchema = z.enum(['horizontal', 'vertical']);

const SidebarPanelTypeSchema = z.enum(['queue', 'lyrics', 'visualizer']);

const CollectionSchema = z.object({
    filterQueryString: z.string(),
    id: z.string(),
    name: z.string(),
    type: z.enum([LibraryItem.ALBUM, LibraryItem.SONG]),
});

const SidebarItemTypeSchema = z.object({
    disabled: z.boolean(),
    id: z.string(),
    label: z.string(),
    route: z.union([z.nativeEnum(AppRoute), z.string()]),
});

const SortableItemSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
    z.object({
        disabled: z.boolean(),
        id: itemSchema,
    });

const ItemTableListColumnConfigSchema = z.object({
    align: z.enum(['center', 'end', 'start']),
    autoSize: z.boolean().optional(),
    id: z.nativeEnum(TableColumn),
    isEnabled: z.boolean(),
    pinned: z.union([z.literal('left'), z.literal('right'), z.literal(null)]),
    width: z.number(),
});

export type ItemTableListColumnConfig = z.infer<typeof ItemTableListColumnConfigSchema>;

const ItemGridListRowConfigSchema = z.object({
    align: z.enum(['center', 'end', 'start']),
    id: z.nativeEnum(TableColumn),
    isEnabled: z.boolean(),
});

export type ItemGridListRowConfig = z.infer<typeof ItemGridListRowConfigSchema>;

const ItemTableListPropsSchema = z.object({
    autoFitColumns: z.boolean(),
    columns: z.array(ItemTableListColumnConfigSchema),
    enableAlternateRowColors: z.boolean(),
    enableHeader: z.boolean(),
    enableHorizontalBorders: z.boolean(),
    enableRowHoverHighlight: z.boolean(),
    enableVerticalBorders: z.boolean(),
    size: z.enum(['compact', 'default', 'large']),
});

const ItemDetailListPropsSchema = z.object({
    columns: z.array(ItemTableListColumnConfigSchema),
    enableAlternateRowColors: z.boolean(),
    enableHeader: z.boolean(),
    enableHorizontalBorders: z.boolean(),
    enableRowHoverHighlight: z.boolean(),
    enableVerticalBorders: z.boolean(),
    size: z.enum(['compact', 'default', 'large']),
});

const ItemListConfigSchema = z.object({
    detail: ItemDetailListPropsSchema.optional(),
    display: z.nativeEnum(ListDisplayType),
    grid: z.object({
        itemGap: z.enum(['lg', 'md', 'sm', 'xl', 'xs']),
        itemsPerRow: z.number(),
        itemsPerRowEnabled: z.boolean(),
        rows: z.array(ItemGridListRowConfigSchema),
        size: z.enum(['compact', 'default', 'large']),
    }),
    itemsPerPage: z.number(),
    pagination: z.nativeEnum(ListPaginationType),
    table: ItemTableListPropsSchema,
});

const TranscodingConfigSchema = z.object({
    bitrate: z.number().optional(),
    enabled: z.boolean(),
    format: z.string().optional(),
});

const MpvSettingsSchema = z.object({
    audioExclusiveMode: z.enum(['no', 'yes']),
    audioFormat: z.enum(['float', 's16', 's32']).optional(),
    audioSampleRateHz: z.number().optional(),
    gaplessAudio: z.enum(['no', 'weak', 'yes']),
    replayGainClip: z.boolean(),
    replayGainFallbackDB: z.number().optional(),
    replayGainMode: z.enum(['album', 'no', 'track']),
    replayGainPreampDB: z.number().optional(),
});

const CssSettingsSchema = z.object({
    content: z.string().transform((val) => sanitizeCss(`<style>${val}`)),
    enabled: z.boolean(),
});

const FontSettingsSchema = z.object({
    builtIn: FontValueSchema,
    custom: z.string().nullable(),
    system: z.string().nullable(),
    type: z.nativeEnum(FontType),
});

const SkipButtonsSchema = z.object({
    enabled: z.boolean(),
    skipBackwardSeconds: z.number(),
    skipForwardSeconds: z.number(),
});

const PlayerbarSliderTypeSchema = z.enum(['slider', 'waveform']);

const BarAlignSchema = z.enum(['top', 'bottom', 'center']);

const PlayerbarSliderSchema = z.object({
    barAlign: BarAlignSchema,
    barGap: z.number(),
    barRadius: z.number(),
    barWidth: z.number(),
    loadingDelay: z.number(),
    type: PlayerbarSliderTypeSchema,
});

const AudioMotionAnalyzerSettingsSchema = z.object({
    alphaBars: z
        .boolean()
        .describe(
            'When set to true each bar’s amplitude affects its opacity, i.e., higher bars are rendered more opaque while shorter bars are more transparent. This is similar to the lumiBars effect, but bars’ amplitudes are preserved and it also works on Discrete mode and radial spectrum.',
        ),
    ansiBands: z
        .boolean()
        .describe(
            'When set to true, ANSI/IEC preferred frequencies are used to generate the bands for octave bands modes (see mode). The preferred base-10 scale is used to compute the center and bandedge frequencies, as specified in the ANSI S1.11-2004 standard. When false, bands are based on the equal-tempered scale, so that in 1/12 octave bands the center of each band is perfectly tuned to a musical note.',
        ),
    barSpace: z
        .number()
        .describe(
            'Customize the spacing between bars in frequency bands modes (see mode). Use a value between 0 and 1 for spacing proportional to the band width. Values >= 1 will be considered as a literal number of pixels.',
        ),
    channelLayout: z
        .enum(['single', 'dual-combined', 'dual-horizontal', 'dual-vertical'])
        .describe('Defines the number and layout of analyzer channels.'),
    colorMode: z
        .enum(['gradient', 'bar-index', 'bar-level'])
        .describe('Selects the desired mode for coloring the analyzer bars.'),
    customGradients: z.array(
        z.object({
            colorStops: z.array(
                z.object({
                    color: z.string(),
                    level: z.number().min(0).max(1).optional(),
                    levelEnabled: z.boolean().optional(),
                    pos: z.number().min(0).max(1).optional(),
                    positionEnabled: z.boolean().optional(),
                }),
            ),
            dir: z.string().optional(),
            name: z.string(),
        }),
    ),
    fadePeaks: z
        .boolean()
        .describe(
            'When true, peaks fade out instead of falling down. It has no effect when peakLine is active.',
        ),
    fftSize: z
        .number()
        .describe(
            'Number of samples used for the FFT performed by the AnalyzerNode. It must be a power of 2 between 32 and 32768, so valid values are: 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, and 32768. Higher values provide more detail in the frequency domain, but less detail in the time domain (slower response), so you may need to adjust smoothing accordingly.',
        ),
    fillAlpha: z.number(),
    frequencyScale: z.enum(['bark', 'linear', 'log', 'mel']),
    gradient: z.string(),
    gradientLeft: z.string().optional(),
    gradientRight: z.string().optional(),
    gravity: z.number(),
    ledBars: z.boolean(),
    linearAmplitude: z.boolean(),
    linearBoost: z.number(),
    lineWidth: z.number(),
    loRes: z.boolean(),
    lumiBars: z.boolean(),
    maxDecibels: z.number(),
    maxFPS: z.number(),
    maxFreq: z.number(),
    minDecibels: z.number(),
    minFreq: z.number(),
    mirror: z.number(),
    mode: z.number(),
    noteLabels: z.boolean(),
    opacity: z.number().min(0).max(1),
    outlineBars: z.boolean(),
    peakFadeTime: z.number(),
    peakHoldTime: z.number(),
    peakLine: z.boolean(),
    presets: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            value: z.any(),
        }),
    ),
    radial: z.boolean(),
    radialInvert: z.boolean(),
    radius: z.number(),
    reflexAlpha: z.number(),
    reflexBright: z.number(),
    reflexFit: z.boolean(),
    reflexRatio: z.number(),
    roundBars: z.boolean(),
    showFPS: z.boolean(),
    showPeaks: z.boolean(),
    showScaleX: z.boolean(),
    showScaleY: z.boolean(),
    smoothing: z.number(),
    spinSpeed: z.number(),
    splitGradient: z.boolean(),
    trueLeds: z.boolean(),
    volume: z.number(),
    weightingFilter: z.enum(['', 'A', 'B', 'C', 'D', 'Z']),
});

const ButterchurnSettingsSchema = z.object({
    blendTime: z.number().min(0).max(10),
    currentPreset: z.string().optional(),
    cyclePresets: z.boolean(),
    cycleTime: z.number().min(1).max(300),
    ignoredPresets: z.array(z.string()),
    includeAllPresets: z.boolean(),
    maxFPS: z.number().min(0),
    opacity: z.number().min(0).max(1),
    randomizeNextPreset: z.boolean(),
    selectedPresets: z.array(z.string()),
});

const VisualizerSettingsSchema = z.object({
    audiomotionanalyzer: AudioMotionAnalyzerSettingsSchema,
    butterchurn: ButterchurnSettingsSchema,
    type: z.enum(['audiomotionanalyzer', 'butterchurn']),
});

export enum HomeFeatureStyle {
    MULTIPLE = 'multiple',
    SINGLE = 'single',
}

const AutoSaveSchema = z.object({
    count: z.number().min(0),
    enabled: z.boolean(),
});

export const GeneralSettingsSchema = z.object({
    accent: z
        .string()
        .refine(
            (val) => /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/.test(val),
            {
                message: 'Accent must be a valid rgb() color string',
            },
        ),
    albumBackground: z.boolean(),
    albumBackgroundBlur: z.number(),
    artistBackground: z.boolean(),
    artistBackgroundBlur: z.number(),
    artistItems: z.array(SortableItemSchema(ArtistItemSchema)),
    artistRadioCount: z.number(),
    artistReleaseTypeItems: z.array(SortableItemSchema(ArtistReleaseTypeItemSchema)),
    autoSave: AutoSaveSchema,
    blurExplicitImages: z.boolean(),
    buttonSize: z.number(),
    collections: z.array(CollectionSchema),
    combinedLyricsAndVisualizer: z.boolean(),
    disabledContextMenu: z.record(z.string(), z.boolean()),
    enableGridMultiSelect: z.boolean(),
    externalLinks: z.boolean(),
    followCurrentSong: z.boolean(),
    followSystemTheme: z.boolean(),
    genreTarget: GenreTargetSchema,
    homeFeature: z.boolean(),
    homeFeatureStyle: z.nativeEnum(HomeFeatureStyle),
    homeItems: z.array(SortableItemSchema(HomeItemSchema)),
    imageRes: z.object({
        fullScreenPlayer: z.number(),
        header: z.number(),
        itemCard: z.number(),
        sidebar: z.number(),
        table: z.number(),
    }),
    language: z.string(),
    lastFM: z.boolean(),
    lastfmApiKey: z.string(),
    listenBrainz: z.boolean(),
    musicBrainz: z.boolean(),
    nativeAspectRatio: z.boolean(),
    nativeSpotify: z.boolean(),
    offlineMode: z.boolean(),
    passwordStore: z.string().optional(),
    pathReplace: z.string(),
    pathReplaceWith: z.string(),
    playButtonBehavior: z.nativeEnum(Play),
    playerbarOpenDrawer: z.boolean(),
    playerbarSlider: PlayerbarSliderSchema,
    playerItems: z.array(SortableItemSchema(PlayerItemSchema)),
    playlistTarget: PlaylistTargetSchema,
    primaryShade: z.number().min(0).max(9),
    qobuz: z.boolean(),
    resume: z.boolean(),
    showLyricsInSidebar: z.boolean(),
    showVisualizerInSidebar: z.boolean(),
    sidebarCollapsedNavigation: z.boolean(),
    sidebarCollapseShared: z.boolean(),
    sidebarItems: z.array(SidebarItemTypeSchema),
    sidebarPanelOrder: z.array(SidebarPanelTypeSchema),
    sidebarPlaylistList: z.boolean(),
    sidebarPlaylistListFilterRegex: z.string(),
    sidebarPlaylistSorting: z.boolean(),
    sideQueueLayout: SideQueueLayoutSchema,
    sideQueueType: SideQueueTypeSchema,
    skipButtons: SkipButtonsSchema,
    spotify: z.boolean(),
    theme: z.nativeEnum(AppTheme),
    themeDark: z.nativeEnum(AppTheme),
    themeLight: z.nativeEnum(AppTheme),
    useThemeAccentColor: z.boolean(),
    useThemePrimaryShade: z.boolean(),
    volumeWheelStep: z.number(),
    volumeWidth: z.number(),
    zoomFactor: z.number(),
});

const HotkeyBindingSchema = z.object({
    allowGlobal: z.boolean(),
    hotkey: z.string(),
    isGlobal: z.boolean(),
});

const HotkeysSettingsSchema = z.object({
    bindings: z
        .record(BindingActionsSchema, HotkeyBindingSchema)
        .refine((obj): obj is Required<typeof obj> =>
            Object.values(BindingActions).every((key) => obj[key] != null),
        ),
    globalMediaHotkeys: z.boolean(),
});

const LyricsDisplaySettingsSchema = z.object({
    fontSize: z.number(),
    fontSizeUnsync: z.number(),
    gap: z.number(),
    gapUnsync: z.number(),
    opacityNonActive: z.number(),
    scaleNonActive: z.number(),
});

const LyricsSettingsSchema = z.object({
    alignment: z.enum(['center', 'left', 'right']),
    delayMs: z.number(),
    enableAutoTranslation: z.boolean(),
    fetch: z.boolean(),
    follow: z.boolean(),
    preferLocalLyrics: z.boolean(),
    showMatch: z.boolean(),
    showProvider: z.boolean(),
    sources: z.array(z.nativeEnum(LyricSource)),
    translationApiKey: z.string(),
    translationApiProvider: z.string().nullable(),
    translationTargetLanguage: z.string().nullable(),
});

const ScrobbleSettingsSchema = z.object({
    enabled: z.boolean(),
    notify: z.boolean(),
    scrobbleAtDuration: z.number(),
    scrobbleAtPercentage: z.number(),
});

const PlayerFilterFieldSchema = z.enum([
    'name',
    'albumArtist',
    'artist',
    'duration',
    'genre',
    'year',
    'note',
    'path',
    'playCount',
    'favorite',
]);

const PlayerFilterOperatorSchema = z.enum([
    'is',
    'isNot',
    'contains',
    'notContains',
    'startsWith',
    'endsWith',
    'regex',
    'gt',
    'lt',
    'inTheRange',
    'before',
    'after',
    'beforeDate',
    'afterDate',
    'inTheRangeDate',
    'inTheLast',
    'notInTheLast',
]);

const PlayerFilterSchema = z.object({
    field: PlayerFilterFieldSchema,
    id: z.string(),
    isEnabled: z.boolean().optional(),
    operator: PlayerFilterOperatorSchema,
    value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.union([z.string(), z.number()])),
    ]),
});

const PlaybackSettingsSchema = z.object({
    audioDeviceId: z.string().nullable().optional(),
    audioFadeOnStatusChange: z.boolean(),
    /** @deprecated Unused — desktop Cast always uses the Google default media receiver. */
    castReceiverAppId: z.string().optional(),
    filters: z.array(PlayerFilterSchema),
    mediaSession: z.boolean(),
    mpvAudioDeviceId: z.string().nullable().optional(),
    mpvExtraParameters: z.array(z.string()),
    mpvProperties: MpvSettingsSchema,
    preservePitch: z.boolean(),
    scrobble: ScrobbleSettingsSchema,
    transcode: TranscodingConfigSchema,
    type: z.nativeEnum(PlayerType),
    webAudio: z.boolean(),
});

const RemoteSettingsSchema = z.object({
    enabled: z.boolean(),
    password: z.string(),
    port: z.number(),
    username: z.string(),
});

const WindowSettingsSchema = z.object({
    disableAutoUpdate: z.boolean(),
    exitToTray: z.boolean(),
    minimizeToTray: z.boolean(),
    preventSleepOnPlayback: z.boolean(),
    releaseChannel: z.enum(['alpha', 'beta', 'latest']),
    startMinimized: z.boolean(),
    tray: z.boolean(),
    windowBarStyle: z.nativeEnum(Platform),
});

const QueryValueInputTypeSchema = z.enum([
    'boolean',
    'date',
    'dateRange',
    'number',
    'playlist',
    'string',
]);

const QueryBuilderCustomFieldSchema = z.object({
    label: z.string(),
    type: QueryValueInputTypeSchema,
    value: z.string(),
});

const QueryBuilderSettingsSchema = z.object({
    tag: z.array(QueryBuilderCustomFieldSchema),
});

const AutoDJSettingsSchema = z.object({
    enabled: z.boolean(),
    itemCount: z.number(),
    timing: z.number(),
});

/**
 * This schema is used for validation of the imported settings json
 */
export const ValidationSettingsStateSchema = z.object({
    autoDJ: AutoDJSettingsSchema,
    css: CssSettingsSchema,
    font: FontSettingsSchema,
    general: GeneralSettingsSchema,
    hotkeys: HotkeysSettingsSchema,
    lists: z.record(z.nativeEnum(ItemListKey), ItemListConfigSchema),
    lyrics: LyricsSettingsSchema,
    lyricsDisplay: z.record(z.string(), LyricsDisplaySettingsSchema),
    playback: PlaybackSettingsSchema,
    queryBuilder: QueryBuilderSettingsSchema,
    remote: RemoteSettingsSchema,
    tab: z.union([
        z.literal('general'),
        z.literal('hotkeys'),
        z.literal('playback'),
        z.literal('window'),
        z.string(),
    ]),
    visualizer: VisualizerSettingsSchema,
    window: WindowSettingsSchema,
});

/**
 * This schema is merged below to create the full SettingsSchema but not used during import validation
 */
export const NonValidatedSettingsStateSchema = z.object({});

export const SettingsStateSchema = ValidationSettingsStateSchema.merge(
    NonValidatedSettingsStateSchema,
);

export enum ArtistItem {
    BIOGRAPHY = 'biography',
    FAVORITE_SONGS = 'favoriteSongs',
    RECENT_ALBUMS = 'recentAlbums',
    SIMILAR_ARTISTS = 'similarArtists',
    TOP_SONGS = 'topSongs',
}

export enum ArtistReleaseTypeItem {
    APPEARS_ON = 'appearsOn',
    RELEASE_TYPE_ALBUM = 'releaseTypeAlbum',
    RELEASE_TYPE_AUDIO_DRAMA = 'releaseTypeAudioDrama',
    RELEASE_TYPE_AUDIOBOOK = 'releaseTypeAudiobook',
    RELEASE_TYPE_BROADCAST = 'releaseTypeBroadcast',
    RELEASE_TYPE_COMPILATION = 'releaseTypeCompilation',
    RELEASE_TYPE_DEMO = 'releaseTypeDemo',
    RELEASE_TYPE_DJ_MIX = 'releaseTypeDjMix',
    RELEASE_TYPE_EP = 'releaseTypeEp',
    RELEASE_TYPE_FIELD_RECORDING = 'releaseTypeFieldRecording',
    RELEASE_TYPE_INTERVIEW = 'releaseTypeInterview',
    RELEASE_TYPE_LIVE = 'releaseTypeLive',
    RELEASE_TYPE_MIXTAPE_STREET = 'releaseTypeMixtapeStreet',
    RELEASE_TYPE_OTHER = 'releaseTypeOther',
    RELEASE_TYPE_REMIX = 'releaseTypeRemix',
    RELEASE_TYPE_SINGLE = 'releaseTypeSingle',
    RELEASE_TYPE_SOUNDTRACK = 'releaseTypeSoundtrack',
    RELEASE_TYPE_SPOKENWORD = 'releaseTypeSpokenWord',
}

export enum BarAlign {
    BOTTOM = 'bottom',
    CENTER = 'center',
    TOP = 'top',
}

export { BindingActions } from '/@/shared/types/hotkeys';

export enum GenreTarget {
    ALBUM = 'album',
    TRACK = 'track',
}

export enum HomeItem {
    GENRES = 'genres',
    MOST_PLAYED = 'mostPlayed',
    RANDOM = 'random',
    RECENTLY_ADDED = 'recentlyAdded',
    RECENTLY_PLAYED = 'recentlyPlayed',
    RECENTLY_RELEASED = 'recentlyReleased',
}

export enum PlayerbarSliderType {
    SLIDER = 'slider',
    WAVEFORM = 'waveform',
}

export enum PlayerItem {
    BIT_DEPTH = 'bit_depth',
    BIT_RATE = 'bit_rate',
    BPM = 'bpm',
    CODEC = 'codec',
    DISC_NUMBER = 'disc_number',
    GENRES = 'genres',
    RELEASE_DATE = 'release_date',
    RELEASE_TYPE = 'release_type',
    RELEASE_YEAR = 'release_year',
    SAMPLE_RATE = 'sample_rate',
    TRACK_NUMBER = 'track_number',
}

export enum PlaylistTarget {
    ALBUM = 'album',
    TRACK = 'track',
}

export enum SidebarItem {
    ALBUMS = 'Albums',
    ARTISTS = 'Artists',
    ARTISTS_ALL = 'Artists-all',
    COLLECTIONS = 'Collections',
    FAVORITES = 'Favorites',
    GENRES = 'Genres',
    HOME = 'Home',
    NOW_PLAYING = 'Now Playing',
    PLAYLISTS = 'Playlists',
    RADIO = 'Radio',
    SEARCH = 'Search',
    SETTINGS = 'Settings',
    TRACKS = 'Tracks',
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
export interface SettingsState extends z.infer<typeof SettingsStateSchema> {}
export type SidebarItemType = z.infer<typeof SidebarItemTypeSchema>;

export type SideQueueLayout = z.infer<typeof SideQueueLayoutSchema>;
export type SideQueueType = z.infer<typeof SideQueueTypeSchema>;

export type SortableItem<T extends string> = {
    disabled: boolean;
    id: T;
};

export type TranscodingConfig = z.infer<typeof TranscodingConfigSchema>;

export type VersionedSettings = SettingsState & { version: number };
