import {
    type AudioQualityBadgeItem,
    type AudioQualityBadgeTone,
    buildAudioQualityBadgeItems,
} from '@samo/core/audio-quality';
import { type QualityBadgeProfile } from '@samo/core/audio-quality';
import clsx from 'clsx';
import { memo, type ReactNode } from 'react';

import styles from './quality-badge.module.css';

import { pickQualityBadgeAsset } from '/@/renderer/services/quality-badge-assets';
import { Badge } from '/@/shared/components/badge/badge';

const getToneClassName = (tone: AudioQualityBadgeTone) => {
    if (tone === 'direct') return styles.textBadgeDirect;
    if (tone === 'transcoded') return styles.textBadgeTranscoded;
    if (tone === 'unknown') return styles.textBadgeUnknown;
    return styles.textBadgeNeutral;
};

export const QualityBadgeRow = memo(({ items }: { items: AudioQualityBadgeItem[] }) => {
    if (items.length === 0) return null;
    return (
        <div className={styles.row}>
            {items.map((item, index) => (
                <Badge
                    className={clsx(styles.textBadge, getToneClassName(item.tone))}
                    key={`${item.label}-${index}`}
                    radius="sm"
                    size="xs"
                    variant={item.tone === 'neutral' ? 'light' : 'outline'}
                >
                    {item.label}
                </Badge>
            ))}
        </div>
    );
});

QualityBadgeRow.displayName = 'QualityBadgeRow';

export const QualityBadge = memo(
    ({
        className,
        mini = false,
        overlay = false,
        player = false,
        profile,
        thumb = false,
    }: {
        className?: string;
        mini?: boolean;
        overlay?: boolean;
        player?: boolean;
        profile: QualityBadgeProfile | undefined;
        thumb?: boolean;
    }) => {
        const asset = pickQualityBadgeAsset(profile);
        if (!asset || !profile) return null;

        const khz = parseFloat((profile.sampleRate / 1000).toFixed(1));
        const label = `${profile.bitDepth}-bit ${khz} kHz`;

        return (
            <img
                alt={label}
                className={clsx(
                    styles.badge,
                    overlay && styles.overlay,
                    thumb && styles.thumb,
                    mini && styles.mini,
                    player && styles.player,
                    className,
                )}
                draggable={false}
                src={asset}
            />
        );
    },
);

QualityBadge.displayName = 'QualityBadge';

export const QualityBadgeImageWrap = memo(
    ({
        children,
        profile,
        variant = 'overlay',
    }: {
        children: ReactNode;
        profile: QualityBadgeProfile | undefined;
        variant?: 'overlay' | 'thumb';
    }) => (
        <span className={styles.imageWrap}>
            {children}
            <QualityBadge
                overlay={variant === 'overlay'}
                profile={profile}
                thumb={variant === 'thumb'}
            />
        </span>
    ),
);

QualityBadgeImageWrap.displayName = 'QualityBadgeImageWrap';

export { buildAudioQualityBadgeItems };
