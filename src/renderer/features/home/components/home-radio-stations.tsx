import { formatRadioNowPlayingLine, isRedundantRadioStationLabel } from '@samo/core/mobile';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import styles from './home-sections.module.css';

import {
    GridCarousel,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import itemCardControlsStyles from '/@/renderer/components/item-card/item-card-controls.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { HomeSectionTitle } from '/@/renderer/features/home/components/home-section-title';
import { HomeTile } from '/@/renderer/features/home/components/home-tile';
import { radioQueries } from '/@/renderer/features/radio/api/radio-api';
import {
    RadioMetadata,
    useRadioControls,
    useRadioPlayer,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer } from '/@/renderer/store';
import { hiddenHomeItemKey, useHiddenHomeKeys } from '/@/renderer/store/hidden-home-items.store';
import { useFavoriteRadioStationIds } from '/@/renderer/store/library-favorites.store';
import { Icon } from '/@/shared/components/icon/icon';
import { InternetRadioStation, LibraryItem } from '/@/shared/types/domain-types';

const SHELF_LIMIT = 12;

/**
 * The one line under a station's name: what it is airing, or nothing.
 *
 * The station playing here gets the player's own ICY metadata, which is live;
 * every other station gets what the server's last probe heard. A line that
 * only repeats the station's name says nothing and is dropped. There is no
 * fallback — the relay URL that used to sit here is an implementation detail,
 * and "Internet station" is already what the shelf is called.
 */
const nowPlayingLine = (station: InternetRadioStation, live: null | RadioMetadata) => {
    const source = live
        ? { artist: live.artist ?? undefined, title: live.title ?? undefined }
        : station.nowPlaying;
    const line = formatRadioNowPlayingLine(source);
    return line && !isRedundantRadioStationLabel(station.name, line) ? line : null;
};

export const HomeRadioStations = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const server = useCurrentServer();
    const { currentStreamUrl, isPlaying, metadata } = useRadioPlayer();
    const { play, stop } = useRadioControls();
    const favoriteIds = useFavoriteRadioStationIds(server?.id);
    const hiddenKeys = useHiddenHomeKeys();

    const radioListQuery = useQuery({
        ...radioQueries.list({ query: undefined, serverId: server?.id ?? '' }),
        enabled: Boolean(server?.id),
    });

    // Favourites lead, then the rest in the server's order.
    const stations = useMemo(() => {
        const visible = (radioListQuery.data ?? []).filter(
            (station) =>
                !hiddenKeys.has(
                    hiddenHomeItemKey({
                        id: station.id,
                        serverId: server?.id,
                        type: 'radio',
                    }),
                ),
        );
        return [
            ...visible.filter((station) => favoriteIds.has(station.id)),
            ...visible.filter((station) => !favoriteIds.has(station.id)),
        ].slice(0, SHELF_LIMIT);
    }, [radioListQuery.data, hiddenKeys, server?.id, favoriteIds]);

    if (!server?.id || !stations.length) {
        return null;
    }

    const serverId = server.id;

    const cards = stations.map((station) => {
        const isCurrentStation = currentStreamUrl === station.streamUrl;
        const stationIsPlaying = isCurrentStation && isPlaying;

        const toggle = () => {
            if (stationIsPlaying) {
                stop();
                return;
            }

            play(station.streamUrl, station.name, {
                id: station.id,
                imageId: station.imageId,
                imageUrl: station.imageUrl,
                serverId,
            });
        };

        const openContextMenu = (event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            ContextMenuController.call({
                cmd: {
                    homeItemKey: hiddenHomeItemKey({
                        id: station.id,
                        serverId,
                        type: 'radio',
                    }),
                    items: [station],
                    serverId,
                    type: 'radio',
                },
                event,
            });
        };

        return {
            content: (
                <HomeTile
                    art={
                        <ItemImage
                            alt={station.name}
                            enableViewport={false}
                            id={station.imageId ?? undefined}
                            imageContainerProps={{ className: styles.imageContainer }}
                            itemType={LibraryItem.RADIO_STATION}
                            serverId={serverId}
                            src={station.imageUrl ?? ''}
                            type="itemCard"
                        />
                    }
                    badge={
                        stationIsPlaying ? (
                            <>
                                <Icon icon="radio" size="0.78rem" />
                                Playing
                            </>
                        ) : undefined
                    }
                    controls={
                        <>
                            <PlayButton
                                classNames={`${itemCardControlsStyles.playButton} ${itemCardControlsStyles.primary} ${styles.centeredControl}`}
                                fill
                                icon={stationIsPlaying ? 'mediaStop' : 'mediaPlay'}
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    toggle();
                                }}
                            />
                            <button
                                className={`${styles.overlayBtn} ${styles.overlayOptions}`}
                                onClick={openContextMenu}
                                type="button"
                            >
                                <Icon icon="ellipsisHorizontal" size="lg" />
                            </button>
                        </>
                    }
                    isActive={stationIsPlaying}
                    onClick={toggle}
                    onContextMenu={openContextMenu}
                    subtitle={nowPlayingLine(station, isCurrentStation ? metadata : null)}
                    title={station.name}
                />
            ),
            id: station.id,
        };
    });

    return (
        <GridCarousel
            cards={cards}
            containerQuery={containerQuery}
            hasNextPage={false}
            onNextPage={() => {}}
            onPrevPage={() => {}}
            rowCount={1}
            title={<HomeSectionTitle title="Radio Stations" to={AppRoute.RADIO} />}
        />
    );
};
