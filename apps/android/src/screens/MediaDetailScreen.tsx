import { buildAudioQualityBadgeItems } from '@samo/core/audio-quality';
import {
    getDetailQualityProfile,
    getItemQualityProfile,
    getPlaybackQualityProfile,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { FlashList } from '@shopify/flash-list';
import Reanimated, {
    interpolate,
    runOnJS,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import {
    Fragment,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    type ImageStyle,
    type LayoutChangeEvent,
    Pressable,
    ScrollView,
    type StyleProp,
    Text,
    TextInput,
    View,
    type ViewStyle,
} from 'react-native';

import { ArtworkImage } from '../components/ArtworkImage';
import { PlaylistTrackControls } from '../components/PlaylistTrackControls';
import { QualityBadge } from '../components/QualityBadge';
import {
    CheckGlyph,
    CircularDownloadGlyph,
    ClearGlyph,
    DiscGlyph,
    DownloadGlyph,
    EllipsisVerticalGlyph,
    HeartGlyph,
    MoreGlyph,
    PlayPauseGlyph,
    SearchGlyph,
    ShuffleGlyph,
    TrackDownloadedGlyph,
} from '../components/Glyphs';
import { TrackPlaylistMenu } from '../components/TrackPlaylistMenu';
import { type MediaContextMenuKind } from '../contexts/media-context-menu';
import { type HomeDisplaySection } from '../types/home';
import {
    useDownloadedCollectionKeys,
    useDownloadedTrackKeys,
} from '../contexts/downloaded-keys';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import {
    type DownloadEntry,
    enqueueCollectionDownload,
    subscribeDownloads,
} from '../services/download-manager';
import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidMediaDetailState } from '../services/media-detail';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { triggerImpact, triggerSelection } from '../services/haptics';
import { formatQualityProfile } from '../services/quality-badge-assets';
import { SCREEN_HEIGHT } from '../theme/layout';
import { styles } from '../theme/styles';
import { colors, spacing } from '../theme/tokens';
import { getContentItemKey } from '../utils/content-item';
import {
    getDownloadedCollectionKey,
    getDownloadedTrackKey,
} from '../utils/download-keys';
import {
    getDetailTypeLabel,
    getPlaylistTargetsForDetail,
    getPlaylistTrackItemType,
    getPlaylistTrackSearchText,
    PLAYLIST_TRACK_DRAW_DISTANCE,
    type PlaylistTrackFilter,
    type PlaylistTrackSort,
} from '../utils/media-detail';
import { getDisplaySubtitle } from '../utils/playback-time';
import { getTrackMetadataItems } from '../player/track-metadata';
import { detailHasHiRes, isHiFiTrack } from '../utils/media-quality';

const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;
const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

const MediaDetailLoadingView = ({
    artworkUrl,
    itemType,
    title,
}: {
    artworkUrl?: string;
    itemType?: MobileHomeItem['type'];
    title: string;
}) => {
    const isArtist = itemType === MobileHomeItemType.ARTIST;
    const artLoadedAtRef = useRef<number | null>(null);

    return (
        <View style={styles.mediaDetailScreen}>
            <View style={[styles.mediaDetailContent, styles.content]}>
                {artworkUrl ? (
                    isArtist ? (
                        <View style={styles.detailHero}>
                            <ArtworkImage
                                fallbackStyle={styles.detailArtworkFallback}
                                letter={title.slice(0, 1)}
                                onLoad={() => {
                                    if (artLoadedAtRef.current !== null) {
                                        return;
                                    }
                                    artLoadedAtRef.current = Date.now();
                                    // #region agent log
                                    const payload = {
                                        sessionId: 'c0ca1a',
                                        runId: 'nav-perf',
                                        hypothesisId: 'H13',
                                        location: 'MediaDetailScreen.tsx:MediaDetailLoadingView',
                                        message: 'loading hero artwork decoded',
                                        data: { itemType, isArtist: true },
                                        timestamp: artLoadedAtRef.current,
                                    };
                                    console.log('[nav-perf]', JSON.stringify(payload));
                                    fetch(
                                        'http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2',
                                        {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-Debug-Session-Id': 'c0ca1a',
                                            },
                                            body: JSON.stringify(payload),
                                        },
                                    ).catch(() => {});
                                    // #endregion
                                }}
                                style={[styles.detailArtwork, styles.detailArtworkRound]}
                                uri={artworkUrl}
                            />
                            <View style={styles.detailHeroText}>
                                <Text style={styles.detailTitle}>{title}</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.albumHero}>
                            <View style={styles.albumHeroArtworkWrap}>
                                <ArtworkImage
                                    fallbackStyle={styles.albumHeroArtworkFallback}
                                    letter={title.slice(0, 1)}
                                    style={styles.albumHeroArtwork}
                                    uri={artworkUrl}
                                />
                            </View>
                            <Text numberOfLines={2} style={styles.albumHeroTitle}>
                                {title}
                            </Text>
                        </View>
                    )
                ) : (
                    <Text style={styles.sectionTitle}>{title}</Text>
                )}
                <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
            </View>
        </View>
    );
};

export const MediaDetailContent = memo(({
    homeContentState,
    mediaDetailState,
    onAddTrackToPlaylist,
    onBack,
    onPlayTrack,
    onSelectItem,
    onShufflePlay,
    serverConnections,
}: {
    homeContentState: AndroidHomeContentState;
    mediaDetailState: AndroidMediaDetailState;
    onAddTrackToPlaylist: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        playlist: MobileHomeItem,
    ) => Promise<void>;
    onBack: () => void;
    onPlayTrack: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        index: number,
        queueTracks?: MobileMediaTrack[],
    ) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onShufflePlay: (detail: MobileMediaDetail, tracks?: MobileMediaTrack[]) => void;
    serverConnections: ServerAuthenticationResult[];
}) => {
    const openingArtworkUrlRef = useRef<string | undefined>(undefined);
    const title =
        mediaDetailState.status === 'loaded'
            ? mediaDetailState.detail.title
            : mediaDetailState.status === 'idle'
              ? 'Media'
              : mediaDetailState.itemTitle;

    if (mediaDetailState.status === 'loading') {
        openingArtworkUrlRef.current = mediaDetailState.itemArtworkUrl;
    }

    return (
        <>
            {mediaDetailState.status === 'loading' ? (
                <MediaDetailLoadingView
                    artworkUrl={mediaDetailState.itemArtworkUrl}
                    itemType={mediaDetailState.itemType}
                    title={title}
                />
            ) : mediaDetailState.status === 'error' ? (
                <View style={[styles.mediaDetailScreen, styles.content]}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <Text style={styles.errorText}>{mediaDetailState.message}</Text>
                </View>
            ) : mediaDetailState.status === 'loaded' ? (
                <MediaDetailLoaded
                    detail={mediaDetailState.detail}
                    fallbackArtworkUrl={openingArtworkUrlRef.current}
                    onAddTrackToPlaylist={onAddTrackToPlaylist}
                    onBack={onBack}
                    onPlayTrack={onPlayTrack}
                    onSelectItem={onSelectItem}
                    onShufflePlay={onShufflePlay}
                    playlistTargets={getPlaylistTargetsForDetail(
                        homeContentState,
                        mediaDetailState.detail,
                    )}
                    serverConnections={serverConnections}
                />
            ) : null}
        </>
    );
});

MediaDetailContent.displayName = 'MediaDetailContent';

const DetailHeroArtwork = ({
    fallbackUri,
    letter,
    primaryUri,
    round,
    style,
    wrapStyle,
}: {
    fallbackUri?: string;
    letter: string;
    primaryUri?: string;
    round?: boolean;
    style: StyleProp<ImageStyle>;
    wrapStyle?: StyleProp<ViewStyle>;
}) => {
    const uri = primaryUri ?? fallbackUri;
    const image = (
        <ArtworkImage
            fallbackStyle={round ? styles.detailArtworkFallback : styles.albumHeroArtworkFallback}
            letter={letter}
            style={style}
            uri={uri}
        />
    );
    return wrapStyle ? <View style={wrapStyle}>{image}</View> : image;
};

export const MediaDetailLoaded = ({
    detail,
    fallbackArtworkUrl,
    onAddTrackToPlaylist,
    onBack,
    onPlayTrack,
    onSelectItem,
    onShufflePlay,
    playlistTargets,
    serverConnections,
}: {
    detail: MobileMediaDetail;
    fallbackArtworkUrl?: string;
    onAddTrackToPlaylist: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        playlist: MobileHomeItem,
    ) => Promise<void>;
    onBack: () => void;
    onPlayTrack: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        index: number,
        queueTracks?: MobileMediaTrack[],
    ) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onShufflePlay: (detail: MobileMediaDetail, tracks?: MobileMediaTrack[]) => void;
    playlistTargets: MobileHomeItem[];
    serverConnections: ServerAuthenticationResult[];
}) => {
    const [playlistMenuTrack, setPlaylistMenuTrack] = useState<MobileMediaTrack | null>(null);
    const [playlistActionState, setPlaylistActionState] = useState<
        | { status: 'error'; message: string }
        | { playlistId: string; status: 'loading' }
        | { message: string; status: 'success' }
        | { status: 'idle' }
    >({ status: 'idle' });
    const [isDetailDownloadRequested, setIsDetailDownloadRequested] = useState(false);
    // Playlist-only filter + sort. Playlists are mixed format and mixed
    // artists by definition, so being able to scope to Hi-Fi only or
    // re-sort by title/artist is the user-facing affordance the user
    // asked for. Album tracks keep their server order untouched.
    const [playlistFilter, setPlaylistFilter] = useState<'all' | 'hifi'>('all');
    const [playlistSort, setPlaylistSort] = useState<'artist' | 'order' | 'title'>('order');
    const [playlistSortAsc, setPlaylistSortAsc] = useState(true);
    const [playlistSearchVisible, setPlaylistSearchVisible] = useState(false);
    const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
    const playlistSearchInputRef = useRef<TextInput>(null);
    // Height/opacity track linearly so the track list below slides predictably;
    // the search bar rises into place so it stays visually above the keyboard
    // instead of dropping toward it.
    const playlistSearchLayoutProgress = useSharedValue(0);
    const playlistSearchBubbleProgress = useSharedValue(0);
    const playlistSearchAnimatedStyle = useAnimatedStyle(() => ({
        height: interpolate(playlistSearchLayoutProgress.value, [0, 1], [0, 70]),
        opacity: interpolate(playlistSearchLayoutProgress.value, [0, 0.5, 1], [0, 1, 1]),
        transform: [
            {
                translateY: interpolate(
                    playlistSearchBubbleProgress.value,
                    [0, 1],
                    [32, 0],
                ),
            },
            { scale: playlistSearchBubbleProgress.value },
        ],
        transformOrigin: ['65%', '100%', 0],
    }));
    const firstTrack = detail.tracks[0];
    const contextMenu = useMediaContextMenu();
    const downloadedTrackKeys = useDownloadedTrackKeys();
    const isMusic = detail.type === MobileMediaDetailType.ALBUM || detail.type === MobileMediaDetailType.PLAYLIST;
    const isPlaylistDetail = detail.type === MobileMediaDetailType.PLAYLIST;
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
    useEffect(() => {
        if (!playlistSearchVisible) return;
        const id = setTimeout(() => playlistSearchInputRef.current?.focus(), 80);
        return () => clearTimeout(id);
    }, [playlistSearchVisible]);
    useEffect(() => {
        if (playlistSearchVisible) {
            playlistSearchLayoutProgress.value = withTiming(1, { duration: 200 });
            playlistSearchBubbleProgress.value = withSpring(1, {
                damping: 12,
                mass: 0.55,
                stiffness: 180,
            });
        } else {
            playlistSearchBubbleProgress.value = withTiming(0, { duration: 160 });
            playlistSearchLayoutProgress.value = withTiming(0, { duration: 200 });
        }
    }, [playlistSearchBubbleProgress, playlistSearchLayoutProgress, playlistSearchVisible]);

    /**
     * Track list after the playlist's filter + sort controls are applied.
     * For non-playlists we return the original tracks untouched — albums
     * already ship in their authored order and shouldn't be reshuffleable
     * from this surface.
     */
    const displayTracks = useMemo(() => {
        if (!isPlaylistDetail) return detail.tracks;
        const playlistSearchNeedle = playlistSearchQuery.trim().toLocaleLowerCase();
        let filtered =
            playlistFilter === 'hifi'
                ? detail.tracks.filter(isHiFiTrack)
                : detail.tracks;
        if (playlistSearchNeedle) {
            filtered = filtered.filter((track) =>
                getPlaylistTrackSearchText(track).includes(playlistSearchNeedle),
            );
        }
        if (playlistSort === 'order') {
            // "Order Added" descending = newest at top, which for Subsonic
            // playlists is whatever order the entries arrived in. Ascending
            // flips that — playlist start at the bottom.
            return playlistSortAsc ? filtered : [...filtered].reverse();
        }
        const sorted = [...filtered].sort((left, right) => {
            const leftKey =
                playlistSort === 'artist' ? left.artist ?? '' : left.title ?? '';
            const rightKey =
                playlistSort === 'artist' ? right.artist ?? '' : right.title ?? '';
            return leftKey.localeCompare(rightKey, undefined, { sensitivity: 'base' });
        });
        return playlistSortAsc ? sorted : sorted.reverse();
    }, [
        detail.tracks,
        isPlaylistDetail,
        playlistFilter,
        playlistSearchQuery,
        playlistSort,
        playlistSortAsc,
    ]);
    const playableDisplayTracks = useMemo(
        () => displayTracks.filter((track) => track.playback),
        [displayTracks],
    );
    const firstPlayableDisplayTrack = playableDisplayTracks[0];
    const firstPlayableDisplayIndex = firstPlayableDisplayTrack
        ? displayTracks.indexOf(firstPlayableDisplayTrack)
        : -1;
    const heroPlayTrack = isPlaylistDetail ? firstPlayableDisplayTrack : firstTrack;
    const heroPlayIndex = isPlaylistDetail ? firstPlayableDisplayIndex : 0;
    const heroPlayQueue = isPlaylistDetail ? displayTracks : undefined;
    const canPlayDetail = Boolean(heroPlayTrack);
    const showPlaylistShuffle = isPlaylistDetail && playableDisplayTracks.length > 0;
    const showAlbumDiscHeaders =
        detail.type === MobileMediaDetailType.ALBUM &&
        new Set(displayTracks.map((track) => track.discNumber ?? 1)).size > 1;
    const detailScrollY = useSharedValue(0);
    const detailScrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            detailScrollY.value = event.contentOffset.y;
        },
    });
    const [collapsedHeaderTriggerY, setCollapsedHeaderTriggerY] = useState(220);
    const [isCollapsedHeaderInteractive, setIsCollapsedHeaderInteractive] = useState(false);
    const collapsedHeaderRevealStartY = Math.max(0, collapsedHeaderTriggerY - 28);
    const collapsedHeaderRevealEndY = collapsedHeaderTriggerY + 12;
    const handleHeroActionsBarLayout = useCallback((event: LayoutChangeEvent) => {
        const nextTriggerY = Math.max(180, event.nativeEvent.layout.y + spacing.lg);

        setCollapsedHeaderTriggerY((current) =>
            Math.abs(current - nextTriggerY) < 1 ? current : nextTriggerY,
        );
    }, []);
    useAnimatedReaction(
        () => detailScrollY.value >= collapsedHeaderRevealStartY,
        (isVisible, wasVisible) => {
            if (isVisible !== wasVisible) {
                runOnJS(setIsCollapsedHeaderInteractive)(isVisible);
            }
        },
    );
    const collapsedHeaderBackdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            detailScrollY.value,
            [collapsedHeaderRevealStartY, collapsedHeaderRevealEndY],
            [0, 1],
            'clamp',
        ),
    }));
    const collapsedHeaderContentStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            detailScrollY.value,
            [collapsedHeaderRevealStartY, collapsedHeaderRevealEndY],
            [0, 1],
            'clamp',
        ),
        transform: [
            {
                translateY: interpolate(
                    detailScrollY.value,
                    [collapsedHeaderRevealStartY, collapsedHeaderRevealEndY],
                    [8, 0],
                    'clamp',
                ),
            },
        ],
    }));

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
    const artistAlbumSections: HomeDisplaySection[] =
        detail.type === MobileMediaDetailType.ARTIST && detail.items && detail.items.length > 0
            ? [
                  {
                      items: detail.items,
                      key: `artist-${detail.id}-albums`,
                      title: sectionTitle,
                      variant: 'album',
                  },
              ]
            : [];
    const handleAddToPlaylist = async (playlist: MobileHomeItem) => {
        if (!playlistMenuTrack) {
            return;
        }

        setPlaylistActionState({ playlistId: playlist.id, status: 'loading' });

        try {
            await onAddTrackToPlaylist(detail, playlistMenuTrack, playlist);
            setPlaylistActionState({
                message: `Added to ${playlist.title}`,
                status: 'success',
            });
        } catch (error) {
            setPlaylistActionState({
                message: error instanceof Error ? error.message : 'Failed to add to playlist',
                status: 'error',
            });
        }
    };
    const openPlaylistMenu = (track: MobileMediaTrack) => {
        setPlaylistActionState({ status: 'idle' });
        setPlaylistMenuTrack(track);
    };

    const isArtistDetail = detail.type === MobileMediaDetailType.ARTIST;
    const showDetailHiRes = detailHasHiRes(detail);
    // Playlists never get a collection-level format badge — they're mixed by
    // definition. Per-track badges on the track rows below still show.
    const heroBadgeProfile =
        detail.type === MobileMediaDetailType.PLAYLIST
            ? undefined
            : getDetailQualityProfile(detail);
    const heroFormatLabel =
        detail.type === MobileMediaDetailType.ALBUM
            ? formatQualityProfile(heroBadgeProfile)
            : null;
    // Download button shows for everything that has saveable media. Podcasts
    // here download every episode; long-press on a single episode row still
    // works to grab just that one.
    const canDownloadDetail = !isArtistDetail;

    // Subscribe to downloads for this specific collection so the hero can
    // switch to the completed state once every item in the collection is saved.
    const [collectionDownloads, setCollectionDownloads] = useState<DownloadEntry[]>([]);
    const collectionDownloadsSignatureRef = useRef('');
    useEffect(() => {
        setIsDetailDownloadRequested(false);
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
            return isDetailDownloadRequested
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
            const isActive = completed || hasActiveDownload || isDetailDownloadRequested;
            const rawProgress =
                entries.reduce((sum, entry) => sum + getEntryProgress(entry), 0) /
                Math.max(entries.length, 1);
            return {
                completed,
                progress: isActive
                    ? Math.max(isDetailDownloadRequested ? startingProgress : 0, rawProgress)
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
        const isActive = completed || hasFullCollectionSet || isDetailDownloadRequested;
        if (!isActive) {
            return emptyAggregate;
        }
        const rawProgress =
            expectedEntries.reduce((sum, entry) => sum + getEntryProgress(entry), 0) /
            expectedDownloadTrackIds.length;
        return {
            completed,
            progress: Math.max(isDetailDownloadRequested ? startingProgress : 0, rawProgress),
        };
    }, [
        collectionDownloads,
        detail.type,
        expectedDownloadTrackIds,
        isDetailDownloadRequested,
    ]);

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
            isHiRes: showDetailHiRes,
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

    const handleDownloadDetail = async () => {
        // Visual feedback comes from the circular download glyph and the
        // Downloads tab — no need for a popup on click.
        setIsDetailDownloadRequested(true);
        const result = await enqueueCollectionDownload(detail, serverConnections);
        if (result.reason) {
            setIsDetailDownloadRequested(false);
            Alert.alert('Download', result.reason);
        } else if (result.enqueued === 0 && result.skipped === 0) {
            setIsDetailDownloadRequested(false);
        }
    };

    const renderTrackRow = useCallback(
        (track: MobileMediaTrack, index: number) => {
            const qualityItems =
                isMusic && track.playback
                    ? buildAudioQualityBadgeItems({
                          ...track.playback.quality,
                          compact: true,
                          mode: 'playerbar',
                      })
                    : [];
            const meta = getTrackMetadataItems(
                detail,
                track,
                qualityItems.map((item) => item.label),
                isMusic,
            );
            const canAddToPlaylist =
                track.playback?.source === 'music' && playlistTargets.length > 0;
            const hasOverflowActions =
                canAddToPlaylist || track.playback?.source === 'music';
            const isAlbumDetail = detail.type === MobileMediaDetailType.ALBUM;
            const trackBadgeProfile =
                detail.type === MobileMediaDetailType.PLAYLIST
                    ? getPlaybackQualityProfile(track.playback)
                    : undefined;
            const isDownloadedTrack = downloadedTrackKeys.has(
                getDownloadedTrackKey(detail.source.id, track.id),
            );

            return (
                <Pressable
                    accessibilityRole="button"
                    onLongPress={() => contextMenu.openForTrack(track, detail)}
                    onPress={() => onPlayTrack(detail, track, index, displayTracks)}
                    style={styles.trackRow}
                >
                    {isAlbumDetail ? (
                        <View style={styles.albumTrackNumber}>
                            <Text style={styles.albumTrackNumberText}>
                                {track.trackNumber ?? index + 1}
                            </Text>
                        </View>
                    ) : null}
                    {!isAlbumDetail ? (
                        <View>
                            {track.artworkUrl ?? detail.artworkUrl ?? fallbackArtworkUrl ? (
                                <ArtworkImage
                                    letter={track.title.slice(0, 1).toUpperCase()}
                                    style={styles.trackArtwork}
                                    uri={track.artworkUrl ?? detail.artworkUrl ?? fallbackArtworkUrl}
                                />
                            ) : (
                                <View style={styles.trackArtworkFallback}>
                                    <Text style={styles.trackArtworkLetter}>
                                        {track.title.slice(0, 1).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <QualityBadge thumb profile={trackBadgeProfile} />
                        </View>
                    ) : null}
                    <View style={styles.trackText}>
                        <Text numberOfLines={1} style={styles.trackTitle}>
                            {track.title}
                        </Text>
                        {meta.length > 0 || isDownloadedTrack ? (
                            <View style={styles.trackMetadataLine}>
                                {isDownloadedTrack ? <TrackDownloadedGlyph size={10} /> : null}
                                {meta.length > 0 ? (
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.mediaSubtitle,
                                            styles.trackMetadataText,
                                        ]}
                                    >
                                        {meta.join(' · ')}
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                    {hasOverflowActions ? (
                        <Pressable
                            accessibilityLabel={`More options for ${track.title}`}
                            accessibilityRole="button"
                            onPress={(event) => {
                                event.stopPropagation();
                                contextMenu.openForTrack(track, detail);
                            }}
                            style={styles.trackMenuButton}
                        >
                            <MoreGlyph color={colors.muted} />
                        </Pressable>
                    ) : null}
                </Pressable>
            );
        },
        [
            contextMenu,
            detail,
            displayTracks,
            downloadedTrackKeys,
            fallbackArtworkUrl,
            isMusic,
            onPlayTrack,
            playlistTargets.length,
        ],
    );

    const renderListTrackItem = useCallback(
        ({ index, item: track }: { index: number; item: MobileMediaTrack }) => {
            const discNumber = track.discNumber ?? 1;
            const previousDiscNumber =
                index > 0 ? (displayTracks[index - 1]?.discNumber ?? 1) : null;
            const shouldShowDiscHeader =
                showAlbumDiscHeaders &&
                (index === 0 || previousDiscNumber !== discNumber);

            return (
                <>
                    {shouldShowDiscHeader ? (
                        <View style={styles.albumDiscHeader}>
                            <Text style={styles.albumDiscHeaderText}>Disc {discNumber}</Text>
                        </View>
                    ) : null}
                    {renderTrackRow(track, index)}
                </>
            );
        },
        [displayTracks, renderTrackRow, showAlbumDiscHeaders],
    );

    const playlistEmptyText =
        detail.tracks.length === 0
            ? emptyText
            : playlistSearchQuery.trim()
              ? 'No tracks match this search.'
              : 'No tracks match the current filter.';

    if (isPlaylistDetail) {
        return (
            <View style={styles.mediaDetailScreen}>
                <ReanimatedFlashList
                    contentContainerStyle={styles.mediaDetailContent}
                    data={displayTracks}
                    drawDistance={PLAYLIST_TRACK_DRAW_DISTANCE}
                    extraData={downloadedTrackKeys}
                    getItemType={getPlaylistTrackItemType}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(track, index) => `${track.id}:${index}`}
                    ListEmptyComponent={
                        <Text style={styles.playlistListEmpty}>{playlistEmptyText}</Text>
                    }
                    ListHeaderComponent={
                        <>
                            <View style={styles.albumHero}>
                                <View style={styles.albumHeroArtworkWrap}>
                                    <DetailHeroArtwork
                                        fallbackUri={fallbackArtworkUrl}
                                        letter={detail.title.slice(0, 1)}
                                        primaryUri={detail.artworkUrl}
                                        style={styles.albumHeroArtwork}
                                    />
                                    <QualityBadge overlay profile={heroBadgeProfile} />
                                </View>
                                <View style={styles.albumHeroBadgeRow}>
                                    <Text style={styles.albumHeroEyebrow}>
                                        {getDetailTypeLabel(detail.type)}
                                    </Text>
                                </View>
                                <Text numberOfLines={2} style={styles.albumHeroTitle}>
                                    {detail.title}
                                </Text>
                                <View style={styles.albumHeroMeta}>
                                    <Reanimated.View
                                        pointerEvents={playlistSearchVisible ? 'auto' : 'none'}
                                        style={[
                                            styles.playlistSearchAnimatedWrapper,
                                            styles.playlistHeroSearchWrapper,
                                            playlistSearchAnimatedStyle,
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.inlineSearchBar,
                                                styles.playlistHeroSearchBar,
                                            ]}
                                        >
                                            <SearchGlyph color={colors.muted} />
                                            <TextInput
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                onChangeText={setPlaylistSearchQuery}
                                                placeholder="Search this playlist"
                                                placeholderTextColor={colors.muted}
                                                ref={playlistSearchInputRef}
                                                returnKeyType="search"
                                                style={styles.inlineSearchInput}
                                                value={playlistSearchQuery}
                                            />
                                            {playlistSearchQuery.length > 0 ? (
                                                <Pressable
                                                    accessibilityLabel="Clear playlist search"
                                                    accessibilityRole="button"
                                                    onPress={() => setPlaylistSearchQuery('')}
                                                    style={styles.inlineSearchIconButton}
                                                >
                                                    <ClearGlyph color={colors.muted} />
                                                </Pressable>
                                            ) : null}
                                        </View>
                                    </Reanimated.View>
                                    {!playlistSearchVisible ? (
                                        <>
                                            {(detail.metadataLines && detail.metadataLines.length > 0
                                                ? detail.metadataLines
                                                : detail.subtitle
                                                  ? [detail.subtitle]
                                                  : []
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
                                        </>
                                    ) : null}
                                </View>
                                <View
                                    onLayout={handleHeroActionsBarLayout}
                                    style={styles.albumHeroActionsBar}
                                >
                                    <View style={styles.albumHeroLeftActions}>
                                        {canDownloadDetail ? (
                                            <Pressable
                                                accessibilityLabel={
                                                    downloadAggregate.completed
                                                        ? 'Downloaded'
                                                        : 'Download'
                                                }
                                                accessibilityRole="button"
                                                onPress={handleDownloadDetail}
                                                style={styles.albumHeroGlyphButton}
                                            >
                                                <CircularDownloadGlyph
                                                    completed={downloadAggregate.completed}
                                                    progress={downloadAggregate.progress}
                                                />
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
                                        {detail.tracks.length > 0 ? (
                                            <Pressable
                                                accessibilityLabel={
                                                    playlistSearchVisible
                                                        ? 'Close playlist search'
                                                        : 'Search playlist'
                                                }
                                                accessibilityRole="button"
                                                hitSlop={8}
                                                onPress={() => {
                                                    if (playlistSearchVisible) {
                                                        setPlaylistSearchQuery('');
                                                        setPlaylistSearchVisible(false);
                                                        return;
                                                    }
                                                    setPlaylistSearchVisible(true);
                                                }}
                                                style={styles.albumHeroGlyphButton}
                                            >
                                                <SearchGlyph color="rgba(245,245,245,0.55)" />
                                            </Pressable>
                                        ) : null}
                                        {showPlaylistShuffle ? (
                                            <Pressable
                                                accessibilityLabel="Shuffle"
                                                accessibilityRole="button"
                                                onPress={() => void onShufflePlay(detail, displayTracks)}
                                                style={styles.albumHeroGlyphButton}
                                            >
                                                <ShuffleGlyph color={colors.text} size={28} />
                                            </Pressable>
                                        ) : null}
                                        {heroPlayTrack ? (
                                            <Pressable
                                                accessibilityLabel="Play"
                                                accessibilityRole="button"
                                                onPress={() =>
                                                    onPlayTrack(
                                                        detail,
                                                        heroPlayTrack,
                                                        heroPlayIndex,
                                                        heroPlayQueue,
                                                    )
                                                }
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
                            </View>
                            <View style={styles.homeSection}>
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
                    onScroll={detailScrollHandler}
                    renderItem={({ item, index }) => renderTrackRow(item, index)}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                />
                <View pointerEvents="box-none" style={styles.detailCollapsedTopbar}>
                    <Reanimated.View
                        pointerEvents="none"
                        style={[
                            styles.detailCollapsedTopbarBackdrop,
                            collapsedHeaderBackdropStyle,
                        ]}
                    />
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
                        style={[
                            styles.detailCollapsedTitleWrap,
                            collapsedHeaderContentStyle,
                        ]}
                    >
                        <Text numberOfLines={1} style={styles.detailCollapsedTitle}>
                            {detail.title}
                        </Text>
                    </Reanimated.View>
                    <Reanimated.View
                        pointerEvents={isCollapsedHeaderInteractive ? 'auto' : 'none'}
                        style={[styles.detailCollapsedActions, collapsedHeaderContentStyle]}
                    >
                        {showPlaylistShuffle ? (
                            <Pressable
                                accessibilityLabel="Shuffle"
                                accessibilityRole="button"
                                hitSlop={10}
                                onPress={() => void onShufflePlay(detail, displayTracks)}
                                style={styles.detailCollapsedIconButton}
                            >
                                <ShuffleGlyph color={colors.text} size={20} />
                            </Pressable>
                        ) : null}
                        {canPlayDetail && heroPlayTrack ? (
                            <Pressable
                                accessibilityLabel="Play"
                                accessibilityRole="button"
                                onPress={() =>
                                    onPlayTrack(
                                        detail,
                                        heroPlayTrack,
                                        heroPlayIndex,
                                        heroPlayQueue,
                                    )
                                }
                                style={styles.detailCollapsedPlayButton}
                            >
                                <PlayPauseGlyph
                                    color={colors.background}
                                    isPlaying={false}
                                    size={16}
                                />
                            </Pressable>
                        ) : null}
                    </Reanimated.View>
                </View>
                <TrackPlaylistMenu
                    actionState={playlistActionState}
                    onAddToPlaylist={(playlist) => void handleAddToPlaylist(playlist)}
                    onClose={() => {
                        setPlaylistMenuTrack(null);
                        setPlaylistActionState({ status: 'idle' });
                    }}
                    playlists={playlistTargets}
                    track={playlistMenuTrack}
                />
            </View>
        );
    }

    const albumDetailListHeader = (
        <>
            <View style={styles.albumHero}>
                    <View style={styles.albumHeroArtworkWrap}>
                        <DetailHeroArtwork
                            fallbackUri={fallbackArtworkUrl}
                            letter={detail.title.slice(0, 1)}
                            primaryUri={detail.artworkUrl}
                            style={styles.albumHeroArtwork}
                        />
                        <QualityBadge overlay profile={heroBadgeProfile} />
                    </View>
                    <View style={styles.albumHeroBadgeRow}>
                        {detail.type === MobileMediaDetailType.AUDIOBOOK ? null : (
                            <Text style={styles.albumHeroEyebrow}>
                                {getDetailTypeLabel(detail.type)}
                            </Text>
                        )}
                    </View>
                    <Text numberOfLines={2} style={styles.albumHeroTitle}>
                        {detail.title}
                    </Text>
                    <View style={styles.albumHeroMeta}>
                        {(detail.metadataLines && detail.metadataLines.length > 0
                            ? detail.metadataLines
                            : detail.subtitle
                              ? [detail.subtitle]
                              : []
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
                    <View
                        onLayout={handleHeroActionsBarLayout}
                        style={styles.albumHeroActionsBar}
                    >
                        <View style={styles.albumHeroLeftActions}>
                            {canDownloadDetail ? (
                                <Pressable
                                    accessibilityLabel={
                                        downloadAggregate.completed
                                            ? 'Downloaded'
                                            : 'Download'
                                    }
                                    accessibilityRole="button"
                                    onPress={handleDownloadDetail}
                                    style={styles.albumHeroGlyphButton}
                                >
                                    <CircularDownloadGlyph
                                        completed={downloadAggregate.completed}
                                        progress={downloadAggregate.progress}
                                    />
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
                            {showPlaylistShuffle ? (
                                <Pressable
                                    accessibilityLabel="Shuffle"
                                    accessibilityRole="button"
                                    onPress={() => void onShufflePlay(detail, displayTracks)}
                                    style={styles.albumHeroGlyphButton}
                                >
                                    <ShuffleGlyph color={colors.text} size={28} />
                                </Pressable>
                            ) : null}
                            {heroPlayTrack ? (
                                <Pressable
                                    accessibilityLabel="Play"
                                    accessibilityRole="button"
                                    onPress={() =>
                                        onPlayTrack(detail, heroPlayTrack, heroPlayIndex, heroPlayQueue)
                                    }
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
                </View>
            <View style={styles.homeSection}>
                {!isMusic ? <Text style={styles.sectionTitle}>{sectionTitle}</Text> : null}
            </View>
        </>
    );

    const detailCollapsedTopbar = (
        <View pointerEvents="box-none" style={styles.detailCollapsedTopbar}>
            <Reanimated.View
                pointerEvents="none"
                style={[styles.detailCollapsedTopbarBackdrop, collapsedHeaderBackdropStyle]}
            />
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
                style={[styles.detailCollapsedTitleWrap, collapsedHeaderContentStyle]}
            >
                <Text numberOfLines={1} style={styles.detailCollapsedTitle}>
                    {detail.title}
                </Text>
            </Reanimated.View>
            <Reanimated.View
                pointerEvents={isCollapsedHeaderInteractive ? 'auto' : 'none'}
                style={[styles.detailCollapsedActions, collapsedHeaderContentStyle]}
            >
                {showPlaylistShuffle ? (
                    <Pressable
                        accessibilityLabel="Shuffle"
                        accessibilityRole="button"
                        hitSlop={10}
                        onPress={() => void onShufflePlay(detail, displayTracks)}
                        style={styles.detailCollapsedIconButton}
                    >
                        <ShuffleGlyph color={colors.text} size={20} />
                    </Pressable>
                ) : null}
                {canPlayDetail && heroPlayTrack ? (
                    <Pressable
                        accessibilityLabel="Play"
                        accessibilityRole="button"
                        onPress={() =>
                            onPlayTrack(detail, heroPlayTrack, heroPlayIndex, heroPlayQueue)
                        }
                        style={styles.detailCollapsedPlayButton}
                    >
                        <PlayPauseGlyph color={colors.background} isPlaying={false} size={16} />
                    </Pressable>
                ) : null}
            </Reanimated.View>
        </View>
    );

    if (!isArtistDetail) {
        return (
            <View style={styles.mediaDetailScreen}>
                <ReanimatedFlashList
                    contentContainerStyle={styles.mediaDetailContent}
                    data={displayTracks}
                    drawDistance={PLAYLIST_TRACK_DRAW_DISTANCE}
                    estimatedItemSize={62}
                    extraData={downloadedTrackKeys}
                    keyExtractor={(track, index) => `${track.id}:${index}`}
                    ListEmptyComponent={
                        <Text style={styles.mutedText}>
                            {detail.tracks.length === 0
                                ? emptyText
                                : 'No tracks match the current filter.'}
                        </Text>
                    }
                    ListHeaderComponent={albumDetailListHeader}
                    onScroll={detailScrollHandler}
                    renderItem={renderListTrackItem}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                />
                {detailCollapsedTopbar}
                <TrackPlaylistMenu
                    actionState={playlistActionState}
                    onAddToPlaylist={(playlist) => void handleAddToPlaylist(playlist)}
                    onClose={() => {
                        setPlaylistMenuTrack(null);
                        setPlaylistActionState({ status: 'idle' });
                    }}
                    playlists={playlistTargets}
                    track={playlistMenuTrack}
                />
            </View>
        );
    }

    return (
        <View style={styles.mediaDetailScreen}>
            <Reanimated.ScrollView
                contentContainerStyle={styles.mediaDetailContent}
                onScroll={detailScrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.detailHero}>
                    <DetailHeroArtwork
                        fallbackUri={fallbackArtworkUrl}
                        letter={detail.title.slice(0, 1)}
                        primaryUri={detail.artworkUrl}
                        round
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
                />
            </Reanimated.ScrollView>
            {detailCollapsedTopbar}
            <TrackPlaylistMenu
                actionState={playlistActionState}
                onAddToPlaylist={(playlist) => void handleAddToPlaylist(playlist)}
                onClose={() => {
                    setPlaylistMenuTrack(null);
                    setPlaylistActionState({ status: 'idle' });
                }}
                playlists={playlistTargets}
                track={playlistMenuTrack}
            />
        </View>
    );
};

export const ArtistDetailSections = ({
    detail,
    emptyText,
    fallbackArtworkUrl,
    onPlayTrack,
    onSelectItem,
    sectionTitle,
}: {
    detail: MobileMediaDetail;
    emptyText: string;
    fallbackArtworkUrl?: string;
    onPlayTrack: (detail: MobileMediaDetail, track: MobileMediaTrack, index: number) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    sectionTitle: string;
}) => {
    const [bioExpanded, setBioExpanded] = useState(false);
    const contextMenu = useMediaContextMenu();
    const albums = detail.items ?? [];
    const topTracks = detail.topTracks ?? [];
    const appearsOnItems = detail.appearsOnItems ?? [];
    const relatedArtists = detail.relatedArtists ?? [];
    const biography = detail.biography;

    return (
        <>
            {biography ? (
                <View style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text
                        numberOfLines={bioExpanded ? undefined : 4}
                        style={styles.artistBio}
                    >
                        {biography}
                    </Text>
                    {biography.length > 240 ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => setBioExpanded((value) => !value)}
                        >
                            <Text style={styles.artistBioToggle}>
                                {bioExpanded ? 'Show less' : 'Read more'}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}

            {topTracks.length > 0 ? (
                <View style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>Top Tracks</Text>
                    {topTracks.map((track, index) => {
                        const trackBadgeProfile = getPlaybackQualityProfile(track.playback);
                        return (
                            <Pressable
                                accessibilityRole="button"
                                key={`${track.id}:${index}`}
                                onLongPress={() => contextMenu.openForTrack(track, detail)}
                                onPress={() => onPlayTrack(detail, track, index)}
                                style={styles.trackRow}
                            >
                                <View>
                                    {track.artworkUrl ?? detail.artworkUrl ?? fallbackArtworkUrl ? (
                                        <ArtworkImage
                                            letter={track.title.slice(0, 1).toUpperCase()}
                                            style={styles.trackArtwork}
                                            uri={
                                                track.artworkUrl ??
                                                detail.artworkUrl ??
                                                fallbackArtworkUrl
                                            }
                                        />
                                    ) : (
                                        <View style={styles.trackArtworkFallback}>
                                            <Text style={styles.trackArtworkLetter}>
                                                {track.title.slice(0, 1).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <QualityBadge thumb profile={trackBadgeProfile} />
                                </View>
                                <View style={styles.searchRowText}>
                                    <Text numberOfLines={1} style={styles.searchTitle}>
                                        {track.title}
                                    </Text>
                                    {track.subtitle ? (
                                        <Text numberOfLines={1} style={styles.mediaSubtitle}>
                                            {track.subtitle}
                                        </Text>
                                    ) : null}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            ) : null}

            <View style={styles.homeSection}>
                <Text style={styles.sectionTitle}>{sectionTitle}</Text>
                {albums.length === 0 ? (
                    <Text style={styles.mutedText}>{emptyText}</Text>
                ) : (
                    <View style={styles.artistAlbumGrid}>
                        {albums.map((item) => (
                            <ArtistAlbumTile
                                item={item}
                                key={item.id}
                                onSelectItem={onSelectItem}
                            />
                        ))}
                    </View>
                )}
            </View>

            {appearsOnItems.length > 0 ? (
                <View style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>Appears On</Text>
                    <View style={styles.artistAlbumGrid}>
                        {appearsOnItems.map((item) => (
                            <ArtistAlbumTile
                                item={item}
                                key={item.id}
                                onSelectItem={onSelectItem}
                            />
                        ))}
                    </View>
                </View>
            ) : null}

            {relatedArtists.length > 0 ? (
                <View style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>Similar Artists</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {relatedArtists.map((item) => (
                            <Pressable
                                accessibilityRole="button"
                                key={item.id}
                                onLongPress={() => contextMenu.openForItem(item)}
                                onPress={() => onSelectItem(item)}
                                style={styles.relatedArtistTile}
                            >
                                <ArtworkImage
                                    fallbackStyle={styles.relatedArtistArtworkFallback}
                                    letter={item.title.slice(0, 1)}
                                    style={styles.relatedArtistArtwork}
                                    uri={item.artworkUrl}
                                />
                                <Text numberOfLines={2} style={styles.relatedArtistTitle}>
                                    {item.title}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            ) : null}
        </>
    );
};

export const ArtistAlbumTile = ({
    item,
    onSelectItem,
}: {
    item: MobileHomeItem;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
}) => {
    const contextMenu = useMediaContextMenu();
    const tileBadgeProfile = getItemQualityProfile(item);
    return (
        <Pressable
            accessibilityRole="button"
            onLongPress={() => contextMenu.openForItem(item)}
            onPress={() => onSelectItem(item)}
            style={styles.artistAlbumGridItem}
        >
            <ArtworkImage
                fallbackStyle={styles.artistAlbumGridFallback}
                letter={item.title.slice(0, 1)}
                style={styles.artistAlbumGridArtwork}
                uri={item.artworkUrl}
            />
            <QualityBadge overlay profile={tileBadgeProfile} />
            <Text numberOfLines={2} style={styles.artistAlbumGridTitle}>
                {item.title}
            </Text>
            {item.subtitle ? (
                <Text numberOfLines={1} style={styles.mediaSubtitle}>
                    {item.subtitle}
                </Text>
            ) : null}
        </Pressable>
    );
};

