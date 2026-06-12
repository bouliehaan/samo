import { type AudioQualityBadgeItem } from '@samo/core/audio-quality';
import { type MobileQualityProfile } from '@samo/core/mobile';
import { memo } from 'react';
import { Image, Text, View } from 'react-native';

import { formatQualityProfileCompact, pickQualityBadgeAsset } from '../services/quality-badge-assets';
import { styles } from '../theme/styles';

/**
 * Player quality pills — translucent, tone-coded: gold tint for bit-perfect
 * "direct" lossless, amber for transcoded, grey for unknown.
 */
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
 * Format-specific quality badge image — the gold bit-depth mark. Picks the
 * matching 16/24/32-bit asset for the playback's bit-depth / sample-rate;
 * renders nothing when there's no exact match. `tile` is the metadata-area
 * mark beneath a tile's artwork (Qobuz-style, sat to the cover's right);
 * mini/player/thumb keep the player + queue placements.
 */
export const QualityBadge = memo(({
    mini = false,
    overlay = false,
    player = false,
    profile,
    thumb = false,
    tile = false,
}: {
    mini?: boolean;
    overlay?: boolean;
    player?: boolean;
    profile: MobileQualityProfile | undefined;
    thumb?: boolean;
    tile?: boolean;
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
                tile && styles.formatBadgeTile,
            ]}
        />
    );
});

QualityBadge.displayName = 'QualityBadge';

/**
 * Compact bit-depth / sample-rate spec ("24-bit · 96 kHz") for the wider list
 * rows, where there's room for the numbers. Same metadata placement as Qobuz.
 */
export const QualitySpec = memo(({ profile }: { profile: MobileQualityProfile | undefined }) => {
    const label = formatQualityProfileCompact(profile);
    if (!label) return null;
    return (
        <Text numberOfLines={1} style={styles.qualitySpec}>
            {label}
        </Text>
    );
});

QualitySpec.displayName = 'QualitySpec';
