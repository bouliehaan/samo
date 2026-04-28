import type { QueueSong } from '/@/shared/types/domain-types';

import { Badge, Group } from '@mantine/core';

import { usePlaybackSettings } from '/@/renderer/store';

type AudioPathBadgeProps = {
    compact?: boolean;
    inline?: boolean;
    song?: QueueSong;
};

const PREMIUM_QUALITY_CONTAINERS = new Set([
    'aif',
    'aiff',
    'alac',
    'ape',
    'dsd',
    'dsf',
    'flac',
    'wav',
]);

const formatContainer = (container?: null | string) => {
    if (!container) return null;

    return container.toUpperCase();
};

const formatBitDepth = (bitDepth?: null | number, compact?: boolean) => {
    if (!bitDepth) return null;

    return compact ? `${bitDepth}` : `${bitDepth}-bit`;
};

const formatSampleRate = (sampleRate?: null | number, compact?: boolean) => {
    if (!sampleRate) return null;

    const khz = sampleRate / 1000;
    const formatted = Number.isInteger(khz) ? khz.toFixed(0) : khz.toFixed(1);

    return compact ? formatted : `${formatted} kHz`;
};

const formatBitRate = (bitRate?: null | number) => {
    if (!bitRate) return null;

    // Subsonic/Navidrome reports bitrate as kbps. If a source ever reports raw
    // bits-per-second, normalize only clearly large values.
    const kbps = bitRate >= 100_000 ? Math.round(bitRate / 1000) : Math.round(bitRate);

    return `${kbps} kbps`;
};

export const AudioPathBadge = ({ compact = false, inline = false, song }: AudioPathBadgeProps) => {
    const { transcode } = usePlaybackSettings();

    if (!song) {
        return null;
    }

    const rawContainer = transcode.enabled ? transcode.format : song.container;
    const isPremiumQualityDirect =
        !transcode.enabled && PREMIUM_QUALITY_CONTAINERS.has(rawContainer?.toLowerCase() ?? '');

    const pathLabel = transcode.enabled ? 'Transcoded' : compact ? 'Direct' : 'Direct Play';
    const container = formatContainer(rawContainer);
    const bitDepth = isPremiumQualityDirect ? formatBitDepth(song.bitDepth, compact) : null;
    const sampleRate = isPremiumQualityDirect ? formatSampleRate(song.sampleRate, compact) : null;
    const bitRate = transcode.enabled
        ? formatBitRate(transcode.bitrate)
        : formatBitRate(song.bitRate);

    const sourceQuality = compact && bitDepth && sampleRate ? `${bitDepth}/${sampleRate}` : null;

    const items = inline
        ? [container, sourceQuality, transcode.enabled ? bitRate : null].filter(Boolean)
        : compact
          ? [pathLabel, container, sourceQuality, transcode.enabled ? bitRate : null].filter(Boolean)
          : [pathLabel, container, bitDepth, sampleRate, bitRate].filter(Boolean);

    return (
        <Group
            gap={inline ? 3 : compact ? 4 : 'xs'}
            justify={compact || inline ? 'flex-start' : 'center'}
            wrap="nowrap"
        >
            {items.map((item) => (
                <Badge
                    color={isPremiumQualityDirect ? undefined : undefined}
                    key={item}
                    radius={inline ? 'xs' : 'sm'}
                    size={compact || inline ? 'xs' : 'lg'}
                    styles={
                        isPremiumQualityDirect
                            ? {
                                  root: {
                                      backgroundColor: 'rgba(184, 134, 11, 0.22)',
                                      border: '1px solid rgba(218, 165, 32, 0.36)',
                                      color: '#d6b25e',
                                  },
                              }
                            : undefined
                    }
                    variant={isPremiumQualityDirect ? 'outline' : 'light'}
                >
                    {item}
                </Badge>
            ))}
        </Group>
    );
};
