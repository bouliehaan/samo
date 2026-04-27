import type { QueueSong } from '/@/shared/types/domain-types';

import { Badge, Group } from '@mantine/core';

import { usePlaybackSettings } from '/@/renderer/store';

type AudioPathBadgeProps = {
    song?: QueueSong;
};

const formatContainer = (container?: null | string) => {
    if (!container) return null;

    return container.toUpperCase();
};

const formatBitDepth = (bitDepth?: null | number) => {
    if (!bitDepth) return null;

    return `${bitDepth}-bit`;
};

const formatSampleRate = (sampleRate?: null | number) => {
    if (!sampleRate) return null;

    const khz = sampleRate / 1000;

    return `${Number.isInteger(khz) ? khz.toFixed(0) : khz.toFixed(1)} kHz`;
};

const formatBitRate = (bitRate?: null | number) => {
    if (!bitRate) return null;

    // Subsonic/Navidrome reports bitrate as kbps. If a source ever reports raw
    // bits-per-second, normalize only clearly large values.
    const kbps = bitRate >= 100_000 ? Math.round(bitRate / 1000) : Math.round(bitRate);

    return `${kbps} kbps`;
};

export const AudioPathBadge = ({ song }: AudioPathBadgeProps) => {
    const { transcode } = usePlaybackSettings();

    if (!song) {
        return null;
    }

    const pathLabel = transcode.enabled ? 'Transcoded' : 'Direct Play';
    const container = transcode.enabled
        ? formatContainer(transcode.format)
        : formatContainer(song.container);
    const bitDepth = transcode.enabled ? null : formatBitDepth(song.bitDepth);
    const sampleRate = transcode.enabled ? null : formatSampleRate(song.sampleRate);
    const bitRate = transcode.enabled
        ? formatBitRate(transcode.bitrate)
        : formatBitRate(song.bitRate);

    const items = [pathLabel, container, bitDepth, sampleRate, bitRate].filter(Boolean);

    return (
        <Group gap="xs" justify="center">
            {items.map((item) => (
                <Badge key={item} radius="sm" size="lg" variant="light">
                    {item}
                </Badge>
            ))}
        </Group>
    );
};
