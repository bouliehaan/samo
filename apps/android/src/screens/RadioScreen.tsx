import { MobileHomeSectionId } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { File } from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';

import { LibrarySortMenu } from '../components/LibrarySortMenu';
import { MediaArtwork } from '../components/MediaArtwork';
import { useSearchPull } from '../components/search-pull/useSearchPull';
import { SamoRadioPanel } from '../components/SamoRadioPanel';
import { SkeletonTileGrid } from '../components/Skeleton';
import { PlusGlyph } from '../components/Glyphs';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import { useScrollContentBottomInset } from '../hooks/use-scroll-content-bottom-inset';
import { triggerImpact } from '../services/haptics';
import { loadHomeRadioSection } from '../services/home-flow';
import { getPersistedServerAuthKey } from '../services/persisted-server';
import {
    type AddAndroidRadioStationInput,
    type AddAndroidRadioStationResult,
    canAddAndroidRadioStation,
} from '../services/radio-stations';
import { refreshSamoRadioDevices, refreshSamoRadioStations } from '../services/samo-radio';
import { selectSamoRadioReach, useSamoRadioSelector } from '../state/samo-radio';
import { PAGE_TOP_INSET } from '../theme/layout';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { LIBRARY_SORTS, type LibrarySort } from '../types/library-tab';
import { type RadioScreenProps } from '../types/radio';
import { getContentItemKey } from '../utils/content-item';
import { getDisplaySubtitle } from '../utils/playback-time';
import { getSectionsById, sortHomeItemsByRecents } from '../utils/home-display';
import {
    selectActiveAndroidPlaybackItem,
    useAndroidPlaybackState,
} from '../state/playback-store';
import { EmptyServerBackedScreen } from './EmptyServerBackedScreen';
import { useVisibleHomeContentState } from '../hooks/use-visible-home-content';
import { useVisibleRecentItems } from '../hooks/use-visible-recent-items';

export const RadioScreen = memo(({
    onAddStation,
    onSelectItem,
    serverConnection,
}: RadioScreenProps) => {
    const homeContentState = useVisibleHomeContentState();
    const recentItems = useVisibleRecentItems();
    const contextMenu = useMediaContextMenu();
    const bottomInset = useScrollContentBottomInset();
    const { nativeGesture: searchPullNativeGesture, scrollProps: searchPullScrollProps } =
        useSearchPull('radio');
    // Own the playback subscription rather than receiving the now-playing id from
    // App — keeps the (5s) radio-metadata re-render local to this screen.
    const activePlaybackItem = useAndroidPlaybackState(selectActiveAndroidPlaybackItem);
    const nowPlayingRadioId =
        activePlaybackItem?.source === 'radio' ? activePlaybackItem.id : null;
    const [activeSort, setActiveSort] = useState<LibrarySort>('recents');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    // Whether the server answered the last time anything asked it for radio.
    // Every surface on this tab is live-only, so this is the difference
    // between "your server has no stations" and "we never got to ask".
    const reach = useSamoRadioSelector(selectSamoRadioReach);
    const [isRetrying, setIsRetrying] = useState(false);
    const radioManageConnections = useMemo(
        () => (serverConnection && canAddAndroidRadioStation(serverConnection) ? serverConnection : null),
        [serverConnection],
    );
    const section =
        homeContentState.status === 'loaded'
            ? getSectionsById(homeContentState, [MobileHomeSectionId.RADIO])[0]
            : undefined;
    const stations = section?.items ?? [];
    const sortedStations = useMemo(() => {
        return activeSort === 'name'
            ? [...stations].sort((left, right) => left.title.localeCompare(right.title))
            : sortHomeItemsByRecents(stations, recentItems);
    }, [activeSort, recentItems, stations]);
    // Re-ask all three radio reads at once. They fail together (one server,
    // one connection), so they are worth retrying together — and the poll on
    // its own is not enough, because it only covers devices, not the station
    // shelf that Home owns.
    const handleRetry = useCallback(() => {
        triggerImpact('light');
        setIsRetrying(true);
        void Promise.all([
            refreshSamoRadioDevices(),
            refreshSamoRadioStations().catch(() => []),
            serverConnection ? loadHomeRadioSection(serverConnection) : Promise.resolve(),
        ]).finally(() => setIsRetrying(false));
    }, [serverConnection]);

    const activeSortLabel =
        LIBRARY_SORTS.find((sort) => sort.id === activeSort)?.label ?? 'Recents';
    const activeSortShortLabel = activeSort === 'name' ? 'Name' : 'Recent';
    // Sort anchors the left edge, add-station the right — one quiet row.
    const radioHeaderActions = (
        <>
            <Pressable
                accessibilityLabel={`Sort by ${activeSortLabel}. Tap to change.`}
                accessibilityRole="button"
                android_ripple={{ borderless: true, color: 'rgba(255, 255, 255, 0.08)' }}
                onPress={() => {
                    triggerImpact('light');
                    setIsSortMenuOpen(true);
                }}
                style={styles.radioSortButton}
            >
                <Text style={styles.radioSortText}>{activeSortShortLabel}</Text>
            </Pressable>
            <Pressable
                accessibilityLabel="Add radio station"
                accessibilityRole="button"
                disabled={!radioManageConnections}
                onPress={() => {
                    triggerImpact('light');
                    setIsAddModalOpen(true);
                }}
                style={[
                    styles.radioAddIconButton,
                    !radioManageConnections && styles.disabledButton,
                ]}
            >
                <PlusGlyph color={colors.muted} size={18} />
            </Pressable>
        </>
    );

    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle="Radio" />;
    }

    if (homeContentState.status === 'loading') {
        return <SkeletonTileGrid />;
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={[styles.section, { marginTop: PAGE_TOP_INSET }]}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    // Empty and loaded share ONE drawer-bearing scroll host — the empty state
    // (no stations, common on Radio) must carry the pull-down search drawer
    // just like every other page, so it can't be a separate bare View.
    return (
        <View style={styles.tabSceneFill}>
            <GestureDetector gesture={searchPullNativeGesture}>
            <Reanimated.ScrollView
                contentContainerStyle={[
                    styles.radioScrollContent,
                    { paddingBottom: bottomInset },
                ]}
                showsVerticalScrollIndicator={false}
                style={styles.tabSceneFill}
                {...searchPullScrollProps}
            >
                <View style={styles.pageControlsRow}>
                    {radioHeaderActions}
                </View>
                <SamoRadioPanel />
                {/* Sits in the control panel's slot, because when the server
                    is out of reach the panel itself renders nothing — this is
                    the thing that says so, rather than leaving the controls to
                    silently not exist. */}
                {reach.status === 'unreachable' ? (
                    <SamoRadioUnreachableNotice
                        isRetrying={isRetrying}
                        message={reach.message}
                        onRetry={handleRetry}
                        serverTitle={serverConnection?.title}
                    />
                ) : null}
                {sortedStations.length > 0 ? (
                    <View style={styles.radioGrid}>
                        {sortedStations.map((station) => {
                            const isPlaying =
                                nowPlayingRadioId !== null &&
                                station.playback?.id === nowPlayingRadioId;

                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={getContentItemKey(station)}
                                    onLongPress={() => contextMenu.openForItem(station)}
                                    onPress={() => onSelectItem(station)}
                                    style={styles.radioCard}
                                >
                                    <MediaArtwork
                                        artworkImageId={station.artworkImageId}
                                        artworkUrl={station.artworkUrl}
                                        contentSource={station.source}
                                        mediaType="radio"
                                        size="card"
                                        title={station.title}
                                    />
                                    <Text numberOfLines={2} style={styles.radioCardTitle}>
                                        {station.title}
                                    </Text>
                                    {isPlaying &&
                                    activePlaybackItem?.source === 'radio' &&
                                    getDisplaySubtitle(activePlaybackItem.subtitle) ? (
                                        <Text numberOfLines={2} style={styles.radioCardMeta}>
                                            {getDisplaySubtitle(activePlaybackItem.subtitle)}
                                        </Text>
                                    ) : station.nowPlayingText ||
                                      getDisplaySubtitle(station.subtitle) ? (
                                        <Text
                                            numberOfLines={2}
                                            style={styles.radioCardMeta}
                                        >
                                            {station.nowPlayingText ??
                                                getDisplaySubtitle(station.subtitle)}
                                        </Text>
                                    ) : isPlaying ? (
                                        <Text style={styles.radioCardNowPlaying}>Now playing</Text>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                ) : reach.status === 'unreachable' ? null : (
                    // Only claim the server returned nothing when it actually
                    // answered. When it didn't, the notice above already says
                    // so and this copy would contradict it.
                    <Text style={[styles.mutedText, styles.radioEmptyText]}>
                        {!radioManageConnections
                            ? 'Connect a samo server to add radio stations from Android.'
                            : 'No server-backed radio stations returned.'}
                    </Text>
                )}
            </Reanimated.ScrollView>
            </GestureDetector>
            <LibrarySortMenu
                activeSort={activeSort}
                onClose={() => setIsSortMenuOpen(false)}
                onSelect={(next) => {
                    setActiveSort(next);
                    setIsSortMenuOpen(false);
                }}
                visible={isSortMenuOpen}
            />
            <AddRadioStationModal
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={onAddStation}
                serverConnection={radioManageConnections}
                visible={isAddModalOpen}
            />
        </View>
    );
});

RadioScreen.displayName = 'RadioScreen';

/**
 * "We couldn't reach the server", where the controls would have been.
 *
 * Radio is the only tab with no on-device mirror behind it, so a server it
 * cannot reach leaves it completely bare — and bare used to be indistinguishable
 * from a server with nothing on it. This is deliberately shaped like the panel
 * it stands in for: same surface, same inset, so the eye lands on it in the
 * place the controls normally occupy.
 *
 * It names the address rather than saying "check your connection", because the
 * usual cause is a reachability problem the phone does not consider an outage
 * at all — a LAN-addressed server with a full-tunnel VPN in the way. Wi-Fi is
 * up, every other tab reads fine from the mirror, and only the address itself
 * is unroutable.
 */
const SamoRadioUnreachableNotice = ({
    isRetrying,
    message,
    onRetry,
    serverTitle,
}: {
    isRetrying: boolean;
    message: string;
    onRetry: () => void;
    serverTitle?: string;
}) => (
    <View style={styles.samoRadioUnreachable}>
        <Text style={styles.samoRadioUnreachableTitle}>
            {serverTitle ? `Can't reach ${serverTitle}` : "Can't reach the server"}
        </Text>
        <Text style={styles.samoRadioUnreachableBody}>{message}</Text>
        <Text style={styles.samoRadioUnreachableHint}>
            {'Stations and the samo-radio controls both live on the server, so ' +
                "there's nothing to show until it answers. A VPN without local " +
                'network access will do this on a server addressed by LAN IP.'}
        </Text>
        <Pressable
            accessibilityLabel="Try reaching the server again"
            accessibilityRole="button"
            android_ripple={{ borderless: false, color: 'rgba(255, 255, 255, 0.08)' }}
            disabled={isRetrying}
            onPress={onRetry}
            style={[
                styles.samoRadioUnreachableRetry,
                isRetrying && styles.disabledButton,
            ]}
        >
            {isRetrying ? (
                <ActivityIndicator color={colors.accent} size="small" />
            ) : (
                <Text style={styles.samoRadioUnreachableRetryText}>Try again</Text>
            )}
        </Pressable>
    </View>
);

const AddRadioStationModal = ({
    onClose,
    onSubmit,
    serverConnection,
    visible,
}: {
    onClose: () => void;
    onSubmit: (input: AddAndroidRadioStationInput) => Promise<AddAndroidRadioStationResult>;
    serverConnection: ServerAuthenticationResult | null;
    visible: boolean;
}) => {
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [streamUrl, setStreamUrl] = useState('');
    const [homepageUrl, setHomepageUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [status, setStatus] = useState<
        | { kind: 'error'; message: string }
        | { kind: 'idle' }
        | { kind: 'saving' }
        | { kind: 'success'; message: string }
    >({ kind: 'idle' });

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!visible) {
            return;
        }
        if (serverConnection) {
            setSelectedServerId((current) => current ?? getPersistedServerAuthKey(serverConnection));
        }
        setStatus({ kind: 'idle' });
    }, [serverConnection, visible]);

    const selectedServer = serverConnection;
    const canSubmit =
        Boolean(selectedServer) &&
        name.trim().length > 0 &&
        streamUrl.trim().length > 0 &&
        status.kind !== 'saving';
    const thumbnailPreviewUri = thumbnailFile?.uri ?? null;
    const thumbnailSourceLabel =
        thumbnailFile?.name ?? (thumbnailUrl.trim().length > 0 ? 'Remote image URL' : 'No image selected');

    const handlePickThumbnail = async () => {
        try {
            triggerImpact('light');
            const picked = (await File.pickFileAsync(undefined, 'image/*')) as File | File[];
            const nextFile = Array.isArray(picked) ? picked[0] : picked;
            if (!nextFile) {
                return;
            }

            if (isMounted.current) {
                setThumbnailFile(nextFile);
                setThumbnailUrl('');
                setStatus({ kind: 'idle' });
            }
        } catch (error) {
            if (isMounted.current) {
                const message =
                    error instanceof Error ? error.message : 'Could not select the thumbnail image.';
                if (message.toLowerCase().includes('cancel')) {
                    return;
                }

                setStatus({ kind: 'error', message });
            }
        }
    };

    const handleSubmit = async () => {
        if (!selectedServer || !canSubmit) {
            return;
        }

        setStatus({ kind: 'saving' });
        try {
            const result = await onSubmit({
                authentication: selectedServer,
                homepageUrl: homepageUrl.trim() || undefined,
                name: name.trim(),
                streamUrl: streamUrl.trim(),
                thumbnailFile: thumbnailFile
                    ? { blob: thumbnailFile, name: thumbnailFile.name }
                    : undefined,
                thumbnailUrl: thumbnailUrl.trim() || undefined,
            });
            if (isMounted.current) {
                const message = result.warning ?? 'Radio station added.';
                setStatus({ kind: 'success', message });
                if (!result.warning) {
                    setName('');
                    setStreamUrl('');
                    setHomepageUrl('');
                    setThumbnailUrl('');
                    setThumbnailFile(null);
                    setTimeout(() => {
                        if (isMounted.current) onClose();
                    }, 450);
                }
            }
        } catch (error) {
            if (isMounted.current) {
                setStatus({
                    kind: 'error',
                    message: error instanceof Error ? error.message : 'Could not add radio station.',
                });
            }
        }
    };

    return (
        <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
            <Pressable onPress={onClose} style={styles.modalBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.addRadioSheet}
                >
                    <View style={styles.actionSheetHandle} />
                    <Text style={styles.actionSheetTitle}>Add Radio Station</Text>
                    {!serverConnection ? (
                        <Text style={styles.mutedText}>
                            Connect a samo server to add radio stations from Android.
                        </Text>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.addRadioForm}
                            keyboardShouldPersistTaps="handled"
                        >

                            <Text style={styles.addRadioLabel}>Name</Text>
                            <TextInput
                                autoCapitalize="words"
                                onChangeText={setName}
                                placeholder="Station name"
                                placeholderTextColor={colors.muted}
                                style={styles.input}
                                value={name}
                            />
                            <Text style={styles.addRadioLabel}>Stream URL</Text>
                            <TextInput
                                autoCapitalize="none"
                                autoCorrect={false}
                                inputMode="url"
                                onChangeText={setStreamUrl}
                                placeholder="https://..."
                                placeholderTextColor={colors.muted}
                                style={styles.input}
                                value={streamUrl}
                            />
                            <Text style={styles.addRadioLabel}>Homepage URL</Text>
                            <TextInput
                                autoCapitalize="none"
                                autoCorrect={false}
                                inputMode="url"
                                onChangeText={setHomepageUrl}
                                placeholder="Optional"
                                placeholderTextColor={colors.muted}
                                style={styles.input}
                                value={homepageUrl}
                            />
                            <Text style={styles.addRadioLabel}>Thumbnail URL</Text>
                            <TextInput
                                autoCapitalize="none"
                                autoCorrect={false}
                                inputMode="url"
                                onChangeText={(next) => {
                                    setThumbnailUrl(next);
                                    if (next.trim().length > 0) {
                                        setThumbnailFile(null);
                                    }
                                }}
                                placeholder="Optional image URL"
                                placeholderTextColor={colors.muted}
                                style={styles.input}
                                value={thumbnailUrl}
                            />
                            <View style={styles.addRadioThumbnailPicker}>
                                <View style={styles.addRadioThumbnailPreview}>
                                    {thumbnailPreviewUri ? (
                                        <ExpoImage
                                            contentFit="cover"
                                            source={{ uri: thumbnailPreviewUri }}
                                            style={styles.addRadioThumbnailImage}
                                        />
                                    ) : (
                                        <PlusGlyph color={colors.muted} size={18} />
                                    )}
                                </View>
                                <View style={styles.addRadioThumbnailMeta}>
                                    <Text numberOfLines={1} style={styles.addRadioThumbnailTitle}>
                                        Local thumbnail
                                    </Text>
                                    <Text numberOfLines={1} style={styles.addRadioThumbnailSubtitle}>
                                        {thumbnailSourceLabel}
                                    </Text>
                                </View>
                                <Pressable
                                    accessibilityLabel="Choose local radio thumbnail"
                                    accessibilityRole="button"
                                    onPress={() => void handlePickThumbnail()}
                                    style={styles.addRadioThumbnailButton}
                                >
                                    <Text style={styles.addRadioThumbnailButtonText}>Choose</Text>
                                </Pressable>
                            </View>
                            {status.kind === 'error' || status.kind === 'success' ? (
                                <Text
                                    style={
                                        status.kind === 'error'
                                            ? styles.errorText
                                            : styles.addRadioSuccess
                                    }
                                >
                                    {status.message}
                                </Text>
                            ) : null}
                            <View style={styles.addRadioActions}>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={onClose}
                                    style={styles.secondaryButton}
                                >
                                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    accessibilityRole="button"
                                    disabled={!canSubmit}
                                    onPress={() => void handleSubmit()}
                                    style={[
                                        styles.primaryButton,
                                        !canSubmit && styles.disabledButton,
                                    ]}
                                >
                                    {status.kind === 'saving' ? (
                                        <ActivityIndicator color={colors.background} />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Add Station</Text>
                                    )}
                                </Pressable>
                            </View>
                        </ScrollView>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
};
