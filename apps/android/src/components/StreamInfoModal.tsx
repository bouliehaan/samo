import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { ArtworkImage } from '../components/ArtworkImage';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { type BookInfoState } from '../types/book-info';
import { getContentItemKey } from '../utils/content-item';

export const StreamInfoModal = ({
    item,
    onClose,
}: {
    item: AndroidRecentContentSourceItem | null;
    onClose: () => void;
}) => {
    if (!item) {
        return null;
    }

    const streamUrl = item.playback?.url;
    const homepage = item.playback?.homepageUrl;

    return (
        <Modal animationType="fade" onRequestClose={onClose} transparent visible>
            <Pressable onPress={onClose} style={styles.mediaContextBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.mediaContextSheet}
                >
                    <Text style={styles.contextMenuEyebrow}>Stream Information</Text>
                    <Text numberOfLines={2} style={styles.contextMenuTitle}>
                        {item.title}
                    </Text>
                    {item.subtitle && item.subtitle !== homepage ? (
                        <Text style={styles.mediaContextSubtitle}>{item.subtitle}</Text>
                    ) : null}
                    <View style={styles.mediaContextActions}>
                        {homepage ? (
                            <View style={styles.streamInfoRow}>
                                <Text style={styles.streamInfoLabel}>Homepage</Text>
                                <Text numberOfLines={2} style={styles.streamInfoValue}>
                                    {homepage}
                                </Text>
                            </View>
                        ) : null}
                        {streamUrl ? (
                            <View style={styles.streamInfoRow}>
                                <Text style={styles.streamInfoLabel}>Stream URL</Text>
                                <Text numberOfLines={3} style={styles.streamInfoValue}>
                                    {streamUrl}
                                </Text>
                            </View>
                        ) : null}
                        {item.source?.title ? (
                            <View style={styles.streamInfoRow}>
                                <Text style={styles.streamInfoLabel}>Server</Text>
                                <Text numberOfLines={1} style={styles.streamInfoValue}>
                                    {item.source.title}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};
