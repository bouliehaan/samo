import type { QueueSong } from '/@/shared/types/domain-types';

import { Badge, Group } from '@mantine/core';
import { type AudioQualityBadgeTone, buildAudioQualityBadgeItems } from '@samo/core/audio-quality';
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

const getToneStyles = (tone: AudioQualityBadgeTone) => {
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
    const deliveryKind = isNativeDirect
        ? 'native-direct'
        : transcode.enabled
          ? 'transcoded'
          : 'web-direct';

    const items = buildAudioQualityBadgeItems({
        bitDepth: song.bitDepth,
        bitRate: song.bitRate,
        compact,
        container: song.container,
        deliveryKind,
        inline,
        mode,
        sampleRate: song.sampleRate,
        transcodeBitrate: transcode.bitrate,
        transcodeFormat: transcode.format,
    });

    if (mode === 'playerbar') {
        return (
            <Group gap={inline ? 3 : 4} justify="flex-start" wrap="nowrap">
                {items.map((item, index) => (
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
