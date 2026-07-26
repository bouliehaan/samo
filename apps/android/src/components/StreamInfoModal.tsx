import { useRef } from 'react';
import { Text, View } from 'react-native';

import { formatRadioStreamFormat } from '@samo/core/mobile';

import { MotionSheet } from './MotionSheet';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { styles } from '../theme/styles';
import { getDisplaySubtitle } from '../utils/playback-time';

export const StreamInfoModal = ({
    item,
    onClose,
}: {
    item: AndroidRecentContentSourceItem | null;
    onClose: () => void;
}) => {
    // Hold the dismissed item so the sheet has something to render on the way
    // out — `item` is nulled the instant close is pressed, and the old
    // `if (!item) return null` is exactly why this sheet used to disappear
    // rather than close. The host above keeps this component mounted, so a ref
    // is all the presence this needs.
    const lastItemRef = useRef(item);
    if (item) {
        lastItemRef.current = item;
    }
    const shown = item ?? lastItemRef.current;

    const streamUrl = shown?.playback?.url;
    const homepage = shown?.playback?.homepageUrl;
    const formatLine = shown?.playback ? formatRadioStreamFormat(shown.playback) : undefined;
    const detailSubtitle = getDisplaySubtitle(shown?.subtitle);

    if (!shown) {
        return null;
    }

    return (
        <MotionSheet
            backdropStyle={styles.mediaContextBackdrop}
            onRequestClose={onClose}
            sheetStyle={styles.mediaContextSheet}
            variant="bottom"
            visible={item !== null}
        >
            <Text style={styles.contextMenuEyebrow}>Stream Information</Text>
            <Text numberOfLines={2} style={styles.contextMenuTitle}>
                {shown.title}
            </Text>
            {detailSubtitle && detailSubtitle !== homepage ? (
                <Text style={styles.mediaContextSubtitle}>{detailSubtitle}</Text>
            ) : null}
            <View style={styles.mediaContextActions}>
                {formatLine ? (
                    <View style={styles.streamInfoRow}>
                        <Text style={styles.streamInfoLabel}>Stream</Text>
                        <Text style={styles.streamInfoValue}>{formatLine}</Text>
                    </View>
                ) : null}
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
                {shown.source?.title ? (
                    <View style={styles.streamInfoRow}>
                        <Text style={styles.streamInfoLabel}>Server</Text>
                        <Text numberOfLines={1} style={styles.streamInfoValue}>
                            {shown.source.title}
                        </Text>
                    </View>
                ) : null}
            </View>
        </MotionSheet>
    );
};
