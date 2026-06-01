import { MobileHomeItemType, MobileHomeSectionId } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { File } from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { memo, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

import { LibrarySortMenu } from '../components/LibrarySortMenu';
import { MediaArtwork } from '../components/MediaArtwork';
import { PlayPauseGlyph, PlusGlyph } from '../components/Glyphs';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import { triggerImpact } from '../services/haptics';
import { getPersistedServerAuthKey } from '../services/persisted-server';
import { getRecentContentItemKey } from '../services/recent-content';
import {
    type AddAndroidRadioStationInput,
    type AddAndroidRadioStationResult,
    canAddAndroidRadioStation,
} from '../services/radio-stations';
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

export const RadioScreen = memo(({
    homeContentState,
    onAddStation,
    onSelectItem,
    recentItems,
    serverConnections,
}: RadioScreenProps) => {
    const contextMenu = useMediaContextMenu();
    // Own the playback subscription rather than receiving the now-playing id from
    // App — keeps the (5s) radio-metadata re-render local to this screen.
    const activePlaybackItem = useAndroidPlaybackState(selectActiveAndroidPlaybackItem);
    const nowPlayingRadioId =
        activePlaybackItem?.source === 'radio' ? activePlaybackItem.id : null;
    const [activeSort, setActiveSort] = useState<LibrarySort>('recents');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const radioManageConnections = useMemo(
        () => serverConnections.filter(canAddAndroidRadioStation),
        [serverConnections],
    );
    const section =
        homeContentState.status === 'loaded'
            ? getSectionsById(homeContentState, [MobileHomeSectionId.RADIO])[0]
            : undefined;
    const stations = section?.items ?? [];
    const stationsByRecentKey = useMemo(
        () => new Map(stations.map((station) => [getRecentContentItemKey(station), station])),
        [stations],
    );
    const featuredStation = useMemo(() => {
        if (stations.length === 0) {
            return null;
        }

        for (const recent of recentItems) {
            if (recent.item.type !== MobileHomeItemType.RADIO) {
                continue;
            }

            const station = stationsByRecentKey.get(recent.key);
            if (station) {
                return station;
            }
        }

        if (nowPlayingRadioId) {
            const playing = stations.find(
                (station) => station.playback?.id === nowPlayingRadioId,
            );
            if (playing) {
                return playing;
            }
        }

        return [...stations].sort((left, right) => left.title.localeCompare(right.title))[0]!;
    }, [nowPlayingRadioId, recentItems, stations, stationsByRecentKey]);
    const otherStations = useMemo(() => {
        if (!featuredStation) {
            return [];
        }

        const featuredKey = getContentItemKey(featuredStation);
        const rest = stations.filter((station) => getContentItemKey(station) !== featuredKey);

        return activeSort === 'name'
            ? [...rest].sort((left, right) => left.title.localeCompare(right.title))
            : sortHomeItemsByRecents(rest, recentItems);
    }, [activeSort, featuredStation, recentItems, stations]);
    const activeSortLabel =
        LIBRARY_SORTS.find((sort) => sort.id === activeSort)?.label ?? 'Recents';
    const activeSortShortLabel = activeSort === 'name' ? 'Name' : 'Recent';
    const radioHeaderActions = (
        <View style={styles.radioHeaderActions}>
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
                disabled={radioManageConnections.length === 0}
                onPress={() => {
                    triggerImpact('light');
                    setIsAddModalOpen(true);
                }}
                style={[
                    styles.radioAddIconButton,
                    radioManageConnections.length === 0 && styles.disabledButton,
                ]}
            >
                <PlusGlyph color={colors.muted} size={18} />
            </Pressable>
        </View>
    );

    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle="Radio" />;
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

    if (stations.length === 0) {
        return (
            <View style={styles.radioScreen}>
                <View style={[styles.radioGridHeader, styles.radioGridHeaderCompact]}>
                    <Text style={styles.sectionTitle}>Stations</Text>
                    {radioHeaderActions}
                </View>
                <Text style={[styles.mutedText, styles.radioEmptyText]}>
                    {radioManageConnections.length === 0
                        ? 'Connect a Samo or Navidrome server to add radio stations from Android.'
                        : 'No server-backed radio stations returned.'}
                </Text>
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
                    serverConnections={radioManageConnections}
                    visible={isAddModalOpen}
                />
            </View>
        );
    }

    if (!featuredStation) {
        return null;
    }

    const recentRadioKeys = new Set(
        recentItems
            .filter((r) => r.item.type === MobileHomeItemType.RADIO)
            .map((r) => getRecentContentItemKey(r.item)),
    );
    const featuredIsPlaying =
        nowPlayingRadioId !== null && featuredStation.playback?.id === nowPlayingRadioId;
    const featuredLiveSubtitle =
        featuredIsPlaying && activePlaybackItem?.source === 'radio'
            ? getDisplaySubtitle(activePlaybackItem.subtitle)
            : undefined;
    const featuredTileSubtitle =
        featuredLiveSubtitle ??
        featuredStation.nowPlayingText ??
        getDisplaySubtitle(featuredStation.subtitle);

    return (
        <View style={styles.radioScreen}>
            <Pressable
                accessibilityRole="button"
                onLongPress={() => contextMenu.openForItem(featuredStation)}
                onPress={() => onSelectItem(featuredStation)}
                style={styles.radioHero}
            >
                        <View style={styles.radioHeroArtworkWrap}>
                            <MediaArtwork
                                artworkImageId={featuredStation.artworkImageId}
                                artworkUrl={featuredStation.artworkUrl}
                                contentSource={featuredStation.source}
                                mediaType="radio"
                                size="hero"
                                title={featuredStation.title}
                            />
                        </View>
                <View style={styles.radioHeroText}>
                    {recentRadioKeys.has(getRecentContentItemKey(featuredStation)) ? (
                        <Text style={styles.radioHeroEyebrow}>Recently played</Text>
                    ) : null}
                    <Text numberOfLines={2} style={styles.radioHeroTitle}>
                        {featuredStation.title}
                    </Text>
                    <Text numberOfLines={2} style={styles.radioHeroSubtitle}>
                        {featuredIsPlaying
                            ? (featuredLiveSubtitle ?? 'Now playing')
                            : (featuredTileSubtitle ?? 'Internet radio')}
                    </Text>
                </View>
                {featuredStation.playback ? (
                    <View style={styles.radioHeroPlay}>
                        <PlayPauseGlyph
                            color={colors.background}
                            isPlaying={featuredIsPlaying}
                            size={22}
                        />
                    </View>
                ) : null}
            </Pressable>
            <View style={styles.radioGridHeader}>
                <Text style={styles.sectionTitle}>Stations</Text>
                {radioHeaderActions}
            </View>
            {otherStations.length > 0 ? (
                <>
                    <View style={styles.radioGrid}>
                        {otherStations.map((station) => {
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
                </>
            ) : null}
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
                serverConnections={radioManageConnections}
                visible={isAddModalOpen}
            />
        </View>
    );
});

RadioScreen.displayName = 'RadioScreen';

const AddRadioStationModal = ({
    onClose,
    onSubmit,
    serverConnections,
    visible,
}: {
    onClose: () => void;
    onSubmit: (input: AddAndroidRadioStationInput) => Promise<AddAndroidRadioStationResult>;
    serverConnections: ServerAuthenticationResult[];
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

    useEffect(() => {
        if (!visible) {
            return;
        }
        const firstServer = serverConnections[0];
        if (firstServer) {
            setSelectedServerId((current) => current ?? getPersistedServerAuthKey(firstServer));
        }
        setStatus({ kind: 'idle' });
    }, [serverConnections, visible]);

    const selectedServer =
        serverConnections.find((server) => getPersistedServerAuthKey(server) === selectedServerId) ??
        serverConnections[0];
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

            setThumbnailFile(nextFile);
            setThumbnailUrl('');
            setStatus({ kind: 'idle' });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Could not select the thumbnail image.';
            if (message.toLowerCase().includes('cancel')) {
                return;
            }

            setStatus({ kind: 'error', message });
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
            const message = result.warning ?? 'Radio station added.';
            setStatus({ kind: 'success', message });
            if (!result.warning) {
                setName('');
                setStreamUrl('');
                setHomepageUrl('');
                setThumbnailUrl('');
                setThumbnailFile(null);
                setTimeout(onClose, 450);
            }
        } catch (error) {
            setStatus({
                kind: 'error',
                message: error instanceof Error ? error.message : 'Could not add radio station.',
            });
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
                    {serverConnections.length === 0 ? (
                        <Text style={styles.mutedText}>
                            Connect a Samo or Navidrome server to add radio stations from Android.
                        </Text>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.addRadioForm}
                            keyboardShouldPersistTaps="handled"
                        >
                            {serverConnections.length > 1 ? (
                                <View style={styles.addRadioServerBlock}>
                                    <Text style={styles.addRadioLabel}>Server</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                    >
                                        {serverConnections.map((server) => {
                                            const key = getPersistedServerAuthKey(server);
                                            const isSelected = selectedServerId === key;

                                            return (
                                                <Pressable
                                                    accessibilityRole="button"
                                                    key={key}
                                                    onPress={() => setSelectedServerId(key)}
                                                    style={[
                                                        styles.addRadioServerPill,
                                                        isSelected &&
                                                            styles.addRadioServerPillActive,
                                                    ]}
                                                >
                                                    <Text
                                                        numberOfLines={1}
                                                        style={[
                                                            styles.addRadioServerPillText,
                                                            isSelected &&
                                                                styles.addRadioServerPillTextActive,
                                                        ]}
                                                    >
                                                        {server.title}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            ) : null}
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
