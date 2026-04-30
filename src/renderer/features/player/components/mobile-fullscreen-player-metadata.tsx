import clsx from 'clsx';
import { memo, MouseEvent } from 'react';

import styles from './mobile-fullscreen-player.module.css';

import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { Separator } from '/@/shared/components/separator/separator';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { PlaybackSelectors } from '/@/shared/constants/playback-selectors';
import { QueueSong } from '/@/shared/types/domain-types';

interface MobileFullscreenPlayerMetadataProps {
    currentSong?: QueueSong;
    onToggleFavorite: (e: MouseEvent<HTMLButtonElement>) => void;
    radioArtist?: string;
    radioStationName?: string;
    radioTitle?: string;
}

export const MobileFullscreenPlayerMetadata = memo(
    ({
        currentSong,
        onToggleFavorite,
        radioArtist,
        radioStationName,
        radioTitle,
    }: MobileFullscreenPlayerMetadataProps) => {
        const isRadio = radioTitle !== undefined || radioStationName !== undefined;

        const title = isRadio ? radioTitle || radioStationName || 'Radio' : currentSong?.name;
        const artistsDisplay = isRadio
            ? radioArtist || radioStationName || '—'
            : currentSong?.artists?.map((a) => a.name).join(', ');
        const album = isRadio ? radioStationName || '—' : currentSong?.album;
        const container = currentSong?.container;
        const year = currentSong?.releaseYear;
        const isFavorite = currentSong?.userFavorite;
        const hasMetadata = !isRadio && (container || year);

        return (
            <div className={styles.metadataContainer}>
                <div className={styles.titleRow}>
                    <TextTitle
                        className={PlaybackSelectors.songTitle}
                        fw={700}
                        order={2}
                        ta="center"
                    >
                        {title || '—'}
                    </TextTitle>
                </div>
                <Text className={clsx(PlaybackSelectors.songArtist)} size="md" truncate>
                    {artistsDisplay || '—'}
                </Text>
                <Text className={clsx(PlaybackSelectors.songAlbum)} size="md" truncate>
                    {album || '—'}
                </Text>
                {hasMetadata && (
                    <Group align="center" className={styles.metadataRow} gap="xs" wrap="nowrap">
                        {container && <Text size="xs">{container}</Text>}
                        {year && (
                            <>
                                {container && <Separator />}
                                <Text size="xs">{year}</Text>
                            </>
                        )}
                    </Group>
                )}
                {!isRadio && (
                    <Group align="center" className={styles.actionsRow} gap="xs">
                        <ActionIcon
                            icon="favorite"
                            iconProps={{
                                fill: isFavorite ? 'primary' : undefined,
                                size: 'md',
                            }}
                            onClick={onToggleFavorite}
                            size="sm"
                            variant="subtle"
                        />
                    </Group>
                )}
            </div>
        );
    },
);

MobileFullscreenPlayerMetadata.displayName = 'MobileFullscreenPlayerMetadata';
