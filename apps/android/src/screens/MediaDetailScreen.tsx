import { buildAudioQualityBadgeItems } from '@samo/core/audio-quality';
import {
    getDetailQualityProfile,
    getItemQualityProfile,
    getPlaybackQualityProfile,
    createMobilePlaylist,
    isMobilePlaylistDetailEditable,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult, findServerAuthenticationForSource } from '@samo/core/server';
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
    InteractionManager,
    Keyboard,
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
import { SkeletonTrackRow } from '../components/Skeleton';
import {
    EditPlaylistSheet,
    removeSelectedPlaylistTracks,
} from '../components/EditPlaylistSheet';
import { PlaylistTrackControls } from '../components/PlaylistTrackControls';
import { QualityBadge, QualitySpec } from '../components/QualityBadge';
import {
    CheckGlyph,
    CircularDownloadGlyph,
    ClearGlyph,
    DiscGlyph,
    DownloadGlyph,
    EllipsisVerticalGlyph,
    GearGlyph,
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
import { type AndroidMediaDetailState, buildMediaDetailShell } from '../services/media-detail';
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
const PLAYLIST_SEARCH_FLOATING_HEIGHT = 54;

import { MediaDetailLoadingView } from './MediaDetailLoadingView';
import { MediaDetailLoaded } from './MediaDetailLoaded';
export const MediaDetailContent = memo(({
    homeContentState,
    mediaDetailKey,
    mediaDetailState,
    onAddTrackToPlaylist,
    onBack,
    onPlayTrack,
    onReloadDetail,
    onSelectItem,
    onShufflePlay,
    serverConnection,
}: {
    homeContentState: AndroidHomeContentState;
    mediaDetailKey: string | null;
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
    onReloadDetail?: () => Promise<void>;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onShufflePlay: (detail: MobileMediaDetail, tracks?: MobileMediaTrack[]) => void;
    serverConnection: ServerAuthenticationResult | null;
}) => {
    const openingArtworkUrlRef = useRef<string | undefined>(undefined);
    // The cover the skeleton showed (the tapped item's art). Carried into the
    // loaded hero so it resolves to the SAME canonical artwork key and reuses the
    // warm cache entry instead of re-fetching detail.artworkUrl — that re-fetch is
    // the "cached art deloads then reloads" flash on the skeleton→content swap.
    const openingArtworkImageIdRef = useRef<string | undefined>(undefined);
    const activeDetailKeyRef = useRef<string | null>(null);

    if (mediaDetailKey !== activeDetailKeyRef.current) {
        activeDetailKeyRef.current = mediaDetailKey;
        openingArtworkUrlRef.current = undefined;
        openingArtworkImageIdRef.current = undefined;
    }
    const title =
        mediaDetailState.status === 'loaded'
            ? mediaDetailState.detail.title
            : mediaDetailState.status === 'idle'
              ? 'Media'
              : mediaDetailState.itemTitle;

    if (mediaDetailState.status === 'loading') {
        openingArtworkUrlRef.current = mediaDetailState.itemArtworkUrl;
        openingArtworkImageIdRef.current = mediaDetailState.itemArtworkImageId;
    }

    // While loading, build a shell detail so MediaDetailLoaded can render its REAL
    // list + hero in a loading state. Rendering the SAME component (and therefore
    // the SAME hero ExpoImage) across loading→loaded is what makes the cover
    // PERSIST instead of unmounting and re-decoding — the skeleton→detail flash.
    // Artists fall back to the standalone skeleton: their detail is a different
    // ScrollView layout with its own section skeletons, not this track list.
    const shellDetail =
        mediaDetailState.status === 'loading'
            ? buildMediaDetailShell(mediaDetailState)
            : null;
    const unifiedDetail =
        mediaDetailState.status === 'loaded'
            ? mediaDetailState.detail
            : shellDetail && shellDetail.type !== MobileMediaDetailType.ARTIST
              ? shellDetail
              : null;

    return (
        <>
            {unifiedDetail ? (
                <MediaDetailLoaded
                    detail={unifiedDetail}
                    fallbackArtworkImageId={openingArtworkImageIdRef.current}
                    fallbackArtworkUrl={openingArtworkUrlRef.current}
                    isAwaitingDetail={mediaDetailState.status !== 'loaded'}
                    onAddTrackToPlaylist={onAddTrackToPlaylist}
                    onBack={onBack}
                    onPlayTrack={onPlayTrack}
                    onReloadDetail={onReloadDetail}
                    onSelectItem={onSelectItem}
                    onShufflePlay={onShufflePlay}
                    playlistTargets={getPlaylistTargetsForDetail(homeContentState, unifiedDetail)}
                    serverConnection={serverConnection}
                />
            ) : mediaDetailState.status === 'loading' ? (
                <MediaDetailLoadingView
                    artworkImageId={mediaDetailState.itemArtworkImageId}
                    artworkUrl={mediaDetailState.itemArtworkUrl}
                    contentSource={mediaDetailState.itemSource}
                    itemType={mediaDetailState.itemType}
                    serverConnection={serverConnection}
                    title={title}
                />
            ) : mediaDetailState.status === 'error' ? (
                <View style={[styles.mediaDetailScreen, styles.content]}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <Text style={styles.errorText}>{mediaDetailState.message}</Text>
                </View>
            ) : null}
        </>
    );
});

MediaDetailContent.displayName = 'MediaDetailContent';

