import type { QueueSong } from '/@/shared/types/domain-types';

import { Badge, Group } from '@mantine/core';
import isElectron from 'is-electron';

import { usePlaybackSettings, usePlaybackType } from '/@/renderer/store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { PlayerType } from '/@/shared/types/types';

type AudioPathBadgeProps = {
    compact?: boolean;
    inline?: boolean;
    mode?: 'detail' | 'playerbar';
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

const LOSSY_CONTAINERS = new Set(['aac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wma']);

type AudioPathBadgeItem = {
    label: string;
    tone: BadgeTone;
};

type BadgeTone = 'direct' | 'neutral' | 'transcoded' | 'unknown';

const getQualityLabel = ({
    bitDepth,
    bitRate,
    container,
    isTranscoded,
    sampleRate,
}: {
    bitDepth?: null | number;
    bitRate?: null | number;
    container?: null | string;
    isTranscoded: boolean;
    sampleRate?: null | number;
}) => {
    const containerKey = container?.toLowerCase();

    if (isTranscoded || (containerKey && LOSSY_CONTAINERS.has(containerKey))) {
        return formatBitRate(bitRate);
    }

    if (bitDepth && sampleRate) {
        return `${formatBitDepth(bitDepth, true)}/${formatSampleRate(sampleRate, true)}`;
    }

    return null;
};

const getToneStyles = (tone: BadgeTone) => {
    if (tone === 'direct') {
        return {
            root: {
                backgroundColor: 'rgba(184, 134, 11, 0.22)',
                border: '1px solid rgba(218, 165, 32, 0.36)',
                color: '#d6b25e',
            },
        };
    }

    if (tone === 'transcoded') {
        return {
            root: {
                backgroundColor: 'rgba(220, 110, 40, 0.18)',
                border: '1px solid rgba(220, 110, 40, 0.32)',
                color: '#e0a06d',
            },
        };
    }

    if (tone === 'unknown') {
        return {
            root: {
                backgroundColor: 'rgba(128, 128, 128, 0.14)',
                border: '1px solid rgba(128, 128, 128, 0.24)',
                color: 'var(--theme-colors-foreground-muted)',
            },
        };
    }

    return undefined;
};

export const AudioPathBadge = ({
    compact = false,
    inline = false,
    mode = 'detail',
    song,
}: AudioPathBadgeProps) => {
    const { transcode } = usePlaybackSettings();
    const playbackType = usePlaybackType();
    const playbackSource = usePlaybackSource();

    if (!song || (playbackSource !== null && playbackSource !== 'music')) {
        return null;
    }

    const isNativeDirect = isElectron() && playbackType === PlayerType.LOCAL;
    const isTranscoded = !isNativeDirect && transcode.enabled;
    const isWebDirect = !isNativeDirect && !isTranscoded;
    const rawContainer = isTranscoded ? transcode.format : song.container;
    const container = formatContainer(rawContainer);
    const isPremiumQualityDirect =
        !isTranscoded && PREMIUM_QUALITY_CONTAINERS.has(rawContainer?.toLowerCase() ?? '');
    const bitDepth = isPremiumQualityDirect ? formatBitDepth(song.bitDepth, compact) : null;
    const sampleRate = isPremiumQualityDirect ? formatSampleRate(song.sampleRate, compact) : null;
    const bitRate = isTranscoded ? formatBitRate(transcode.bitrate) : formatBitRate(song.bitRate);
    const pathTone: BadgeTone = isTranscoded
        ? 'transcoded'
        : isPremiumQualityDirect
          ? 'direct'
          : 'neutral';
    const detailTone: BadgeTone = isPremiumQualityDirect ? 'direct' : 'neutral';
    const pathLabel = isTranscoded
        ? compact
            ? 'Transcoded'
            : 'Transcoded Compatibility'
        : isNativeDirect
          ? compact
              ? 'Native Direct'
              : 'Native Direct'
          : isWebDirect
            ? compact
                ? 'Web Direct'
                : 'Web Direct'
            : 'Unknown Path';
    const unknownFormat = isTranscoded ? 'Unknown transcode format' : 'Unknown format';

    if (mode === 'playerbar') {
        const qualityLabel = getQualityLabel({
            bitDepth: isTranscoded ? null : song.bitDepth,
            bitRate: isTranscoded ? transcode.bitrate : song.bitRate,
            container: rawContainer,
            isTranscoded,
            sampleRate: isTranscoded ? null : song.sampleRate,
        });
        const qualityTone: BadgeTone =
            isTranscoded && qualityLabel
                ? 'transcoded'
                : !qualityLabel
                  ? 'unknown'
                  : isPremiumQualityDirect
                    ? 'direct'
                    : 'neutral';
        const playerbarItems: AudioPathBadgeItem[] = [
            { label: container ?? 'Unknown format', tone: container ? detailTone : 'unknown' },
            { label: qualityLabel ?? 'Unknown quality', tone: qualityTone },
        ];

        return (
            <Group gap={inline ? 3 : 4} justify="flex-start" wrap="nowrap">
                {playerbarItems.map((item, index) => (
                    <Badge
                        key={`${item.label}-${index}`}
                        radius={inline ? 'xs' : 'sm'}
                        size="xs"
                        styles={getToneStyles(item.tone)}
                        variant={item.tone === 'neutral' ? 'light' : 'outline'}
                    >
                        {item.label}
                    </Badge>
                ))}
            </Group>
        );
    }

    const items: AudioPathBadgeItem[] = [
        { label: pathLabel, tone: pathTone },
        { label: container ?? unknownFormat, tone: container ? detailTone : 'unknown' },
    ];

    if (isPremiumQualityDirect) {
        if (compact || inline) {
            items.push(
                bitDepth && sampleRate
                    ? { label: `${bitDepth}/${sampleRate}`, tone: 'direct' }
                    : { label: 'Unknown quality', tone: 'unknown' },
            );
        } else {
            items.push(
                bitDepth
                    ? { label: bitDepth, tone: 'direct' }
                    : { label: 'Unknown bit depth', tone: 'unknown' },
                sampleRate
                    ? { label: sampleRate, tone: 'direct' }
                    : { label: 'Unknown sample rate', tone: 'unknown' },
            );
        }
    }

    if (isTranscoded) {
        items.push(
            bitRate
                ? { label: bitRate, tone: 'transcoded' }
                : { label: 'Unknown bitrate', tone: 'unknown' },
        );
    } else if (bitRate) {
        items.push({ label: bitRate, tone: detailTone });
    }

    return (
        <Group
            gap={inline ? 3 : compact ? 4 : 'xs'}
            justify={compact || inline ? 'flex-start' : 'center'}
            wrap="nowrap"
        >
            {items.map((item, index) => (
                <Badge
                    key={`${item.label}-${index}`}
                    radius={inline ? 'xs' : 'sm'}
                    size={compact || inline ? 'xs' : 'lg'}
                    styles={getToneStyles(item.tone)}
                    variant={item.tone === 'neutral' ? 'light' : 'outline'}
                >
                    {item.label}
                </Badge>
            ))}
        </Group>
    );
};
