import { buildAudioQualityBadgeItems } from '@samo/core/audio-quality';
import {
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { ArtworkImage } from '../components/ArtworkImage';
import { CheckGlyph, MoreGlyph, TrackDownloadedGlyph } from '../components/Glyphs';
import { PressableScale } from '../components/PressableScale';
import { useDownloadedTrackKeys } from '../contexts/downloaded-keys';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import { getTrackMetadataItems } from '../player/track-metadata';
import { presses } from '../theme/motion';
import { styles } from '../theme/styles';
import { colors, radii } from '../theme/tokens';
import { getDownloadedTrackKey } from '../utils/download-keys';

/**
 * One track/chapter/episode row. Memoized and self-subscribed to the
 * downloaded-keys store, so list-level state changes (search text, selection
 * elsewhere, manage-mode toggles on other rows) skip it entirely, and a
 * download completing re-renders only the mounted rows.
 */
export const MediaDetailTrackRow = memo(function MediaDetailTrackRow({
    detail,
    discHeader,
    fallbackArtworkUrl,
    index,
    isManageMode,
    isSelected,
    onPlay,
    onToggleSelect,
    serverConnection,
    track,
}: {
    detail: MobileMediaDetail;
    /** Render a "Disc N" header above this row (multi-disc albums). */
    discHeader?: null | number;
    fallbackArtworkUrl?: string;
    index: number;
    isManageMode: boolean;
    isSelected: boolean;
    onPlay: (track: MobileMediaTrack, index: number) => void;
    onToggleSelect: (trackId: string) => void;
    serverConnection: ServerAuthenticationResult | null;
    track: MobileMediaTrack;
}) {
    const contextMenu = useMediaContextMenu();
    const downloadedTrackKeys = useDownloadedTrackKeys();

    const isMusic =
        detail.type === MobileMediaDetailType.ALBUM ||
        detail.type === MobileMediaDetailType.PLAYLIST;
    const isAlbumDetail = detail.type === MobileMediaDetailType.ALBUM;
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
    const hasOverflowActions = track.playback?.source === 'music';
    const isDownloadedTrack = downloadedTrackKeys.has(
        getDownloadedTrackKey(detail.source.id, track.id),
    );

    const row = (
        <PressableScale
            {...presses.row}
            accessibilityRole="button"
            highlight={colors.panel}
            highlightRadius={radii.sm}
            onLongPress={() => contextMenu.openForTrack(track, detail)}
            onPress={() => {
                if (isManageMode) {
                    onToggleSelect(track.id);
                    return;
                }
                onPlay(track, index);
            }}
            style={styles.trackRow}
        >
            {isManageMode ? (
                <View
                    style={[
                        styles.playlistTrackSelect,
                        isSelected && styles.playlistTrackSelectChecked,
                    ]}
                >
                    {isSelected ? <CheckGlyph color={colors.background} size={12} /> : null}
                </View>
            ) : null}
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
                            // The detail's cached artwork id is a fallback for
                            // tracks with NO art of their own — never for tracks
                            // that carry an artworkUrl. The resolver prefers the
                            // id, so passing the playlist/album id here would
                            // mask every track's real cover with the detail's
                            // (the "explo tracks all show the playlist art" bug).
                            artworkImageId={
                                track.artworkImageId ??
                                (track.artworkUrl ? undefined : detail.artworkImageId)
                            }
                            contentSource={detail.source}
                            letter={track.title.slice(0, 1).toUpperCase()}
                            serverConnection={serverConnection}
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
                                style={[styles.mediaSubtitle, styles.trackMetadataText]}
                            >
                                {meta.join(' · ')}
                            </Text>
                        ) : null}
                    </View>
                ) : null}
            </View>
            {hasOverflowActions ? (
                <PressableScale
                    {...presses.control}
                    accessibilityLabel={`More options for ${track.title}`}
                    accessibilityRole="button"
                    // Nested inside the row's own gesture: the deeper handler
                    // wins arbitration, so the row does not also fire. `chrome`
                    // because a 38dp target has no room to spend a scroll-safety
                    // window before it answers.
                    chrome
                    onPress={() => contextMenu.openForTrack(track, detail)}
                    style={styles.trackMenuButton}
                >
                    <MoreGlyph color={colors.muted} />
                </PressableScale>
            ) : null}
        </PressableScale>
    );

    if (discHeader == null) {
        return row;
    }

    return (
        <>
            <View style={styles.albumDiscHeader}>
                <Text style={styles.albumDiscHeaderText}>Disc {discHeader}</Text>
            </View>
            {row}
        </>
    );
});
