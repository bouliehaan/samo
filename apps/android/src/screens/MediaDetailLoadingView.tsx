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
import { SkeletonBlock, SkeletonPulseProvider, SkeletonTrackRow } from '../components/Skeleton';
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

export const MediaDetailLoadingView = ({
    artworkImageId,
    artworkUrl,
    contentSource,
    itemType,
    serverConnection,
    title,
}: {
    artworkImageId?: string;
    artworkUrl?: string;
    contentSource?: MobileHomeItem['source'];
    itemType?: MobileHomeItem['type'] | MobileSearchItem['type'];
    serverConnection?: ServerAuthenticationResult | null;
    title: string;
}) => {
    const isArtist = itemType === MobileHomeItemType.ARTIST;

    return (
        <SkeletonPulseProvider>
            <View style={styles.mediaDetailScreen}>
                {/* Must be styles.mediaDetailContent ALONE — the loaded view's
                    FlashList uses it as its contentContainerStyle (paddingTop 58).
                    Adding styles.content here overrode paddingTop to spacing.lg
                    (24), so the real content landed 34px lower than the skeleton
                    on load — the visible "jump". */}
                <View style={styles.mediaDetailContent}>
                    {artworkUrl || artworkImageId ? (
                        isArtist ? (
                            <View style={styles.detailHero}>
                                <ArtworkImage
                                    artworkImageId={artworkImageId}
                                    contentSource={contentSource}
                                    fallbackStyle={styles.detailArtworkFallback}
                                    letter={title.slice(0, 1)}
                                    style={[styles.detailArtwork, styles.detailArtworkRound]}
                                    serverConnection={serverConnection}
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
                                        artworkImageId={artworkImageId}
                                        contentSource={contentSource}
                                        fallbackStyle={styles.albumHeroArtworkFallback}
                                        letter={title.slice(0, 1)}
                                        serverConnection={serverConnection}
                                        style={styles.albumHeroArtwork}
                                        uri={artworkUrl}
                                    />
                                </View>
                                {/* Reserve the exact hero chrome the loaded view
                                    inserts between the title and the track list
                                    (eyebrow + meta + actions bar) so the tracks
                                    don't jump down when the detail resolves. */}
                                <View style={styles.albumHeroBadgeRow}>
                                    <SkeletonBlock
                                        style={{ height: 11, width: 64 }}
                                        borderRadius={4}
                                    />
                                </View>
                                <Text numberOfLines={2} style={styles.albumHeroTitle}>
                                    {title}
                                </Text>
                                <View style={styles.albumHeroMeta}>
                                    <SkeletonBlock
                                        style={{ height: 13, marginBottom: 6, width: 150 }}
                                        borderRadius={4}
                                    />
                                    <SkeletonBlock
                                        style={{ height: 13, width: 104 }}
                                        borderRadius={4}
                                    />
                                </View>
                                <View style={styles.albumHeroActionsBar}>
                                    <View style={styles.albumHeroLeftActions}>
                                        <SkeletonBlock
                                            style={styles.albumHeroGlyphButton}
                                            borderRadius={999}
                                        />
                                        <SkeletonBlock
                                            style={styles.albumHeroGlyphButton}
                                            borderRadius={999}
                                        />
                                    </View>
                                    <View style={styles.albumHeroActions}>
                                        <SkeletonBlock
                                            style={styles.albumHeroGlyphButton}
                                            borderRadius={999}
                                        />
                                        <SkeletonBlock
                                            style={{ height: 52, width: 52 }}
                                            borderRadius={999}
                                        />
                                    </View>
                                </View>
                            </View>
                        )
                    ) : (
                        <Text style={styles.sectionTitle}>{title}</Text>
                    )}
                    {/* No marginTop here: the hero's own marginBottom (spacing.lg)
                        sets the gap to the first row, exactly as in the loaded
                        FlashList — an extra marginTop made the rows sit lower than
                        the real ones and jump up on load. */}
                    <View style={{ marginHorizontal: spacing.md, paddingBottom: 100 }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <SkeletonTrackRow key={i} />
                        ))}
                    </View>
                </View>
            </View>
        </SkeletonPulseProvider>
    );
};

