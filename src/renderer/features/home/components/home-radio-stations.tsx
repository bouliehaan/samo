import { ActionIcon, Box, Center, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo } from 'react';

import styles from './home-radio-stations.module.css';

import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { HomeSectionTitle } from '/@/renderer/features/home/components/home-section-title';
import { radioQueries } from '/@/renderer/features/radio/api/radio-api';
import {
    useRadioControls,
    useRadioPlayer,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer } from '/@/renderer/store';
import { useFavoriteRadioStationIds } from '/@/renderer/store/library-favorites.store';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { useElementSize } from '/@/shared/hooks/use-element-size';
import { LibraryItem } from '/@/shared/types/domain-types';

// Card min-width and gap match the .grid styles below; keep in sync.
const CARD_MIN_WIDTH = 220;
const CARD_GAP = 16;
const HOME_ROWS = 2;

const computeColumns = (width: number) => {
    if (width <= 0) return 1;
    return Math.max(1, Math.floor((width + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP)));
};

export const HomeRadioStations = () => {
    const server = useCurrentServer();
    const { currentStreamUrl, isPlaying } = useRadioPlayer();
    const { play, stop } = useRadioControls();
    const favoriteIds = useFavoriteRadioStationIds(server?.id);
    const { ref: gridRef, width: gridWidth } = useElementSize();

    const radioListQuery = useQuery({
        ...radioQueries.list({ query: undefined, serverId: server?.id ?? '' }),
        enabled: Boolean(server?.id),
    });

    const allStations = useMemo(() => radioListQuery.data ?? [], [radioListQuery.data]);

    const favoriteStations = useMemo(
        () => allStations.filter((station) => favoriteIds.has(station.id)),
        [allStations, favoriteIds],
    );

    const nonFavoriteStations = useMemo(
        () => allStations.filter((station) => !favoriteIds.has(station.id)),
        [allStations, favoriteIds],
    );

    const sourceStations = useMemo(
        () => [...favoriteStations, ...nonFavoriteStations],
        [favoriteStations, nonFavoriteStations],
    );

    const visibleCount = computeColumns(gridWidth) * HOME_ROWS;
    const stations = sourceStations.slice(0, visibleCount);

    if (!server?.id || !stations.length) {
        return null;
    }

    return (
        <section className={styles.section}>
            <HomeSectionTitle title="Radio Stations" to={AppRoute.RADIO} />
            <div className={styles.grid} ref={gridRef}>
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
                            onClick={handleClick}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                ContextMenuController.call({
                                    cmd: { items: [station], serverId: server.id, type: 'radio' },
                                    event,
                                });
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleClick();
                                }
                            }}
                            role="button"
                            tabIndex={0}
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
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleClick();
                                    }}
                                    radius="xl"
                                    size="lg"
                                    variant="filled"
                                >
                                    <span className={styles['play-symbol']}>
                                        {stationIsPlaying ? 'Ⅱ' : '▶'}
                                    </span>
                                </ActionIcon>
                            </Box>

                            <Stack className={styles.copy} gap={2}>
                                <span className={styles.liveBadge}>LIVE</span>
                                <Text className={styles.name} fw={700} size="sm">
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
