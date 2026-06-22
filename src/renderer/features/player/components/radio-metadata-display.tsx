import clsx from 'clsx';
import React from 'react';
import { Link } from 'react-router';

import styles from './left-controls.module.css';

import { useIsRadioActive, useRadioStore } from '/@/renderer/features/radio/hooks/use-radio-player';
import { AppRoute } from '/@/renderer/router/routes';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { PlaybackSelectors } from '/@/shared/constants/playback-selectors';

interface RadioMetadataDisplayProps {
    onStopPropagation: (e?: React.MouseEvent) => void;
    onToggleContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const RadioMetadataDisplay = ({
    onStopPropagation,
    onToggleContextMenu,
}: RadioMetadataDisplayProps) => {
    const radioMetadata = useRadioStore((state) => state.metadata);
    const stationName = useRadioStore((state) => state.stationName);
    const streamUrl = useRadioStore((state) => state.currentStreamUrl);

    const isRadioActive = useIsRadioActive();

    if (!isRadioActive) {
        return null;
    }

    const title = radioMetadata?.title || stationName || 'Radio';
    const artist = radioMetadata?.artist || (radioMetadata?.title ? stationName : null);
    const station = stationName || streamUrl || 'Internet radio';

    return (
        <>
            <div className={styles.lineItem} onClick={onStopPropagation}>
                <Text
                    className={PlaybackSelectors.songTitle}
                    fw={650}
                    isNoSelect
                    onContextMenu={onToggleContextMenu}
                    overflow="hidden"
                >
                    {title}
                </Text>
            </div>
            <div
                className={clsx(styles.lineItem, styles.secondary, PlaybackSelectors.songArtist)}
                onClick={onStopPropagation}
            >
                <Text isMuted isNoSelect overflow="hidden" size="md">
                    {artist || station}
                </Text>
            </div>
            <div
                className={clsx(styles.lineItem, styles.secondary, PlaybackSelectors.songAlbum)}
                onClick={onStopPropagation}
            >
                <Group align="center" gap="xs" wrap="nowrap">
                    <Icon color="muted" icon="radio" size="sm" />
                    <Text
                        component={Link}
                        fw={500}
                        isLink
                        isMuted
                        isNoSelect
                        overflow="hidden"
                        size="md"
                        to={AppRoute.RADIO}
                    >
                        {station}
                    </Text>
                </Group>
            </div>
        </>
    );
};
