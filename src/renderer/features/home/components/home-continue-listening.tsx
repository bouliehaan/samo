import clsx from 'clsx';
import { useMemo } from 'react';
import { generatePath, useNavigate } from 'react-router';

import styles from './home-continue-listening.module.css';

import {
    GridCarousel,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import {
    useRadioControls,
    useRadioPlayer,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import { AbsCoverImage } from '/@/renderer/features/search/components/abs-cover-image';
import { AppRoute } from '/@/renderer/router/routes';
import {
    RecentItem,
    recordRecentItem,
    useAudiobookActions,
    useAudiobookshelfServer,
    useRecentItems,
} from '/@/renderer/store';
import { Center } from '/@/shared/components/center/center';
import { type AppIconSelection, Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { Play } from '/@/shared/types/types';

const MAX_CONTINUE_LISTENING_ITEMS = 24;

const fallbackIconByType: Record<RecentItem['mediaType'], AppIconSelection> = {
    album: 'album',
    artist: 'artist',
    audiobook: 'metadata',
    playlist: 'playlist',
    podcast: 'microphone',
    radio: 'radio',
    song: 'track',
};

const getRecentRouteTarget = (item: RecentItem) => {
    switch (item.mediaType) {
        case 'album':
            return generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: item.itemId });
        case 'artist':
            return generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                albumArtistId: item.itemId,
            });
        case 'audiobook':
            return AppRoute.AUDIOBOOKS;
        case 'playlist':
            return generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, { playlistId: item.itemId });
        case 'podcast':
            return generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.itemId });
        case 'radio':
            return AppRoute.RADIO;
        case 'song':
            return item.song?.albumId
                ? generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: item.song.albumId })
                : AppRoute.LIBRARY_SONGS;
    }
};

const restampRecentItem = (item: RecentItem) => {
    recordRecentItem({ ...item, selectedAt: undefined });
};

export const HomeContinueListening = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const navigate = useNavigate();
    const recentItems = useRecentItems();
    const player = usePlayer();
    const radioControls = useRadioControls();
    const { currentStreamUrl, isPlaying } = useRadioPlayer();
    const audiobookActions = useAudiobookActions();
    const audiobookshelfServer = useAudiobookshelfServer();

    const items = useMemo(
        () =>
            recentItems
                .slice()
                .sort((a, b) => b.selectedAt - a.selectedAt)
                .slice(0, MAX_CONTINUE_LISTENING_ITEMS),
        [recentItems],
    );

    if (!items.length) {
        return null;
    }

    const openItem = (item: RecentItem) => {
        switch (item.mediaType) {
            case 'audiobook':
                if (audiobookshelfServer && item.rawAbsItem) {
                    audiobookActions.play(audiobookshelfServer, item.rawAbsItem);
                    return;
                }
                navigate(AppRoute.AUDIOBOOKS);
                return;
            case 'radio':
                if (!item.radioStreamUrl) {
                    navigate(AppRoute.RADIO);
                    return;
                }
                if (currentStreamUrl === item.radioStreamUrl && isPlaying) {
                    radioControls.stop();
                    return;
                }
                restampRecentItem(item);
                radioControls.play(item.radioStreamUrl, item.title, {
                    id: item.itemId,
                    imageId: item.artwork.kind === 'music' ? item.artwork.imageId : undefined,
                    imageUrl: item.artwork.kind === 'music' ? item.artwork.imageUrl : undefined,
                    serverId: item.serverId,
                });
                return;
            case 'song':
                if (item.song) {
                    player.addToQueueByData([item.song], Play.NOW);
                    return;
                }
                navigate(getRecentRouteTarget(item));
                return;
            default:
                restampRecentItem(item);
                navigate(getRecentRouteTarget(item));
        }
    };

    const cards = items.map((item) => ({
        content: <ContinueListeningCard item={item} onClick={() => openItem(item)} />,
        id: item.key,
    }));

    return (
        <GridCarousel
            cards={cards}
            containerQuery={containerQuery}
            hasNextPage={false}
            onNextPage={() => {}}
            onPrevPage={() => {}}
            rowCount={1}
            title="Continue Listening"
        />
    );
};

const ContinueListeningCard = ({ item, onClick }: { item: RecentItem; onClick: () => void }) => (
    <button className={styles.cardButton} onClick={onClick} type="button">
        <div
            className={clsx(styles.artWrap, {
                [styles.artCircle]:
                    item.artwork.kind === 'music' && item.artwork.shape === 'circle',
            })}
        >
            <RecentArtwork item={item} />
        </div>
        <Text className={styles.title} fw={600} size="sm">
            {item.title}
        </Text>
        <Text className={styles.subtitle} isMuted size="xs">
            {item.subtitle}
        </Text>
    </button>
);

const RecentArtwork = ({ item }: { item: RecentItem }) => {
    if (item.artwork.kind === 'abs') {
        return (
            <AbsCoverImage
                alt={item.title}
                fallbackIcon={item.artwork.fallbackIcon}
                itemId={item.artwork.itemId}
            />
        );
    }

    if (item.artwork.kind === 'icon') {
        return (
            <Center className={styles.placeholder}>
                <Icon icon={item.artwork.fallbackIconKey as AppIconSelection} size="40%" />
            </Center>
        );
    }

    return (
        <ItemImage
            alt={item.title}
            enableViewport={false}
            id={item.artwork.imageId}
            imageContainerProps={{
                className: styles.imageContainer,
            }}
            itemType={item.artwork.imageItemType}
            serverId={item.artwork.serverId}
            src={item.artwork.imageUrl}
            type="itemCard"
            unloaderIcon={fallbackIconByType[item.mediaType]}
        />
    );
};
