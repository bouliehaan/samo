import {
    getDetailQualityProfile,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    type ImageStyle,
    type LayoutChangeEvent,
    Pressable,
    type StyleProp,
    Text,
    View,
    type ViewStyle,
} from 'react-native';
import Reanimated, { type SharedValue, type useAnimatedStyle } from 'react-native-reanimated';

import { ArtworkImage } from '../components/ArtworkImage';
import { Choreographed } from '../components/Choreographed';
import {
    CircularDownloadGlyph,
    GearGlyph,
    MoreGlyph,
    PlayPauseGlyph,
    SearchGlyph,
    ShuffleGlyph,
} from '../components/Glyphs';
import { SkeletonBlock } from '../components/Skeleton';
import { type MediaContextMenuKind, useMediaContextMenu } from '../contexts/media-context-menu';
import {
    type DownloadEntry,
    enqueueCollectionDownload,
    subscribeDownloads,
} from '../services/download-manager';
import { formatQualityProfile } from '../services/quality-badge-assets';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { getDetailTypeLabel } from '../utils/media-detail';
import { detailHasHiRes } from '../utils/media-quality';

export const DetailHeroArtwork = ({
    artworkImageId,
    contentSource,
    fallbackUri,
    letter,
    primaryUri,
    round,
    serverConnection,
    style,
    wrapStyle,
}: {
    artworkImageId?: string;
    contentSource?: MobileMediaDetail['source'];
    fallbackUri?: string;
    letter: string;
    primaryUri?: string;
    round?: boolean;
    serverConnection?: ServerAuthenticationResult | null;
    style: StyleProp<ImageStyle>;
    wrapStyle?: StyleProp<ViewStyle>;
}) => {
    const uri = primaryUri ?? fallbackUri;
    const image = (
        <ArtworkImage
            artworkImageId={artworkImageId}
            contentSource={contentSource}
            fallbackStyle={round ? styles.detailArtworkFallback : styles.albumHeroArtworkFallback}
            letter={letter}
            serverConnection={serverConnection}
            style={style}
            uri={uri}
        />
    );
    return wrapStyle ? <View style={wrapStyle}>{image}</View> : image;
};

/**
 * The hero's circular download button. Owns the per-collection download
 * subscription and aggregate, so download progress ticks re-render THIS
 * button — not the whole detail surface.
 */
const DetailDownloadButton = memo(function DetailDownloadButton({
    detail,
    serverConnection,
}: {
    detail: MobileMediaDetail;
    serverConnection: ServerAuthenticationResult | null;
}) {
    const [isDownloadRequested, setIsDownloadRequested] = useState(false);
    const [collectionDownloads, setCollectionDownloads] = useState<DownloadEntry[]>([]);
    const collectionDownloadsSignatureRef = useRef('');

    useEffect(() => {
        setIsDownloadRequested(false);
    }, [detail.id, detail.source.id]);

    useEffect(() => {
        const unsubscribe = subscribeDownloads((entries) => {
            const nextDownloads = entries.filter(
                (entry) =>
                    entry.collection.sourceId === detail.source.id &&
                    entry.collection.id === detail.id,
            );
            const nextSignature = nextDownloads
                .map((entry) =>
                    [
                        entry.id,
                        entry.status,
                        entry.progress ?? '',
                        entry.bytesDownloaded ?? '',
                        entry.totalBytes ?? '',
                        entry.localUri ?? '',
                        entry.errorMessage ?? '',
                    ].join(':'),
                )
                .join('|');
            if (collectionDownloadsSignatureRef.current === nextSignature) {
                return;
            }
            collectionDownloadsSignatureRef.current = nextSignature;
            setCollectionDownloads(nextDownloads);
        });
        return () => {
            unsubscribe();
        };
    }, [detail.id, detail.source.id]);

    const expectedDownloadTrackIds = useMemo(() => {
        if (detail.type === MobileMediaDetailType.PODCAST) {
            return detail.tracks.map((track) => track.id);
        }
        if (
            detail.type === MobileMediaDetailType.ALBUM ||
            detail.type === MobileMediaDetailType.PLAYLIST
        ) {
            return detail.tracks
                .filter((track) => Boolean(track.playback?.url))
                .map((track) => track.id);
        }
        return [];
    }, [detail.tracks, detail.type]);

    const downloadAggregate = useMemo(() => {
        const emptyAggregate = { completed: false, progress: 0 };
        const startingProgress = 0.06;
        if (collectionDownloads.length === 0) {
            return isDownloadRequested
                ? { completed: false, progress: startingProgress }
                : emptyAggregate;
        }
        const latestByTrackId = new Map<string, DownloadEntry>();
        for (const entry of collectionDownloads) {
            const current = latestByTrackId.get(entry.trackId);
            if (!current || entry.enqueuedAt > current.enqueuedAt) {
                latestByTrackId.set(entry.trackId, entry);
            }
        }
        const getEntryProgress = (entry: DownloadEntry | undefined) => {
            if (!entry) return 0;
            if (entry.status === 'completed') return 1;
            if (entry.status === 'downloading') {
                return Math.max(entry.progress ?? 0, startingProgress);
            }
            if (entry.status === 'queued') return startingProgress;
            return 0;
        };
        if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
            const entries = [...latestByTrackId.values()];
            const completed =
                entries.length > 0 && entries.every((entry) => entry.status === 'completed');
            const hasActiveDownload = entries.some(
                (entry) => entry.status === 'queued' || entry.status === 'downloading',
            );
            const isActive = completed || hasActiveDownload || isDownloadRequested;
            const rawProgress =
                entries.reduce((sum, entry) => sum + getEntryProgress(entry), 0) /
                Math.max(entries.length, 1);
            return {
                completed,
                progress: isActive
                    ? Math.max(isDownloadRequested ? startingProgress : 0, rawProgress)
                    : 0,
            };
        }
        if (expectedDownloadTrackIds.length === 0) {
            return emptyAggregate;
        }
        const expectedEntries = expectedDownloadTrackIds.map((trackId) =>
            latestByTrackId.get(trackId),
        );
        const completed = expectedEntries.every((entry) => entry?.status === 'completed');
        const hasFullCollectionSet = expectedEntries.every(
            (entry) =>
                entry?.status === 'queued' ||
                entry?.status === 'downloading' ||
                entry?.status === 'completed',
        );
        const isActive = completed || hasFullCollectionSet || isDownloadRequested;
        if (!isActive) {
            return emptyAggregate;
        }
        const rawProgress =
            expectedEntries.reduce((sum, entry) => sum + getEntryProgress(entry), 0) /
            expectedDownloadTrackIds.length;
        return {
            completed,
            progress: Math.max(isDownloadRequested ? startingProgress : 0, rawProgress),
        };
    }, [collectionDownloads, detail.type, expectedDownloadTrackIds, isDownloadRequested]);

    const handleDownloadDetail = async () => {
        // Visual feedback comes from the circular download glyph and the
        // Downloads tab — no need for a popup on click.
        setIsDownloadRequested(true);
        const result = await enqueueCollectionDownload(detail, serverConnection);
        if (result.reason) {
            setIsDownloadRequested(false);
            Alert.alert('Download', result.reason);
        } else if (result.enqueued === 0 && result.skipped === 0) {
            setIsDownloadRequested(false);
        }
    };

    return (
        <Pressable
            accessibilityLabel={downloadAggregate.completed ? 'Downloaded' : 'Download'}
            accessibilityRole="button"
            onPress={() => void handleDownloadDetail()}
            style={styles.albumHeroGlyphButton}
        >
            <CircularDownloadGlyph
                completed={downloadAggregate.completed}
                progress={downloadAggregate.progress}
            />
        </Pressable>
    );
});

/**
 * The album/playlist/audiobook/podcast hero: artwork, eyebrow, title, meta
 * lines, and the action bar. Every callback prop is stable, so search
 * keystrokes / selection taps / scroll in the surrounding screen never
 * re-render the hero (and its ExpoImage stays put — no cover flash).
 */
export const MediaDetailHero = memo(function MediaDetailHero({
    canEditPlaylist,
    clock,
    detail,
    fallbackArtworkUrl,
    heroArtworkImageId,
    heroArtworkUrl,
    isAwaitingDetail,
    onEditPlaylist,
    onLayoutActionsBar,
    onPlayHero,
    onShuffleHero,
    onToggleSearch,
    searchToggleVisible,
    serverConnection,
    showPlayButton,
    showSearchToggle,
    showShuffle,
}: {
    canEditPlaylist: boolean;
    /** The page's entrance clock — the hero's parts read their own slices of
     *  it so the cover leads and the text/actions follow. */
    clock: SharedValue<number>;
    detail: MobileMediaDetail;
    fallbackArtworkUrl?: string;
    heroArtworkImageId?: string;
    heroArtworkUrl?: string;
    isAwaitingDetail: boolean;
    onEditPlaylist: () => void;
    onLayoutActionsBar: (event: LayoutChangeEvent) => void;
    onPlayHero: () => void;
    onShuffleHero: () => void;
    onToggleSearch: () => void;
    /** Mirrors the open state so the a11y label flips with the search. */
    searchToggleVisible: boolean;
    serverConnection: ServerAuthenticationResult | null;
    showPlayButton: boolean;
    showSearchToggle: boolean;
    showShuffle: boolean;
}) {
    const contextMenu = useMediaContextMenu();
    const isArtistDetail = detail.type === MobileMediaDetailType.ARTIST;
    const isAudiobook = detail.type === MobileMediaDetailType.AUDIOBOOK;
    // Download button shows for everything that has saveable media. Podcasts
    // here download every episode; long-press on a single episode row still
    // works to grab just that one. Hidden while awaiting the detail — there's
    // nothing concrete to download yet.
    const canDownloadDetail = !isArtistDetail && !isAwaitingDetail;
    // Playlists never get a collection-level format badge — they're mixed by
    // definition. Per-track badges on the track rows below still show.
    const heroBadgeProfile =
        detail.type === MobileMediaDetailType.PLAYLIST
            ? undefined
            : getDetailQualityProfile(detail);
    const heroFormatLabel =
        detail.type === MobileMediaDetailType.ALBUM ? formatQualityProfile(heroBadgeProfile) : null;

    const handleOpenDetailContextMenu = () => {
        const kind: Exclude<MediaContextMenuKind, 'song'> | null =
            detail.type === MobileMediaDetailType.ALBUM
                ? 'album'
                : detail.type === MobileMediaDetailType.PLAYLIST
                  ? 'playlist'
                  : detail.type === MobileMediaDetailType.AUDIOBOOK
                    ? 'audiobook'
                    : detail.type === MobileMediaDetailType.PODCAST
                      ? 'podcast'
                      : null;
        if (!kind) {
            return;
        }
        const homeType =
            kind === 'album'
                ? MobileHomeItemType.ALBUM
                : kind === 'playlist'
                  ? MobileHomeItemType.PLAYLIST
                  : kind === 'audiobook'
                    ? MobileHomeItemType.AUDIOBOOK
                    : MobileHomeItemType.PODCAST;
        const syntheticItem: MobileHomeItem = {
            artworkUrl: detail.artworkUrl,
            id: detail.id,
            isHiRes: detailHasHiRes(detail),
            source: detail.source,
            subtitle: detail.subtitle,
            title: detail.title,
            type: homeType,
        };
        contextMenu.openForItem(syntheticItem, {
            // The hero already shows a visible Download button; don't duplicate it here.
            suppressDownloadAction: true,
            suppressOpenAction: true,
        });
    };

    // Loading-state pieces for the unified detail shell. The hero artwork and
    // title render for real (we know them at tap time); only the chrome BELOW
    // the title renders as placeholders, so the hero ExpoImage's position in
    // the tree never changes and the cover persists into the loaded state.
    const heroSkeletonBadge = <SkeletonBlock borderRadius={4} style={{ height: 11, width: 64 }} />;
    const heroSkeletonMetaActions = (
        <>
            <View style={styles.albumHeroMeta}>
                <SkeletonBlock
                    borderRadius={4}
                    style={{ height: 13, marginBottom: 6, width: 150 }}
                />
                <SkeletonBlock borderRadius={4} style={{ height: 13, width: 104 }} />
            </View>
            <View style={styles.albumHeroActionsBar}>
                <View style={styles.albumHeroLeftActions}>
                    <SkeletonBlock borderRadius={999} style={styles.albumHeroGlyphButton} />
                    <SkeletonBlock borderRadius={999} style={styles.albumHeroGlyphButton} />
                </View>
                <View style={styles.albumHeroActions}>
                    <SkeletonBlock borderRadius={999} style={styles.albumHeroGlyphButton} />
                    <SkeletonBlock borderRadius={999} style={{ height: 52, width: 52 }} />
                </View>
            </View>
        </>
    );

    return (
        <View style={styles.albumHero}>
            {/* The cover is the mass: it leads, and travels least. */}
            <Choreographed clock={clock} stage="lead" style={styles.albumHeroStage}>
                <View style={styles.albumHeroArtworkWrap}>
                    <DetailHeroArtwork
                        artworkImageId={heroArtworkImageId}
                        contentSource={detail.source}
                        fallbackUri={fallbackArtworkUrl}
                        letter={detail.title.slice(0, 1)}
                        primaryUri={heroArtworkUrl}
                        serverConnection={serverConnection}
                        style={styles.albumHeroArtwork}
                    />
                </View>
            </Choreographed>
            {/* Type + title hang off the cover — later, and further. */}
            <Choreographed clock={clock} stage="follow" style={styles.albumHeroStage}>
                <View style={styles.albumHeroBadgeRow}>
                    {isAwaitingDetail ? (
                        heroSkeletonBadge
                    ) : isAudiobook ? null : (
                        <Text style={styles.albumHeroEyebrow}>
                            {getDetailTypeLabel(detail.type)}
                        </Text>
                    )}
                </View>
                <Text numberOfLines={2} style={styles.albumHeroTitle}>
                    {detail.title}
                </Text>
            </Choreographed>
            {isAwaitingDetail ? (
                heroSkeletonMetaActions
            ) : (
                <>
                    <Choreographed clock={clock} stage="follow" style={styles.albumHeroStage}>
                        {detail.year ? (
                            <Text style={styles.albumHeroYear}>{detail.year}</Text>
                        ) : null}
                    </Choreographed>
                    <Choreographed clock={clock} stage="follow" style={styles.albumHeroStage}>
                        <View style={styles.albumHeroMeta}>
                            {Array.from(
                                new Set(
                                    [
                                        detail.subtitle,
                                        ...(detail.metadataLines ?? []).filter(
                                            (line) => line !== detail.year?.toString(),
                                        ),
                                    ].filter((line): line is string => Boolean(line)),
                                ),
                            ).map((line, index) => (
                                <Text
                                    key={`${line}-${index}`}
                                    numberOfLines={1}
                                    style={styles.albumHeroMetaLine}
                                >
                                    {line}
                                </Text>
                            ))}
                            {heroFormatLabel ? (
                                <Text style={styles.formatBadgeMeta}>{heroFormatLabel}</Text>
                            ) : null}
                        </View>
                    </Choreographed>
                    {/* onLayout rides the WRAPPER: layout.y is parent-relative,
                        so measuring the inner bar here would report ~0 and peg
                        the collapsed-header trigger to its floor. */}
                    <Choreographed
                        clock={clock}
                        onLayout={onLayoutActionsBar}
                        stage="trail"
                        style={styles.albumHeroStage}
                    >
                        <View style={styles.albumHeroActionsBar}>
                            <View style={styles.albumHeroLeftActions}>
                                {canDownloadDetail ? (
                                    <DetailDownloadButton
                                        detail={detail}
                                        serverConnection={serverConnection}
                                    />
                                ) : null}
                                {canEditPlaylist ? (
                                    <Pressable
                                        accessibilityLabel="Edit playlist"
                                        accessibilityRole="button"
                                        onPress={onEditPlaylist}
                                        style={styles.albumHeroGlyphButton}
                                    >
                                        <GearGlyph color={colors.text} />
                                    </Pressable>
                                ) : null}
                                <Pressable
                                    accessibilityLabel="More options"
                                    accessibilityRole="button"
                                    onPress={handleOpenDetailContextMenu}
                                    style={styles.albumHeroGlyphButton}
                                >
                                    <MoreGlyph color={colors.text} />
                                </Pressable>
                            </View>
                            <View style={styles.albumHeroActions}>
                                {showSearchToggle ? (
                                    <Pressable
                                        accessibilityLabel={
                                            searchToggleVisible
                                                ? 'Close playlist search'
                                                : 'Search playlist'
                                        }
                                        accessibilityRole="button"
                                        hitSlop={8}
                                        onPress={onToggleSearch}
                                        style={styles.albumHeroGlyphButton}
                                    >
                                        <SearchGlyph color="rgba(245,245,245,0.55)" />
                                    </Pressable>
                                ) : null}
                                {showShuffle ? (
                                    <Pressable
                                        accessibilityLabel="Shuffle"
                                        accessibilityRole="button"
                                        onPress={onShuffleHero}
                                        style={styles.albumHeroGlyphButton}
                                    >
                                        <ShuffleGlyph color={colors.text} size={28} />
                                    </Pressable>
                                ) : null}
                                {showPlayButton ? (
                                    <Pressable
                                        accessibilityLabel="Play"
                                        accessibilityRole="button"
                                        onPress={onPlayHero}
                                        style={[
                                            styles.albumHeroGlyphButton,
                                            styles.albumHeroPlayButton,
                                        ]}
                                    >
                                        <PlayPauseGlyph
                                            color={colors.background}
                                            isPlaying={false}
                                            size={22}
                                        />
                                    </Pressable>
                                ) : null}
                            </View>
                        </View>
                    </Choreographed>
                </>
            )}
        </View>
    );
});

/**
 * The collapsing top bar (back, title, shuffle/play) that fades in as the
 * hero scrolls away. Shared by every detail layout; all styles arrive as
 * UI-thread animated styles so scrolling never re-renders it.
 */
export const MediaDetailCollapsedTopbar = memo(function MediaDetailCollapsedTopbar({
    backdropStyle,
    contentStyle,
    isInteractive,
    onBack,
    onPlay,
    onShuffle,
    showPlay,
    showShuffle,
    title,
}: {
    backdropStyle: ReturnType<typeof useAnimatedStyle>;
    contentStyle: ReturnType<typeof useAnimatedStyle>;
    isInteractive: boolean;
    onBack: () => void;
    onPlay: () => void;
    onShuffle: () => void;
    showPlay: boolean;
    showShuffle: boolean;
    title: string;
}) {
    return (
        <View pointerEvents="box-none" style={styles.detailCollapsedTopbar}>
            <Reanimated.View
                pointerEvents="none"
                style={[styles.detailCollapsedTopbarBackdrop, backdropStyle]}
            />
            {/* Controls live in their own row pinned under the status bar —
                the outer box spans the bar too (so the backdrop covers it),
                but nothing tappable may sit up there. */}
            <View pointerEvents="box-none" style={styles.detailCollapsedTopbarRow}>
                <Pressable
                    accessibilityLabel="Back"
                    accessibilityRole="button"
                    onPress={onBack}
                    style={styles.detailCollapsedBackButton}
                >
                    <Text style={styles.detailCollapsedBackGlyph}>‹</Text>
                </Pressable>
                <Reanimated.View
                    pointerEvents="none"
                    style={[styles.detailCollapsedTitleWrap, contentStyle]}
                >
                    <Text numberOfLines={1} style={styles.detailCollapsedTitle}>
                        {title}
                    </Text>
                </Reanimated.View>
                <Reanimated.View
                    pointerEvents={isInteractive ? 'auto' : 'none'}
                    style={[styles.detailCollapsedActions, contentStyle]}
                >
                    {showShuffle ? (
                        <Pressable
                            accessibilityLabel="Shuffle"
                            accessibilityRole="button"
                            hitSlop={10}
                            onPress={onShuffle}
                            style={styles.detailCollapsedIconButton}
                        >
                            <ShuffleGlyph color={colors.text} size={20} />
                        </Pressable>
                    ) : null}
                    {showPlay ? (
                        <Pressable
                            accessibilityLabel="Play"
                            accessibilityRole="button"
                            onPress={onPlay}
                            style={styles.detailCollapsedPlayButton}
                        >
                            <PlayPauseGlyph color={colors.background} isPlaying={false} size={16} />
                        </Pressable>
                    ) : null}
                </Reanimated.View>
            </View>
        </View>
    );
});
