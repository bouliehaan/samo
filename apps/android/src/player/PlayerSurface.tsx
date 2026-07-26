import { buildAudioQualityBadgeItems } from '@samo/core/audio-quality';
import {
    getMobileContentSource,
    getPlaybackQualityProfile,
    parsePodcastPlaybackShowId,
    MobileHomeItemType,
    MobileSearchItemType,
    type MobileHomeItem,
    type MobilePlayableAudio,
    type MobilePlaybackSegment,
    type MobileSearchItem,
    LONG_FORM_RELATIVE_SKIP_SECONDS,
} from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    getCachedSamoStreamToken,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import { FlashList } from '@shopify/flash-list';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import ditherTexture from '../../assets/dither.png';
import {
    type ComponentProps,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    type GestureResponderEvent,
    Image,
    Modal,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
    interpolate,
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { ArtworkImage } from '../components/ArtworkImage';
import { ArtworkZoomModal } from '../components/ArtworkZoomModal';
import {
    CastGlyph,
    ChaptersGlyph,
    CheckGlyph,
    DownCaretGlyph,
    EllipsisVerticalGlyph,
    MoreGlyph,
    PlayPauseGlyph,
    ShuffleGlyph,
    SleepTimerGlyph,
    TrackSkipGlyph,
} from '../components/Glyphs';
import { QualityBadge, QualityBadgeRow } from '../components/QualityBadge';
import { SegmentedSeekBar } from '../components/SegmentedSeekBar';
import { SwipeDismissSheet } from '../components/SwipeDismissSheet';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import {
    type AndroidCastState,
    type AndroidMediaOutputRoute,
    type AndroidMediaOutputState,
    cancelAndroidSleepTimer,
    getAndroidOutputRoutes,
    isAndroidNativePlaybackAvailable,
    selectAndroidOutputRoute,
    setAndroidSleepTimer,
    subscribeToAndroidOutputRouteEvents,
    updateAndroidNowPlayingMetadata,
} from '../services/audio-playback';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import { getPersistedServerAuthKey } from '../services/persisted-server';
import { useServerConnections } from '../contexts/server-connections';
import { getPlayerPositionMsForAbsProgress } from '../utils/abs-progress-math';
import {
    artworkSourceUri,
    isSamoMediaUrlMissingStreamToken,
    resolvePlaybackArtworkSourceForDisplay,
} from '../utils/samo-artwork-url';
import {
    getAndroidPlaybackState,
    subscribeAndroidPlaybackState,
    useAndroidPlaybackState,
    useMiniPlayerPlaybackState,
} from '../state/playback-store';
import { type AndroidPlaybackState } from '../types/playback';
import {
    findActiveChapterIndex,
    formatChapterRange,
    formatPlaybackTime,
    getActivePlaybackStatus,
    getDurationLabel,
    getPlayableDisplayMetadata,
    getPlaybackDisplayMetadata,
    getPlaybackDurationMs,
    getDisplayPositionMs,
    getStablePlaybackPositionMs,
    isLivePlayback,
} from '../utils/playback-time';
import {
    FROSTED_BACKDROP_STOPS,
    FROSTED_GLASS_DEPTH,
    FROSTED_GLASS_DEPTH_LOCATIONS,
    FROSTED_GLASS_SHEEN,
    FROSTED_GLASS_SHEEN_LOCATIONS,
} from '../utils/color';
import { clamp } from '../utils/math';
import { formatQualityProfile } from '../services/quality-badge-assets';
import { triggerImpact } from '../services/haptics';
import {
    DISMISS_DISTANCE,
    DISMISS_VELOCITY,
    FULL_PLAYER_PADDING_TOP,
    FULL_PLAYER_PLAY_GLYPH_SIZE,
    OPEN_SPRING,
    PLAYER_EXPANSION_DISTANCE,
    QUEUE_CLOSE_DISTANCE,
    QUEUE_CLOSE_VELOCITY,
    QUEUE_SHEET_HEIGHT,
    REDUCED_MOTION_SPRING,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
} from '../theme/layout';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { PlayerIconButton } from './PlayerIconButton';
import {
    PLAYER_CLOSE_SPRING,
    PLAYER_OPEN_SPRING,
    shellTopRadius,
} from './player-motion';

const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;
const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };
const CAST_ICON_ACTIVE_TINT = 'rgba(207, 216, 227, 0.85)';
const CAST_ICON_INACTIVE_TINT = 'rgba(245, 245, 245, 0.72)';

import { MiniPlayer } from './MiniPlayer';
import { FullScreenPlayer } from './FullScreenPlayer';
import { OutputPickerModal, getOutputRouteGlyphLabel, getCastPickerEmptyMessage } from './OutputPickerModal';
export { OutputPickerModal };
export const ConnectedMiniPlayer = memo((
    props: Omit<ComponentProps<typeof MiniPlayer>, 'playbackState'>,
) => {
    const playbackState = useMiniPlayerPlaybackState();
    return <MiniPlayer {...props} playbackState={playbackState} />;
});

ConnectedMiniPlayer.displayName = 'ConnectedMiniPlayer';

export const NowPlayingMetadataSync = memo(() => {
    const serverConnection = useServerConnections();
    const lastSentRef = useRef<string | null>(null);
    const serverConnectionRef = useRef(serverConnection);
    serverConnectionRef.current = serverConnection;

    useEffect(() => {
        if (!isAndroidNativePlaybackAvailable()) {
            return;
        }

        const syncMetadata = () => {
            const state = getAndroidPlaybackState();
            if (state.status === 'idle') {
                return;
            }

            // Radio-only channel. For every other source the NATIVE side owns
            // now-playing metadata: playLocally seeds it and onMediaItemTransition
            // re-derives it (with a token-fresh artwork URL) per track — pushes
            // from here either echo what native already has or describe a stale
            // item and get dropped by the native id-gate. Radio is the one source
            // whose metadata changes mid-item (ICY titles polled in JS), so it is
            // the one source that still needs this JS→native push. Skipping the
            // rest also stops this subscriber from doing URL/JSON work on every
            // 1-2s position tick of ordinary playback.
            if (state.item.source !== 'radio') {
                return;
            }

            const display = getPlaybackDisplayMetadata(state);
            const resolvedArtworkUrl =
                artworkSourceUri(
                    resolvePlaybackArtworkSourceForDisplay(
                        state.item,
                        serverConnectionRef.current,
                    ),
                ) ?? state.item.artworkUrl;
            // Never push a Samo artwork URL the notification's header-less
            // fetch can only 401 on — that overwrites native's fresh artwork
            // with a grey tile. Two ways to be that URL: it carries NO stream
            // token at all, or the JS token cache has gone stale during a long
            // native-driven session (nothing on the JS side mints anymore), so
            // the resolver could only pass through whatever expired token the
            // item was built with. In both cases omit the field (native keeps
            // its own artwork, freshened at each transition) and mint in the
            // background so the NEXT push carries a live token again.
            const contentSource = getContentSourceFromPlaybackItem(
                state.item,
                serverConnectionRef.current,
            );
            const auth = contentSource
                ? findServerAuthenticationForSource(
                      serverConnectionRef.current,
                      contentSource,
                  )
                : undefined;
            const isSamoApiArtworkUrl = Boolean(
                resolvedArtworkUrl && resolvedArtworkUrl.includes('/api/v1/'),
            );
            const hasLiveToken = auth ? Boolean(getCachedSamoStreamToken(auth)) : false;
            let artworkUrl = resolvedArtworkUrl;
            if (
                isSamoMediaUrlMissingStreamToken(resolvedArtworkUrl) ||
                (isSamoApiArtworkUrl && !hasLiveToken)
            ) {
                artworkUrl = undefined;
                if (auth) {
                    void ensureSamoStreamToken(auth)
                        .then(() => syncMetadata())
                        .catch(() => undefined);
                }
            }
            const metadataKey = JSON.stringify({
                artworkUrl,
                id: state.item.id,
                sessionId: state.sessionId,
                source: state.item.source,
                subtitle: display.subtitle,
                title: display.title || state.item.title,
            });

            if (metadataKey === lastSentRef.current) {
                return;
            }

            lastSentRef.current = metadataKey;
            const metadata = JSON.parse(metadataKey) as {
                artworkUrl?: string;
                id: string;
                sessionId: string;
                source: string;
                subtitle?: string;
                title: string;
            };

            void updateAndroidNowPlayingMetadata(metadata).catch(() => undefined);
        };

        syncMetadata();
        return subscribeAndroidPlaybackState(syncMetadata);
    }, []);

    return null;
});

NowPlayingMetadataSync.displayName = 'NowPlayingMetadataSync';

export const ConnectedFullScreenPlayer = memo((
    props: Omit<ComponentProps<typeof FullScreenPlayer>, 'playbackState'>,
) => {
    const fullPlaybackState = useAndroidPlaybackState();
    const miniPlaybackState = useMiniPlayerPlaybackState();
    const playbackState = props.visible ? fullPlaybackState : miniPlaybackState;
    return <FullScreenPlayer {...props} playbackState={playbackState} />;
});

ConnectedFullScreenPlayer.displayName = 'ConnectedFullScreenPlayer';

