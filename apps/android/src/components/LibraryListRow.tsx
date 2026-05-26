import { getItemQualityProfile } from '@samo/core/mobile';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useDownloadedTrackKeys } from '../contexts/downloaded-keys';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import { getDownloadedTrackKey } from '../utils/download-keys';
import { type LibraryDisplayItem } from '../types/library-display';
import { getLibraryItemSubtitle } from '../utils/library-display';
import { QualityBadge } from './QualityBadge';
import { TrackDownloadedGlyph } from './Glyphs';
import { MediaArtwork } from './MediaArtwork';
import { styles } from '../theme/styles';

export const LibraryListRow = ({
    displayItem,
    onPress,
    rightAccessory,
}: {
    displayItem: LibraryDisplayItem;
    onPress: () => void;
    rightAccessory?: ReactNode;
}) => {
    const { item, mediaType } = displayItem;
    const contextMenu = useMediaContextMenu();
    const downloadedTrackKeys = useDownloadedTrackKeys();
    const isDownloadedTrack =
        mediaType === 'songs' &&
        downloadedTrackKeys.has(getDownloadedTrackKey(item.source?.id, item.id));
    const itemBadgeProfile = getItemQualityProfile(item);

    return (
        <Pressable
            accessibilityRole="button"
            onLongPress={() => contextMenu.openForItem(item)}
            onPress={onPress}
            style={styles.libraryRow}
        >
            <View>
                <MediaArtwork
                    artworkImageId={item.artworkImageId}
                    artworkUrl={item.artworkUrl}
                    contentSource={item.source}
                    mediaType={mediaType}
                    size="row"
                    title={item.title}
                />
                <QualityBadge thumb profile={itemBadgeProfile} />
            </View>
            <View style={styles.libraryRowText}>
                <Text numberOfLines={1} style={styles.libraryRowTitle}>
                    {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.libraryRowSubtitle}>
                    {getLibraryItemSubtitle(item, mediaType)}
                </Text>
            </View>
            {isDownloadedTrack ? (
                <View
                    style={[
                        styles.libraryRowDownloadIndicator,
                        rightAccessory
                            ? styles.libraryRowDownloadIndicatorWithAccessory
                            : null,
                    ]}
                >
                    <TrackDownloadedGlyph />
                </View>
            ) : null}
            {rightAccessory ? (
                <View style={styles.libraryRowAccessory}>{rightAccessory}</View>
            ) : null}
        </Pressable>
    );
};
