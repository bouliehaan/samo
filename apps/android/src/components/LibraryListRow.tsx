import { getItemQualityProfile } from '@samo/core/mobile';
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useMediaContextMenu } from '../contexts/media-context-menu';
import { useDownloadIndicator } from '../hooks/use-download-indicator';
import { type LibraryDisplayItem } from '../types/library-display';
import { getLibraryItemSubtitle } from '../utils/library-display';
import { PressableScale } from './PressableScale';
import { QualitySpec } from './QualityBadge';
import { DownloadIndicator } from './DownloadIndicator';
import { MediaArtwork } from './MediaArtwork';
import { presses } from '../theme/motion';
import { styles } from '../theme/styles';
import { colors, radii } from '../theme/tokens';

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
    const download = useDownloadIndicator(item);
    const itemBadgeProfile = getItemQualityProfile(item);

    return (
        <PressableScale
            {...presses.row}
            accessibilityRole="button"
            highlight={colors.panel}
            highlightRadius={radii.sm}
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
            </View>
            <View style={styles.libraryRowText}>
                <Text numberOfLines={1} style={styles.libraryRowTitle}>
                    {item.title}
                </Text>
                <View style={styles.qualityMetaRow}>
                    <DownloadIndicator
                        state={download}
                        tickStyle={styles.mediaDownloadIndicator}
                    />
                    <Text
                        numberOfLines={1}
                        style={[styles.libraryRowSubtitle, styles.qualityMetaSubtitle]}
                    >
                        {getLibraryItemSubtitle(item, mediaType)}
                    </Text>
                    <QualitySpec profile={itemBadgeProfile} />
                </View>
            </View>
            {rightAccessory ? (
                <View style={styles.libraryRowAccessory}>{rightAccessory}</View>
            ) : null}
        </PressableScale>
    );
};
