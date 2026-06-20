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
const PLAYLIST_SEARCH_FLOATING_HEIGHT = 54;

import { MediaDetailLoadingView } from './MediaDetailLoadingView';
import { MediaDetailLoaded } from './MediaDetailLoaded';
export const MediaDetailContent = memo(({
    homeContentState,
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
            ) : mediaDetailState.status === 'loaded' ? (
                <MediaDetailLoaded
                    detail={mediaDetailState.detail}
                    fallbackArtworkUrl={openingArtworkUrlRef.current}
                    onAddTrackToPlaylist={onAddTrackToPlaylist}
                    onBack={onBack}
                    onPlayTrack={onPlayTrack}
                    onReloadDetail={onReloadDetail}
                    onSelectItem={onSelectItem}
                    onShufflePlay={onShufflePlay}
                    playlistTargets={getPlaylistTargetsForDetail(
                        homeContentState,
                        mediaDetailState.detail,
                    )}
                    serverConnection={serverConnection}
                />
            ) : null}
        </>
    );
});

MediaDetailContent.displayName = 'MediaDetailContent';

