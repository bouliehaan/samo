import {
    isMobilePlaylistDetailEditable,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import { FlashList } from '@shopify/flash-list';
import Reanimated from 'react-native-reanimated';
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Choreographed } from '../components/Choreographed';
import { EditPlaylistSheet, removeSelectedPlaylistTracks } from '../components/EditPlaylistSheet';
import { PlaylistTrackControls } from '../components/PlaylistTrackControls';
import { SkeletonTrackRow } from '../components/Skeleton';
import { useChoreography } from '../hooks/use-choreography';
import { useCollapsedDetailHeader } from '../hooks/use-collapsed-detail-header';
import { useScrollContentBottomInset } from '../hooks/use-scroll-content-bottom-inset';
import { useStableCallback } from '../hooks/use-stable-callback';
import { useTransitioningMount } from '../hooks/use-transitioning-mount';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { triggerSelection } from '../services/haptics';
import { styles } from '../theme/styles';
import { colors, spacing } from '../theme/tokens';
import {
    getDetailTypeLabel,
    getPlaylistTrackItemType,
    getPlaylistTrackSearchText,
    PLAYLIST_TRACK_DRAW_DISTANCE,
} from '../utils/media-detail';
import { isHiFiTrack } from '../utils/media-quality';
import { ArtistDetailSections } from './ArtistDetailSections';
import { DetailHeroArtwork, MediaDetailCollapsedTopbar, MediaDetailHero } from './MediaDetailHero';
import { MediaDetailTrackRow } from './MediaDetailTrackRow';
import { PlaylistFloatingSearch } from './PlaylistFloatingSearch';

// Stable-identity placeholder rows for the loading state, so the unified detail
// list shows skeleton rows under the (persistent) hero while the real tracks load.
const SKELETON_TRACK_PLACEHOLDERS: MobileMediaTrack[] = Array.from(
    { length: 8 },
    (_, index) => ({ id: `__skeleton__${index}` }) as MobileMediaTrack,
);

const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;
const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

const renderSkeletonRow = () => <SkeletonTrackRow />;

/**
 * A loaded (or loading-shell) media detail. This is an orchestrator: the
 * hero, collapsed top bar, track rows, and floating search are memoized
 * subcomponents with stable callbacks, so a search keystroke re-renders the
 * (cheap) list data, a selection tap re-renders one row, and a download
 * progress tick re-renders one button — never the whole surface.
 */
export const MediaDetailLoaded = memo(function MediaDetailLoaded({
    detail,
    entranceKey,
    fallbackArtworkImageId,
    fallbackArtworkUrl,
    isAwaitingDetail = false,
    onBack,
    onPlayTrack,
    onReloadDetail,
    onSelectItem,
    onShufflePlay,
    serverConnection,
}: {
    detail: MobileMediaDetail;
    /**
     * What the entrance choreography treats as "a different page" — the
     * navigation's cache key, NOT `detail.id`.
     *
     * These come apart during loading. The surface deliberately renders this
     * same component against a placeholder detail first, so the hero image
     * stays mounted across the swap — but that placeholder carries a synthetic
     * `__loading__:` id, so keying the clock on `detail.id` saw the arrival of
     * the real payload as a navigation to a different album. The clock snapped
     * back to 0 and replayed: the page assembled, blanked to nothing, and
     * assembled a second time. That double-take is what read as a flash on
     * every detail page, and it got worse the slower the fetch was.
     *
     * The navigation key survives loading → loaded untouched (the store sets it
     * once, on open) and changes on a real navigation, which is exactly the
     * question the clock is asking.
     */
    entranceKey?: string | null;
    fallbackArtworkImageId?: string;
    fallbackArtworkUrl?: string;
    /** Render the real list+hero shell against a placeholder detail while the
     *  full detail loads — keeps the hero ExpoImage mounted (no cover flash). */
    isAwaitingDetail?: boolean;
    onBack: () => void;
    onPlayTrack: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        index: number,
        queueTracks?: MobileMediaTrack[],
    ) => void;
    onReloadDetail?: () => Promise<void>;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onShufflePlay: (detail: MobileMediaDetail, tracks?: MobileMediaTrack[]) => void;
    serverConnection: ServerAuthenticationResult | null;
}) {
    const [playlistEditVisible, setPlaylistEditVisible] = useState(false);
    const [playlistManageMode, setPlaylistManageMode] = useState(false);
    const [playlistSelectedTrackIds, setPlaylistSelectedTrackIds] = useState<Set<string>>(
        () => new Set(),
    );
    const [playlistManageSaving, setPlaylistManageSaving] = useState(false);
    // Playlist-only filter + sort. Playlists are mixed format and mixed
    // artists by definition, so being able to scope to Hi-Fi only or
    // re-sort by title/artist is the user-facing affordance the user
    // asked for. Album tracks keep their server order untouched.
    const [playlistFilter, setPlaylistFilter] = useState<'all' | 'hifi'>('all');
    const [playlistSort, setPlaylistSort] = useState<'artist' | 'order' | 'title'>('order');
    const [playlistSortAsc, setPlaylistSortAsc] = useState(true);
    const [playlistSearchVisible, setPlaylistSearchVisible] = useState(false);
    const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
    // The input echoes keystrokes urgently; the (potentially large) filter +
    // re-layout below follows this deferred copy at low priority, so typing
    // in a 1,000-track playlist never stutters the keyboard.
    const deferredSearchQuery = useDeferredValue(playlistSearchQuery);

    // First frames after a navigation render a capped list so the open
    // animation never contends with a full playlist mount.
    const isTransitioning = useTransitioningMount();

    const rootRef = useRef<View>(null);
    const bottomInset = useScrollContentBottomInset();
    const collapsedHeader = useCollapsedDetailHeader();

    // One clock for this page's entrance, restarted only when the DETAIL
    // changes — navigating album → album re-runs the assembly, while a
    // favourite toggling or a download landing leaves it alone.
    //
    // This is also what makes the cascade safe under FlashList recycling. A
    // row's slot is derived from its index against this clock, so rows mounted
    // after the clock reaches 1 (i.e. everything the user scrolls to) evaluate
    // to "already at rest" and never animate. Recycled rows do not re-play the
    // entrance, which is the usual way a staggered list turns into a mess.
    const entranceClock = useChoreography(entranceKey ?? detail.id);

    const isMusic =
        detail.type === MobileMediaDetailType.ALBUM ||
        detail.type === MobileMediaDetailType.PLAYLIST;
    const isPlaylistDetail = detail.type === MobileMediaDetailType.PLAYLIST;
    const isArtistDetail = detail.type === MobileMediaDetailType.ARTIST;
    const canEditPlaylist = isPlaylistDetail && isMobilePlaylistDetailEditable(detail);
    const playlistAuth = useMemo(
        () => findServerAuthenticationForSource(serverConnection, detail.source),
        [detail.source, serverConnection],
    );

    useEffect(() => {
        setPlaylistManageMode(false);
        setPlaylistSelectedTrackIds(new Set());
        setPlaylistEditVisible(false);
    }, [detail.id, detail.type]);
    const hasHiFiTracks = isPlaylistDetail && detail.tracks.some(isHiFiTrack);

    useEffect(() => {
        if (playlistFilter === 'hifi' && !hasHiFiTracks) {
            setPlaylistFilter('all');
        }
    }, [hasHiFiTracks, playlistFilter]);
    useEffect(() => {
        setPlaylistSearchVisible(false);
        setPlaylistSearchQuery('');
    }, [detail.id, detail.source.id]);

    /**
     * Track list after the playlist's filter + sort controls are applied.
     * For non-playlists we return the original tracks untouched — albums
     * already ship in their authored order and shouldn't be reshuffleable
     * from this surface.
     */
    const fullDisplayTracks = useMemo(() => {
        if (!isPlaylistDetail) return detail.tracks;
        const playlistSearchNeedle = deferredSearchQuery.trim().toLocaleLowerCase();
        let filtered =
            playlistFilter === 'hifi' ? detail.tracks.filter(isHiFiTrack) : detail.tracks;
        if (playlistSearchNeedle) {
            filtered = filtered.filter((track) =>
                getPlaylistTrackSearchText(track).includes(playlistSearchNeedle),
            );
        }
        if (playlistSort === 'order') {
            // "Order Added" descending = newest at top, which for server
            // playlists is whatever order the entries arrived in. Ascending
            // flips that — playlist start at the bottom.
            return playlistSortAsc ? filtered : [...filtered].reverse();
        }
        const sorted = [...filtered].sort((left, right) => {
            const leftKey = playlistSort === 'artist' ? (left.artist ?? '') : (left.title ?? '');
            const rightKey = playlistSort === 'artist' ? (right.artist ?? '') : (right.title ?? '');
            return leftKey.localeCompare(rightKey, undefined, { sensitivity: 'base' });
        });
        return playlistSortAsc ? sorted : sorted.reverse();
    }, [
        deferredSearchQuery,
        detail.tracks,
        isPlaylistDetail,
        playlistFilter,
        playlistSort,
        playlistSortAsc,
    ]);
    const displayTracks = useMemo(() => {
        return isTransitioning ? fullDisplayTracks.slice(0, 20) : fullDisplayTracks;
    }, [fullDisplayTracks, isTransitioning]);

    const playableDisplayTracks = useMemo(
        () => fullDisplayTracks.filter((track) => track.playback),
        [fullDisplayTracks],
    );
    const firstPlayableDisplayTrack = playableDisplayTracks[0];
    const firstPlayableDisplayIndex = firstPlayableDisplayTrack
        ? displayTracks.indexOf(firstPlayableDisplayTrack)
        : -1;
    const heroPlayTrack = isPlaylistDetail ? firstPlayableDisplayTrack : detail.tracks[0];
    const heroPlayIndex = isPlaylistDetail ? firstPlayableDisplayIndex : 0;
    const canPlayDetail = Boolean(heroPlayTrack);
    const showPlaylistShuffle = isPlaylistDetail && playableDisplayTracks.length > 0;
    const showAlbumDiscHeaders =
        detail.type === MobileMediaDetailType.ALBUM && (detail.discCount ?? 0) > 1;

    const sectionTitle =
        detail.type === MobileMediaDetailType.AUDIOBOOK
            ? 'Chapters'
            : detail.type === MobileMediaDetailType.PODCAST
              ? 'Episodes'
              : detail.type === MobileMediaDetailType.ARTIST
                ? 'Albums'
                : 'Tracks';
    const emptyText =
        detail.type === MobileMediaDetailType.AUDIOBOOK
            ? 'No chapters returned by the server.'
            : detail.type === MobileMediaDetailType.PODCAST
              ? 'No episodes returned by the server.'
              : detail.type === MobileMediaDetailType.ARTIST
                ? 'No albums returned by the server.'
                : 'No playable tracks returned by the server.';

    // Hero cover identity. Prefer the cover the skeleton already showed (and
    // cached) so the loaded hero resolves to the SAME canonical key — its disk
    // peek hits, so the placeholder paints the cover on the new view's first
    // frame and the skeleton→detail swap shows no blank flash. Atomic on/off:
    // mixing the opening imageId with the detail url (or vice-versa) can resolve
    // to a THIRD key that's cached as neither. Falls back to detail art when the
    // detail was opened without an opening cover (deep link, etc.).
    const hasOpeningArt = fallbackArtworkUrl != null || fallbackArtworkImageId != null;
    const heroArtworkImageId = hasOpeningArt ? fallbackArtworkImageId : detail.artworkImageId;
    const heroArtworkUrl = hasOpeningArt ? fallbackArtworkUrl : detail.artworkUrl;

    const listData = isAwaitingDetail ? SKELETON_TRACK_PLACEHOLDERS : displayTracks;

    // ------------------------------------------------------------------
    // Stable callbacks for the memoized hero / topbar / rows. useStableCallback
    // reads the latest closure at call time, so these never change identity
    // and never invalidate the children below.
    // ------------------------------------------------------------------
    const handleHeroPlay = useStableCallback(() => {
        if (!heroPlayTrack) {
            return;
        }
        onPlayTrack(
            detail,
            heroPlayTrack,
            heroPlayIndex,
            isPlaylistDetail ? displayTracks : undefined,
        );
    });
    const handleHeroShuffle = useStableCallback(() => {
        void onShufflePlay(detail, displayTracks);
    });
    const handleRowPlay = useStableCallback((track: MobileMediaTrack, index: number) => {
        onPlayTrack(detail, track, index, displayTracks);
    });
    const handleToggleSelect = useCallback((trackId: string) => {
        setPlaylistSelectedTrackIds((current) => {
            const next = new Set(current);
            if (next.has(trackId)) {
                next.delete(trackId);
            } else {
                next.add(trackId);
            }
            return next;
        });
        triggerSelection();
    }, []);
    const handleToggleSearch = useStableCallback(() => {
        if (playlistSearchVisible) {
            setPlaylistSearchQuery('');
            setPlaylistSearchVisible(false);
            return;
        }
        setPlaylistSearchVisible(true);
    });
    const handleOpenEditPlaylist = useCallback(() => setPlaylistEditVisible(true), []);
    const handleCloseEditPlaylist = useCallback(() => setPlaylistEditVisible(false), []);
    const handleManageTracks = useCallback(() => {
        setPlaylistManageMode(true);
        setPlaylistSelectedTrackIds(new Set());
    }, []);
    const handleCancelManage = useCallback(() => {
        setPlaylistManageMode(false);
        setPlaylistSelectedTrackIds(new Set());
    }, []);
    const handlePlaylistSaved = useStableCallback(() => void onReloadDetail?.());

    const handleRemoveSelectedPlaylistTracks = useStableCallback(() => {
        if (!playlistAuth || playlistSelectedTrackIds.size === 0) {
            return;
        }

        Alert.alert(
            'Remove tracks',
            `Remove ${playlistSelectedTrackIds.size} track${
                playlistSelectedTrackIds.size === 1 ? '' : 's'
            } from this playlist?`,
            [
                { style: 'cancel', text: 'Cancel' },
                {
                    style: 'destructive',
                    text: 'Remove',
                    onPress: () => {
                        void (async () => {
                            setPlaylistManageSaving(true);
                            try {
                                await removeSelectedPlaylistTracks({
                                    authentication: playlistAuth,
                                    detail,
                                    selectedTrackIds: playlistSelectedTrackIds,
                                });
                                setPlaylistManageMode(false);
                                setPlaylistSelectedTrackIds(new Set());
                                await onReloadDetail?.();
                            } catch (error) {
                                Alert.alert(
                                    'Remove tracks',
                                    error instanceof Error
                                        ? error.message
                                        : 'Failed to update playlist',
                                );
                            } finally {
                                setPlaylistManageSaving(false);
                            }
                        })();
                    },
                },
            ],
        );
    });

    const isManageMode = isPlaylistDetail && playlistManageMode;
    const renderTrackItem = useCallback(
        ({ index, item: track }: { index: number; item: MobileMediaTrack }) => {
            const discNumber = track.discNumber ?? 1;
            const previousDiscNumber =
                index > 0 ? (displayTracks[index - 1]?.discNumber ?? 1) : null;
            const shouldShowDiscHeader =
                showAlbumDiscHeaders && (index === 0 || previousDiscNumber !== discNumber);

            return (
                <Choreographed cascadeIndex={index} clock={entranceClock}>
                    <MediaDetailTrackRow
                        detail={detail}
                        discHeader={shouldShowDiscHeader ? discNumber : null}
                        fallbackArtworkUrl={fallbackArtworkUrl}
                        index={index}
                        isManageMode={isManageMode}
                        isSelected={playlistSelectedTrackIds.has(track.id)}
                        onPlay={handleRowPlay}
                        onToggleSelect={handleToggleSelect}
                        serverConnection={serverConnection}
                        track={track}
                    />
                </Choreographed>
            );
        },
        [
            detail,
            displayTracks,
            entranceClock,
            fallbackArtworkUrl,
            handleRowPlay,
            handleToggleSelect,
            isManageMode,
            playlistSelectedTrackIds,
            serverConnection,
            showAlbumDiscHeaders,
        ],
    );

    const hero = (
        <MediaDetailHero
            canEditPlaylist={canEditPlaylist}
            clock={entranceClock}
            detail={detail}
            fallbackArtworkUrl={fallbackArtworkUrl}
            heroArtworkImageId={heroArtworkImageId}
            heroArtworkUrl={heroArtworkUrl}
            isAwaitingDetail={isAwaitingDetail}
            onEditPlaylist={handleOpenEditPlaylist}
            onLayoutActionsBar={collapsedHeader.onHeroActionsBarLayout}
            onPlayHero={handleHeroPlay}
            onShuffleHero={handleHeroShuffle}
            onToggleSearch={handleToggleSearch}
            searchToggleVisible={playlistSearchVisible}
            serverConnection={serverConnection}
            showPlayButton={canPlayDetail}
            showSearchToggle={isPlaylistDetail && detail.tracks.length > 0}
            showShuffle={showPlaylistShuffle}
        />
    );

    const collapsedTopbar = (
        <MediaDetailCollapsedTopbar
            backdropStyle={collapsedHeader.backdropStyle}
            contentStyle={collapsedHeader.contentStyle}
            isInteractive={collapsedHeader.isInteractive}
            onBack={onBack}
            onPlay={handleHeroPlay}
            onShuffle={handleHeroShuffle}
            showPlay={canPlayDetail}
            showShuffle={showPlaylistShuffle}
            title={detail.title}
        />
    );

    if (isPlaylistDetail) {
        const playlistEmptyText =
            detail.tracks.length === 0
                ? emptyText
                : playlistSearchQuery.trim()
                  ? 'No tracks match this search.'
                  : 'No tracks match the current filter.';

        return (
            <View ref={rootRef} style={styles.mediaDetailScreen}>
                <ReanimatedFlashList
                    contentContainerStyle={[
                        styles.mediaDetailContent,
                        { paddingBottom: bottomInset },
                    ]}
                    data={listData}
                    drawDistance={PLAYLIST_TRACK_DRAW_DISTANCE}
                    getItemType={getPlaylistTrackItemType}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(track, index) => `${track.id}:${index}`}
                    ListEmptyComponent={
                        <Text style={styles.playlistListEmpty}>{playlistEmptyText}</Text>
                    }
                    ListHeaderComponent={
                        <>
                            {hero}
                            <View style={styles.homeSection}>
                                {isManageMode ? (
                                    <View style={styles.playlistManageBar}>
                                        <Text style={styles.playlistManageBarText}>
                                            {playlistSelectedTrackIds.size} selected
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                            <Pressable
                                                accessibilityRole="button"
                                                disabled={playlistManageSaving}
                                                onPress={handleCancelManage}
                                            >
                                                <Text style={styles.editPlaylistGhostButtonText}>
                                                    Cancel
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                accessibilityRole="button"
                                                disabled={
                                                    playlistManageSaving ||
                                                    playlistSelectedTrackIds.size === 0
                                                }
                                                onPress={handleRemoveSelectedPlaylistTracks}
                                            >
                                                {playlistManageSaving ? (
                                                    <ActivityIndicator color={colors.accent} />
                                                ) : (
                                                    <Text
                                                        style={styles.editPlaylistDangerButtonText}
                                                    >
                                                        Remove
                                                    </Text>
                                                )}
                                            </Pressable>
                                        </View>
                                    </View>
                                ) : null}
                                {detail.tracks.length > 0 ? (
                                    <PlaylistTrackControls
                                        filter={playlistFilter}
                                        onFilterChange={setPlaylistFilter}
                                        onSortChange={setPlaylistSort}
                                        onToggleSortDirection={() =>
                                            setPlaylistSortAsc((value) => !value)
                                        }
                                        showHiFiFilter={hasHiFiTracks}
                                        sort={playlistSort}
                                        sortAsc={playlistSortAsc}
                                    />
                                ) : null}
                            </View>
                        </>
                    }
                    maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                    {...collapsedHeader.scrollMotionProps}
                    onScroll={collapsedHeader.scrollHandler}
                    renderItem={isAwaitingDetail ? renderSkeletonRow : renderTrackItem}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                />
                <PlaylistFloatingSearch
                    onChangeQuery={setPlaylistSearchQuery}
                    query={playlistSearchQuery}
                    rootRef={rootRef}
                    visible={playlistSearchVisible}
                />
                {collapsedTopbar}
                <EditPlaylistSheet
                    detail={detail}
                    onClose={handleCloseEditPlaylist}
                    onDeleted={onBack}
                    onManageTracks={handleManageTracks}
                    onSaved={handlePlaylistSaved}
                    serverConnection={serverConnection}
                    visible={playlistEditVisible}
                />
            </View>
        );
    }

    if (!isArtistDetail) {
        return (
            <View style={styles.mediaDetailScreen}>
                <ReanimatedFlashList
                    contentContainerStyle={[
                        styles.mediaDetailContent,
                        { paddingBottom: bottomInset },
                    ]}
                    data={listData}
                    drawDistance={PLAYLIST_TRACK_DRAW_DISTANCE}
                    keyExtractor={(track, index) => `${track.id}:${index}`}
                    ListEmptyComponent={
                        <Text style={styles.mutedText}>
                            {detail.tracks.length === 0
                                ? emptyText
                                : 'No tracks match the current filter.'}
                        </Text>
                    }
                    ListHeaderComponent={
                        <>
                            {hero}
                            <View style={styles.homeSection}>
                                {!isMusic ? (
                                    <Text style={styles.sectionTitle}>{sectionTitle}</Text>
                                ) : null}
                            </View>
                        </>
                    }
                    {...collapsedHeader.scrollMotionProps}
                    onScroll={collapsedHeader.scrollHandler}
                    renderItem={isAwaitingDetail ? renderSkeletonRow : renderTrackItem}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                />
                {collapsedTopbar}
            </View>
        );
    }

    return (
        <View style={styles.mediaDetailScreen}>
            <Reanimated.ScrollView
                contentContainerStyle={[styles.mediaDetailContent, { paddingBottom: bottomInset }]}
                {...collapsedHeader.scrollMotionProps}
                onScroll={collapsedHeader.scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.detailHero}>
                    <DetailHeroArtwork
                        artworkImageId={heroArtworkImageId}
                        contentSource={detail.source}
                        fallbackUri={fallbackArtworkUrl}
                        letter={detail.title.slice(0, 1)}
                        primaryUri={heroArtworkUrl}
                        round
                        serverConnection={serverConnection}
                        style={[styles.detailArtwork, styles.detailArtworkRound]}
                    />
                    <View style={styles.detailHeroText}>
                        <Text style={styles.detailType}>{getDetailTypeLabel(detail.type)}</Text>
                        <Text style={styles.detailTitle}>{detail.title}</Text>
                        {detail.subtitle ? (
                            <Text numberOfLines={2} style={styles.mediaSubtitle}>
                                {detail.subtitle}
                            </Text>
                        ) : null}
                    </View>
                </View>
                <ArtistDetailSections
                    detail={detail}
                    emptyText={emptyText}
                    fallbackArtworkUrl={fallbackArtworkUrl}
                    onPlayTrack={onPlayTrack}
                    onSelectItem={onSelectItem}
                    sectionTitle={sectionTitle}
                    serverConnection={serverConnection}
                />
            </Reanimated.ScrollView>
            {collapsedTopbar}
        </View>
    );
});
