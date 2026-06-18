import {
    getItemQualityProfile,
    MobileHomeItemType,
} from '@samo/core/mobile';
import { FlashList } from '@shopify/flash-list';
import { memo, useState, useMemo, useCallback } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { useVisibleHomeContentState } from '../hooks/use-visible-home-content';
import { useVisibleRecentItems } from '../hooks/use-visible-recent-items';

import { ArtworkImage } from '../components/ArtworkImage';
import { QualityBadge } from '../components/QualityBadge';
import { TrackDownloadedGlyph } from '../components/Glyphs';
import { WarningList } from '../components/WarningList';
import {
    useDownloadedCollectionKeys,
    useDownloadedTrackKeys,
} from '../contexts/downloaded-keys';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import { useStableCallback } from '../hooks/use-stable-callback';
import {
    HOME_COMPACT_OFFSET,
    HOME_MEDIA_PROGRESS_CHROME,
    HOME_MEDIA_ROW_HEIGHT,
    HOME_MEDIA_ROW_HEIGHT_ARTIST,
    HOME_MEDIA_ROW_HEIGHT_ROUNDED,
    HOME_MEDIA_ROW_HEIGHT_WIDE,
    HOME_PRIMARY_TILE,
    HOME_ROUNDED_OFFSET,
    HOME_TILE_GAP,
} from '../theme/layout';
import { styles } from '../theme/styles';
import { colors, spacing } from '../theme/tokens';
import { type AndroidHomeContentState } from '../services/home-content';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
} from '../services/recent-content';
import { useAppNavigationSelector } from '../state/app-navigation';
import { type ServerAuthenticationResult } from '@samo/core/server';
import {
    type ContentBackedScreenProps,
    type HomeDisplaySection,
    type HomeFilter,
    type HomeScreenProps,
} from '../types/home';
import { type LibraryMediaType } from '../types/library-display';
import { type ViewAllVariant } from '../types/view-all';
import { getContentItemKey } from '../utils/content-item';
import {
    getDownloadedCollectionKey,
    getDownloadedTrackKey,
} from '../utils/download-keys';
import {
    filterHomeDisplaySections,
    getAvailableHomeFilters,
    getContentItemProgress,
    getHomeDisplaySections,
    getSectionsById,
    getUniqueHomeItems,
    getViewAllVariant,
} from '../utils/home-display';
import { getDisplaySubtitle } from '../utils/playback-time';
import { getLibraryMediaType } from '../utils/library-display';
import { EmptyServerBackedScreen } from './EmptyServerBackedScreen';

const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

export const HomeScreen = memo(({
    onManageServers,
    onPrefetchItem,
    onSelectItem,
    onViewAll,
    serverConnection,
}: HomeScreenProps) => {
    const visibleHomeContentState = useVisibleHomeContentState();
    const visibleRecentItems = useVisibleRecentItems();

    const [homeFilter, setHomeFilter] = useState<HomeFilter>('all');

    if (!serverConnection) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connect Your Library</Text>
                <Text style={styles.mutedText}>
                    Connect Navidrome, Subsonic, or Audiobookshelf to load your real library.
                </Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={onManageServers}
                    style={styles.primaryButton}
                >
                    <Text style={styles.primaryButtonText}>Manage Servers</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <HomeContentStatus
            activeFilter={homeFilter}
            homeContentState={visibleHomeContentState}
            onFilterChange={setHomeFilter}
            onPrefetchItem={onPrefetchItem}
            onSelectItem={onSelectItem}
            onViewAll={onViewAll}
            recentItems={visibleRecentItems}
            serverConnection={serverConnection}
        />
    );
});

HomeScreen.displayName = 'HomeScreen';

export const HomeContentStatus = ({
    activeFilter,
    homeContentState,
    onFilterChange,
    onPrefetchItem,
    onSelectItem,
    onViewAll,
    recentItems,
    serverConnection,
}: {
    activeFilter: HomeFilter;
    homeContentState: AndroidHomeContentState;
    onFilterChange: (filter: HomeFilter) => void;
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll?: (section: HomeDisplaySection) => void;
    recentItems: AndroidRecentContentItem[];
    serverConnection: ServerAuthenticationResult | null;
}) => {
    const stablePrefetchItem = useStableCallback(onPrefetchItem ?? (() => {}));
    const stableSelectItem = useStableCallback(onSelectItem);
    const stableViewAll = useStableCallback((section: HomeDisplaySection): void => {
        onViewAll?.(section);
    });
    const loadedContent = homeContentState.status === 'loaded' ? homeContentState.content : null;
    const allSections = useMemo(
        () =>
            loadedContent
                ? getHomeDisplaySections(
                      loadedContent.sections,
                      recentItems,
                      serverConnection,
                  )
                : [],
        [loadedContent, recentItems, serverConnection],
    );
    const availableFilters = useMemo(
        () => getAvailableHomeFilters(allSections),
        [allSections],
    );
    const filteredSections = useMemo(
        () => filterHomeDisplaySections(allSections, activeFilter),
        [activeFilter, allSections],
    );
    const filteredGridItems = useMemo(
        () => {
            if (activeFilter !== 'podcasts' && activeFilter !== 'audiobooks') {
                return [];
            }

            const mediaType = activeFilter === 'podcasts' ? 'podcasts' : 'audiobooks';
            return getUniqueHomeItems(
                filteredSections
                    .flatMap((section) => section.items)
                    .filter((item) => getLibraryMediaType(item) === mediaType),
            );
        },
        [activeFilter, filteredSections],
    );

    if (homeContentState.status === 'idle') {
        return null;
    }

    if (homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    if (homeContentState.content.sections.length === 0) {
        const isOfflineContent = homeContentState.content.serverTitle === 'Offline Downloads';
        return (
            <>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {isOfflineContent ? 'Offline Downloads' : 'Home'}
                    </Text>
                    <Text style={styles.mutedText}>
                        {isOfflineContent
                            ? 'No downloads yet. Download albums, playlists, podcasts, or audiobooks to use offline mode.'
                            : 'No server-backed Home content returned.'}
                    </Text>
                </View>
                <WarningList errors={homeContentState.content.errors} title="Server warnings" />
            </>
        );
    }

    return (
        <>
            {availableFilters.length > 2 ? (
                <ScrollView
                    contentContainerStyle={styles.homeFilterPills}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                >
                    {availableFilters.map((filter) => {
                        const isActive = filter.id === activeFilter;

                        return (
                            <Pressable
                                accessibilityRole="button"
                                key={filter.id}
                                onPress={() => onFilterChange(filter.id)}
                                style={[
                                    styles.homeFilterPill,
                                    isActive && styles.homeFilterPillActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.homeFilterPillText,
                                        isActive && styles.homeFilterPillTextActive,
                                    ]}
                                >
                                    {filter.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            ) : null}
            {filteredSections.length === 0 ? (
                <View style={[styles.section, { marginTop: spacing.md }]}>
                    <Text style={styles.mutedText}>
                        No {activeFilter === 'all' ? '' : activeFilter + ' '}content loaded yet.
                    </Text>
                </View>
            ) : activeFilter === 'podcasts' || activeFilter === 'audiobooks' ? (
                <HomeFilterGrid
                    items={filteredGridItems}
                    onPrefetchItem={stablePrefetchItem}
                    onSelectItem={stableSelectItem}
                    serverConnection={serverConnection}
                    variant={activeFilter === 'podcasts' ? 'podcast' : 'book'}
                />
            ) : (
                <ContentSections
                    onPrefetchItem={stablePrefetchItem}
                    onSelectItem={stableSelectItem}
                    onViewAll={onViewAll ? stableViewAll : undefined}
                    sections={filteredSections}
                    serverConnection={serverConnection}
                />
            )}
            <WarningList errors={homeContentState.content.errors} title="Server warnings" />
        </>
    );
};

export const ContentBackedScreen = memo(({
    emptyTitle,
    onSelectItem,
    sectionIds,
}: ContentBackedScreenProps) => {
    const homeContentState = useAppNavigationSelector((state) => state.homeContentState);
    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle={emptyTitle} />;
    }

    if (homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    const sections = getSectionsById(homeContentState, sectionIds);

    if (sections.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{emptyTitle}</Text>
                <Text style={styles.mutedText}>No server-backed content returned.</Text>
            </View>
        );
    }

    return (
        <ContentSections
            onSelectItem={onSelectItem}
            sections={sections.map((section) => ({
                items: section.items,
                key: section.id,
                title: section.title,
                variant: 'album',
            }))}
        />
    );
});

ContentBackedScreen.displayName = 'ContentBackedScreen';

const getHomeItemSubtitle = (
    item: AndroidRecentContentSourceItem,
    variant: HomeDisplaySection['variant'],
) => {
    if (variant === 'radio') {
        const nowPlayingText = 'nowPlayingText' in item ? item.nowPlayingText : undefined;
        return nowPlayingText ?? getDisplaySubtitle(item.subtitle);
    }

    if (variant === 'podcast-feed' && item.type === MobileHomeItemType.PODCAST_EPISODE) {
        const parts = getDisplaySubtitle(item.subtitle)?.split(' · ') ?? [];
        return parts.length > 0 ? parts[parts.length - 1] : undefined;
    }

    return getDisplaySubtitle(item.subtitle);
};

const HomeFilterGridTile = memo(({
    isPodcast,
    item,
    onPrefetchItem,
    onSelectItem,
    serverConnection,
    variant,
}: {
    isPodcast: boolean;
    item: AndroidRecentContentSourceItem;
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    serverConnection: ServerAuthenticationResult | null;
    variant: 'book' | 'podcast';
}) => {
    const subtitle = getHomeItemSubtitle(item, variant);

    return (
        <Pressable
            key={getContentItemKey(item)}
            onPress={() => onSelectItem(item)}
            onPressIn={() => onPrefetchItem?.(item)}
            style={styles.homeFilterGridTile}
        >
            <ArtworkImage
                artworkImageId={item.artworkImageId}
                contentSource={item.source}
                fallbackStyle={[
                    styles.homeFilterGridArtworkFallback,
                    isPodcast && styles.homeFilterGridArtworkPodcast,
                ]}
                letter={item.title.slice(0, 1)}
                serverConnection={serverConnection}
                style={[
                    styles.homeFilterGridArtwork,
                    isPodcast && styles.homeFilterGridArtworkPodcast,
                ]}
                uri={item.artworkUrl}
            />
            <Text numberOfLines={2} style={styles.mediaTitle} {...androidTrimCaptionFont}>
                {item.title}
            </Text>
            {subtitle ? (
                <View style={styles.homeFilterGridSubtitleRow}>
                    <Text
                        numberOfLines={1}
                        style={styles.mediaSubtitle}
                        {...androidTrimCaptionFont}
                    >
                        {subtitle}
                    </Text>
                </View>
            ) : null}
        </Pressable>
    );
});

HomeFilterGridTile.displayName = 'HomeFilterGridTile';

const HomeFilterGrid = memo(({
    items,
    onPrefetchItem,
    onSelectItem,
    serverConnection,
    variant,
}: {
    items: AndroidRecentContentSourceItem[];
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    serverConnection: ServerAuthenticationResult | null;
    variant: 'book' | 'podcast';
}) => {
    const isPodcast = variant === 'podcast';
    return (
        <View style={styles.homeFilterGrid}>
            {items.map((item) => (
                <HomeFilterGridTile
                    isPodcast={isPodcast}
                    item={item}
                    key={getContentItemKey(item)}
                    onPrefetchItem={onPrefetchItem}
                    onSelectItem={onSelectItem}
                    serverConnection={serverConnection}
                    variant={variant}
                />
            ))}
        </View>
    );
});

HomeFilterGrid.displayName = 'HomeFilterGrid';

const androidTrimCaptionFont =
    Platform.OS === 'android' ? ({ includeFontPadding: false } as const) : {};

const getHomeRowItemLength = (variant: HomeDisplaySection['variant']): number => {
    switch (variant) {
        case 'artist':
            return HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET + HOME_TILE_GAP;
        case 'podcast':
        case 'podcast-feed':
        case 'radio':
            return HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET + HOME_TILE_GAP;
        case 'continue':
        case 'wide':
            return 320 + HOME_TILE_GAP;
        case 'album':
        case 'book':
        case 'playlist':
        case 'recents':
            return HOME_PRIMARY_TILE + HOME_TILE_GAP;
    }
};

const getHomeSectionRowHeight = (
    variant: HomeDisplaySection['variant'],
    rowCount: number,
): number => {
    let singleHeight: number;
    switch (variant) {
        case 'artist':
            singleHeight = HOME_MEDIA_ROW_HEIGHT_ARTIST;
            break;
        case 'podcast':
        case 'radio':
            singleHeight = HOME_MEDIA_ROW_HEIGHT_ROUNDED;
            break;
        case 'podcast-feed':
            singleHeight = HOME_MEDIA_ROW_HEIGHT_ROUNDED + HOME_MEDIA_PROGRESS_CHROME;
            break;
        case 'continue':
        case 'wide':
            singleHeight = HOME_MEDIA_ROW_HEIGHT_WIDE;
            break;
        default:
            singleHeight = HOME_MEDIA_ROW_HEIGHT;
    }

    return rowCount > 1 ? singleHeight * 2 + spacing.lg : singleHeight;
};

interface HomeMediaTileProps {
    item: AndroidRecentContentSourceItem;
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    sectionVariant: HomeDisplaySection['variant'];
    serverConnection: ServerAuthenticationResult | null;
}

const isDownloadableCollectionMediaType = (mediaType: LibraryMediaType | undefined): boolean =>
    mediaType === 'albums' ||
    mediaType === 'audiobooks' ||
    mediaType === 'playlists' ||
    mediaType === 'podcasts';

const HomeMediaTile = memo(({
    item,
    onPrefetchItem,
    onSelectItem,
    sectionVariant,
    serverConnection,
}: HomeMediaTileProps) => {
    const contextMenu = useMediaContextMenu();
    const downloadedCollectionKeys = useDownloadedCollectionKeys();
    const downloadedTrackKeys = useDownloadedTrackKeys();

    const isAlbum = sectionVariant === 'album';
    const isArtist = sectionVariant === 'artist';
    const isBook = sectionVariant === 'book';
    const isContinue = sectionVariant === 'continue';
    const isPlaylist = sectionVariant === 'playlist';
    const isPodcast = sectionVariant === 'podcast' || sectionVariant === 'podcast-feed';
    const isRadioSection = sectionVariant === 'radio';
    const isRecent = sectionVariant === 'recents';
    const isWide = sectionVariant === 'wide' || isContinue;
    const isRadio = item.type === MobileHomeItemType.RADIO;
    const mediaType = getLibraryMediaType(item);
    // An artist tile rendered inside a Recents/mixed row must still
    // be circular — never a square with a letter.
    const isArtistItem = item.type === MobileHomeItemType.ARTIST;
    const progress = getContentItemProgress(item);
    const subtitle = getHomeItemSubtitle(item, sectionVariant);
    const isDownloadedTrack =
        mediaType === 'songs' &&
        downloadedTrackKeys.has(getDownloadedTrackKey(item.source?.id, item.id));
    const isDownloadedCollection =
        isDownloadableCollectionMediaType(mediaType) &&
        downloadedCollectionKeys.has(getDownloadedCollectionKey(item.source?.id, item.id));
    const isDownloaded = isDownloadedTrack || isDownloadedCollection;
    // Playlists are never a single quality, so per the UX rule we
    // suppress the format badge on playlist tiles even when the
    // item happens to carry an isHiRes flag from an older path.
    const tileBadgeProfile =
        item.type === MobileHomeItemType.PLAYLIST ? undefined : getItemQualityProfile(item);
    const tileStyle = [
        styles.mediaTile,
        isAlbum && styles.mediaTileAlbum,
        isArtist && styles.mediaTileArtist,
        isRecent && styles.mediaTileCompact,
        isRadioSection && styles.mediaTileGrid,
        isWide && styles.mediaTileWide,
        isContinue && styles.mediaTileContinue,
        isBook && styles.mediaTileBook,
        isPlaylist && styles.mediaTilePlaylist,
        isPodcast && styles.mediaTilePodcast,
    ];
    const artworkStyle = [
        styles.mediaArtwork,
        isAlbum && styles.mediaArtworkAlbum,
        isArtist && styles.mediaArtworkArtist,
        isRecent && styles.mediaArtworkCompact,
        isRadioSection && styles.mediaArtworkGrid,
        isWide && styles.mediaArtworkWide,
        isBook && styles.mediaArtworkBook,
        isPlaylist && styles.mediaArtworkPlaylist,
        isPodcast && styles.mediaArtworkPodcast,
        isRadio && styles.mediaArtworkRadio,
        isArtistItem && styles.libraryArtworkRound,
    ];
    const fallbackStyle = [
        styles.mediaArtworkFallback,
        isAlbum && styles.mediaArtworkAlbum,
        isArtist && styles.mediaArtworkArtist,
        isRecent && styles.mediaArtworkCompact,
        isRadioSection && styles.mediaArtworkGrid,
        isWide && styles.mediaArtworkWide,
        isBook && styles.mediaArtworkBook,
        isPlaylist && styles.mediaArtworkPlaylist,
        isPodcast && styles.mediaArtworkPodcast,
        isRadio && styles.mediaArtworkRadio,
        isArtistItem && styles.libraryArtworkRound,
    ];

    return (
        <Pressable
            accessibilityRole="button"
            onLongPress={() => contextMenu.openForItem(item)}
            onPress={() => onSelectItem(item)}
            onPressIn={() => onPrefetchItem?.(item)}
            style={({ pressed }) => [tileStyle, pressed && styles.tilePressed]}
            unstable_pressDelay={110}
        >
            <ArtworkImage
                artworkImageId={item.artworkImageId}
                contentSource={item.source}
                fallbackStyle={fallbackStyle}
                letter={item.title.slice(0, 1)}
                serverConnection={serverConnection}
                style={artworkStyle}
                uri={item.artworkUrl}
            />
            <View style={[styles.tileMetaRow, isWide && styles.tileMetaRowFill]}>
                <View
                    style={[
                        styles.mediaText,
                        styles.tileMetaTextCol,
                        isWide && styles.mediaTextWide,
                        isArtist && styles.mediaTextCentered,
                    ]}
                >
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.mediaTitle,
                            (isArtist || isRadioSection) && styles.mediaTitleCentered,
                            isWide && styles.mediaTitleWide,
                        ]}
                        {...androidTrimCaptionFont}
                    >
                        {item.title}
                    </Text>
                    {subtitle || isDownloaded ? (
                        <View
                            style={[
                                styles.mediaInfoRow,
                                isArtist && styles.mediaInfoRowCentered,
                            ]}
                        >
                            {isDownloaded ? (
                                <View style={styles.mediaDownloadIndicator}>
                                    <TrackDownloadedGlyph size={11} />
                                </View>
                            ) : null}
                            {subtitle ? (
                                <Text
                                    numberOfLines={isWide ? 2 : 1}
                                    style={[
                                        styles.mediaSubtitle,
                                        styles.mediaSubtitleInline,
                                        isArtist && styles.mediaSubtitleCentered,
                                    ]}
                                    {...androidTrimCaptionFont}
                                >
                                    {subtitle}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}
                    {(isContinue || (isPodcast && sectionVariant === 'podcast-feed')) &&
                    progress !== undefined ? (
                        <View style={styles.continueProgressTrack}>
                            <View
                                style={[
                                    styles.continueProgressFill,
                                    { width: `${progress * 100}%` },
                                ]}
                            />
                        </View>
                    ) : null}
                </View>
                <QualityBadge tile profile={tileBadgeProfile} />
            </View>
        </Pressable>
    );
});

HomeMediaTile.displayName = 'HomeMediaTile';

interface HomeDisplayRowProps {
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll?: (section: HomeDisplaySection) => void;
    section: HomeDisplaySection;
    serverConnection: ServerAuthenticationResult | null;
}

/** TL → TR → BL → BR per 2-row band, then continue columns to the right. */
const chunkHomeSectionItems = (
    items: AndroidRecentContentSourceItem[],
    rowCount: number,
): AndroidRecentContentSourceItem[][] => {
    if (rowCount <= 1) {
        return items.map((item) => [item]);
    }

    const columnCount = Math.ceil(items.length / rowCount);
    const columns: AndroidRecentContentSourceItem[][] = [];

    for (let column = 0; column < columnCount; column += 1) {
        const columnItems: AndroidRecentContentSourceItem[] = [];
        for (let row = 0; row < rowCount; row += 1) {
            const index = column * rowCount + row;
            if (index < items.length) {
                columnItems.push(items[index]);
            }
        }
        if (columnItems.length > 0) {
            columns.push(columnItems);
        }
    }

    return columns;
};

const HomeDisplayRow = memo(({
    onPrefetchItem,
    onSelectItem,
    onViewAll,
    section,
    serverConnection,
}: HomeDisplayRowProps) => {
    const viewAllVariant = getViewAllVariant(section.variant);
    const canViewAll = viewAllVariant !== null && Boolean(onViewAll);
    const rowCount = section.rowCount ?? 1;
    const itemLength = getHomeRowItemLength(section.variant);
    const rowHeight = getHomeSectionRowHeight(section.variant, rowCount);
    const drawDistance = itemLength * 4;
    const columns = useMemo(
        () => (rowCount > 1 ? chunkHomeSectionItems(section.items, rowCount) : []),
        [rowCount, section.items],
    );
    const renderItem = useCallback(
        ({ item }: { item: AndroidRecentContentSourceItem }) => (
            <HomeMediaTile
                item={item}
                onPrefetchItem={onPrefetchItem}
                onSelectItem={onSelectItem}
                sectionVariant={section.variant}
                serverConnection={serverConnection}
            />
        ),
        [onPrefetchItem, onSelectItem, section.variant, serverConnection],
    );
    const renderColumn = useCallback(
        ({ item: column }: { item: AndroidRecentContentSourceItem[] }) => (
            <View style={styles.homeMultiRowColumn}>
                {column.map((item) => (
                    <HomeMediaTile
                        item={item}
                        key={getContentItemKey(item)}
                        onPrefetchItem={onPrefetchItem}
                        onSelectItem={onSelectItem}
                        sectionVariant={section.variant}
                        serverConnection={serverConnection}
                    />
                ))}
            </View>
        ),
        [onPrefetchItem, onSelectItem, section.variant, serverConnection],
    );

    return (
        <View style={styles.homeSection}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {canViewAll ? (
                    <Pressable
                        accessibilityLabel={`View all ${section.title}`}
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => onViewAll?.(section)}
                        style={styles.sectionViewAll}
                    >
                        <Text style={styles.sectionViewAllLabel}>View All</Text>
                    </Pressable>
                ) : null}
            </View>
            {rowCount > 1 ? (
                <FlashList
                    data={columns}
                    drawDistance={drawDistance}
                    horizontal
                    keyExtractor={(column) => column.map(getContentItemKey).join('|')}
                    maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                    renderItem={renderColumn}
                    showsHorizontalScrollIndicator={false}
                    style={{ ...styles.homeRowList, height: rowHeight }}
                />
            ) : (
                <FlashList
                    data={section.items}
                    drawDistance={drawDistance}
                    horizontal
                    keyExtractor={getContentItemKey}
                    maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                    renderItem={renderItem}
                    showsHorizontalScrollIndicator={false}
                    style={{ ...styles.homeRowList, height: rowHeight }}
                />
            )}
        </View>
    );
});

HomeDisplayRow.displayName = 'HomeDisplayRow';

const ContentSections = memo(({
    onPrefetchItem,
    onSelectItem,
    onViewAll,
    sections,
    serverConnection,
}: {
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll?: (section: HomeDisplaySection) => void;
    sections: HomeDisplaySection[];
    serverConnection?: ServerAuthenticationResult | null;
}) => {
    return (
        <>
            {sections.map((section) => (
                <HomeDisplayRow
                    key={section.key}
                    onPrefetchItem={onPrefetchItem}
                    onSelectItem={onSelectItem}
                    onViewAll={onViewAll}
                    section={section}
                    serverConnection={serverConnection ?? null}
                />
            ))}
        </>
    );
});

ContentSections.displayName = 'ContentSections';
