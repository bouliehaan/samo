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

export const ArtistDetailSections = ({
    detail,
    emptyText,
    fallbackArtworkUrl,
    onPlayTrack,
    onSelectItem,
    sectionTitle,
    serverConnection,
}: {
    detail: MobileMediaDetail;
    emptyText: string;
    fallbackArtworkUrl?: string;
    onPlayTrack: (detail: MobileMediaDetail, track: MobileMediaTrack, index: number) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    sectionTitle: string;
    serverConnection: ServerAuthenticationResult | null;
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
                                            // Fall back to the artist's cached art id
                                            // only for tracks with no art of their own —
                                            // the resolver prefers the id, so the artist
                                            // portrait would mask real track covers.
                                            artworkImageId={
                                                track.artworkImageId ??
                                                (track.artworkUrl
                                                    ? undefined
                                                    : detail.artworkImageId)
                                            }
                                            contentSource={detail.source}
                                            letter={track.title.slice(0, 1).toUpperCase()}
                                            serverConnection={serverConnection}
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
                                </View>
                                <View style={styles.searchRowText}>
                                    <Text numberOfLines={1} style={styles.searchTitle}>
                                        {track.title}
                                    </Text>
                                    {track.subtitle || trackBadgeProfile ? (
                                        <View style={styles.qualityMetaRow}>
                                            {track.subtitle ? (
                                                <Text
                                                    numberOfLines={1}
                                                    style={[
                                                        styles.mediaSubtitle,
                                                        styles.qualityMetaSubtitle,
                                                    ]}
                                                >
                                                    {track.subtitle}
                                                </Text>
                                            ) : null}
                                            <QualitySpec profile={trackBadgeProfile} />
                                        </View>
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
                                serverConnection={serverConnection}
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
                                serverConnection={serverConnection}
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
                                    artworkImageId={item.artworkImageId}
                                    contentSource={item.source}
                                    fallbackStyle={styles.relatedArtistArtworkFallback}
                                    letter={item.title.slice(0, 1)}
                                    serverConnection={serverConnection}
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
    serverConnection,
}: {
    item: MobileHomeItem;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    serverConnection: ServerAuthenticationResult | null;
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
                artworkImageId={item.artworkImageId}
                contentSource={item.source}
                fallbackStyle={styles.artistAlbumGridFallback}
                letter={item.title.slice(0, 1)}
                serverConnection={serverConnection}
                style={styles.artistAlbumGridArtwork}
                uri={item.artworkUrl}
            />
            <View style={styles.tileMetaRow}>
                <View style={styles.tileMetaTextCol}>
                    <Text numberOfLines={2} style={styles.artistAlbumGridTitle}>
                        {item.title}
                    </Text>
                    {item.subtitle ? (
                        <Text numberOfLines={1} style={styles.mediaSubtitle}>
                            {item.subtitle}
                        </Text>
                    ) : null}
                </View>
                <QualityBadge tile profile={tileBadgeProfile} />
            </View>
        </Pressable>
    );
};
