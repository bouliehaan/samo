import { type AudioQualityBadgeItem } from '@samo/core/audio-quality';
import { type MobileQualityProfile } from '@samo/core/mobile';
import { memo } from 'react';
import { Image, Text, View } from 'react-native';

import { pickQualityBadgeAsset } from '../services/quality-badge-assets';
import { styles } from '../theme/styles';

export const QualityBadgeRow = memo(({ items }: { items: AudioQualityBadgeItem[] }) => {
    return (
        <View style={styles.qualityBadgeRow}>
            {items.map((item, index) => (
                <View
                    key={`${item.label}-${index}`}
                    style={[
                        styles.qualityBadge,
                        item.tone === 'direct'
                            ? styles.qualityBadgeDirect
                            : item.tone === 'transcoded'
                              ? styles.qualityBadgeTranscoded
                              : item.tone === 'unknown'
                                ? styles.qualityBadgeUnknown
                                : null,
                    ]}
                >
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.qualityBadgeText,
                            item.tone === 'direct'
                                ? styles.qualityBadgeTextDirect
                                : item.tone === 'transcoded'
                                  ? styles.qualityBadgeTextTranscoded
                                  : item.tone === 'unknown'
                                    ? styles.qualityBadgeTextUnknown
                                    : null,
                        ]}
                    >
                        {item.label}
                    </Text>
                </View>
            ))}
        </View>
    );
});

QualityBadgeRow.displayName = 'QualityBadgeRow';

/**
 * Format-specific quality badge. Picks the matching 16/24/32-bit asset for
 * the playback's bit-depth / sample-rate; renders nothing when there's no
 * exact match in the badge set.
 */
export const QualityBadge = memo(({
    mini = false,
    overlay = false,
    player = false,
    profile,
    thumb = false,
}: {
    mini?: boolean;
    overlay?: boolean;
    player?: boolean;
    profile: MobileQualityProfile | undefined;
    thumb?: boolean;
}) => {
    const asset = pickQualityBadgeAsset(profile);
    if (!asset || !profile) return null;
    return (
        <Image
            accessibilityLabel={`${profile.bitDepth}-bit ${(profile.sampleRate / 1000).toFixed(1).replace(/\.0$/, '')} kHz`}
            source={asset}
            style={[
                styles.formatBadge,
                mini && styles.formatBadgeMini,
                overlay && styles.formatBadgeOverlay,
                player && styles.formatBadgePlayer,
                thumb && styles.formatBadgeThumb,
            ]}
        />
    );
});

QualityBadge.displayName = 'QualityBadge';
