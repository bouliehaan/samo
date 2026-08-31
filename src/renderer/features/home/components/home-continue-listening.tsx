import clsx from 'clsx';
import { useMemo } from 'react';
import { generatePath, useNavigate } from 'react-router';

import styles from './home-continue-listening.module.css';

import {
    GridCarousel,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { LongFormCoverImage } from '/@/renderer/features/player/components/long-form-cover-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import {
    useRadioControls,
    useRadioPlayer,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import { AppRoute } from '/@/renderer/router/routes';
import {
    RecentItem,
    recordRecentItem,
    useAudiobookActions,
    useImageRes,
    useLongFormMediaServer,
    useRecentItems,
} from '/@/renderer/store';
import { Center } from '/@/shared/components/center/center';
import { type AppIconSelection, Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
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
    const longFormMediaServer = useLongFormMediaServer();

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
                if (longFormMediaServer && item.rawAbsItem) {
                    audiobookActions.play(longFormMediaServer, item.rawAbsItem);
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

    /**
     * A recents entry only stores the whole domain object for the kinds that
     * come with one — a song, and the raw item behind an audiobook or podcast.
     * Those get the exact menu they'd get anywhere else, because right-clicking
     * an audiobook here and in the Audiobooks shelf further down the same page
     * should not be two different menus. Albums, artists, playlists and
     * stations are stored as a reference only, so they fall back to the recents
     * menu the sidebar uses for the same entries: open it, or forget it.
     */
    const openContextMenu = (item: RecentItem, event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (item.song) {
            ContextMenuController.call({
                cmd: {
                    items: [item.song],
                    recentItemKey: item.key,
                    type: LibraryItem.SONG,
                },
                event,
            });
            return;
        }

        if (
            item.rawAbsItem &&
            longFormMediaServer &&
            (item.mediaType === 'audiobook' || item.mediaType === 'podcast')
        ) {
            ContextMenuController.call({
                cmd: {
                    items: [item.rawAbsItem],
                    recentItemKey: item.key,
                    server: longFormMediaServer,
                    type: item.mediaType,
                },
                event,
            });
            return;
        }

        ContextMenuController.call({
            cmd: {
                onOpen: () => openItem(item),
                recentItemKey: item.key,
                type: 'recent',
            },
            event,
        });
    };

    const cards = items.map((item) => ({
        content: (
            <ContinueListeningCard
                item={item}
                onClick={() => openItem(item)}
                onContextMenu={(event) => openContextMenu(item, event)}
            />
        ),
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

const ContinueListeningCard = ({
    item,
    onClick,
    onContextMenu,
}: {
    item: RecentItem;
    onClick: () => void;
    onContextMenu: (event: React.MouseEvent) => void;
}) => (
    <button
        className={styles.cardButton}
        onClick={onClick}
        onContextMenu={onContextMenu}
        type="button"
    >
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
        <Text className={styles.subtitle} isMuted size="sm">
            {item.subtitle}
        </Text>
    </button>
);

const RecentArtwork = ({ item }: { item: RecentItem }) => {
    const imageRes = useImageRes();

    if (item.artwork.kind === 'abs') {
        return (
            <LongFormCoverImage
                alt={item.title}
                fallbackIcon={item.artwork.fallbackIcon}
                imageUrl={item.artwork.imageUrl ?? item.rawAbsItem?.media?.metadata?.imageUrl}
                itemId={item.artwork.itemId}
                width={imageRes.itemCard}
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
