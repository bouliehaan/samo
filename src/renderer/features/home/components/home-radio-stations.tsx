import { ActionIcon, Box, Center, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Link } from 'react-router';

import styles from './home-radio-stations.module.css';

import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { radioQueries } from '/@/renderer/features/radio/api/radio-api';
import {
    useRadioControls,
    useRadioPlayer,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';

const MAX_HOME_RADIO_STATIONS = 8;

export const HomeRadioStations = () => {
    const server = useCurrentServer();
    const { currentStreamUrl, isPlaying } = useRadioPlayer();
    const { play, stop } = useRadioControls();

    const radioListQuery = useQuery({
        ...radioQueries.list({ query: undefined, serverId: server?.id ?? '' }),
        enabled: Boolean(server?.id),
    });

    const stations = (radioListQuery.data ?? []).slice(0, MAX_HOME_RADIO_STATIONS);

    if (!server?.id || !stations.length) {
        return null;
    }

    return (
        <section className={styles.section}>
            <div className={styles.header}>
                <Text fw={700} size="xl">
                    Radio stations
                </Text>
                <Button component={Link} size="compact-sm" to={AppRoute.RADIO} variant="subtle">
                    View all
                </Button>
            </div>

            <div className={styles.grid}>
                {stations.map((station) => {
                    const isCurrentStation = currentStreamUrl === station.streamUrl;
                    const stationIsPlaying = isCurrentStation && isPlaying;

                    const handleClick = () => {
                        if (stationIsPlaying) {
                            stop();
                            return;
                        }

                        play(station.streamUrl, station.name, {
                            id: station.id,
                            imageId: station.imageId,
                            imageUrl: station.imageUrl,
                            serverId: server.id,
                        });
                    };

                    return (
                        <article
                            className={clsx(styles.card, {
                                [styles['card-active']]: isCurrentStation,
                            })}
                            key={station.id}
                        >
                            <Box className={styles['image-wrap']}>
                                <ItemImage
                                    enableViewport={false}
                                    id={station.imageId ?? undefined}
                                    imageContainerProps={{
                                        className: styles['image-container'],
                                    }}
                                    itemType={LibraryItem.RADIO_STATION}
                                    serverId={server.id}
                                    src={station.imageUrl ?? ''}
                                    type="itemCard"
                                />

                                {!station.imageId && !station.imageUrl ? (
                                    <Center className={styles.placeholder}>
                                        <Icon color="muted" icon="radio" size="40%" />
                                    </Center>
                                ) : null}

                                <ActionIcon
                                    aria-label={
                                        stationIsPlaying
                                            ? `Stop ${station.name}`
                                            : `Play ${station.name}`
                                    }
                                    className={styles['play-overlay']}
                                    onClick={handleClick}
                                    radius="xl"
                                    size="lg"
                                    variant="filled"
                                >
                                    <span className={styles['play-symbol']}>
                                        {stationIsPlaying ? 'Ⅱ' : '▶'}
                                    </span>
                                </ActionIcon>
                            </Box>

                            <Stack gap={2}>
                                <Text className={styles.name} fw={600} size="sm">
                                    {station.name}
                                </Text>
                                <Text className={styles.subtitle} isMuted size="xs">
                                    {station.homepageUrl || station.streamUrl}
                                </Text>
                            </Stack>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};
