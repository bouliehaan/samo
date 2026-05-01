import { useQueries, useQuery } from '@tanstack/react-query';
import { ReactNode, useMemo } from 'react';
import { generatePath, useNavigate } from 'react-router';

import styles from './home-continue-listening.module.css';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import {
    GridCarousel,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { HomeSectionTitle } from '/@/renderer/features/home/components/home-section-title';
import { AbsCoverImage } from '/@/renderer/features/search/components/abs-cover-image';
import { AppRoute } from '/@/renderer/router/routes';
import {
    recordRecentPodcast,
    useAudiobookActions,
    useAudiobookshelfServer,
} from '/@/renderer/store';
import {
    useFavoriteAudiobookIds,
    useFavoritePodcastIds,
} from '/@/renderer/store/library-favorites.store';
import {
    AudiobookshelfLibrary,
    AudiobookshelfLibraryItem,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { Text } from '/@/shared/components/text/text';

const ABS_LIBRARY_STALE_TIME_MS = 1000 * 60 * 5;
const ABS_LIBRARY_GC_TIME_MS = 1000 * 60 * 30;
const HOME_ABS_ITEM_LIMIT = 24;

type AbsMediaKind = 'audiobook' | 'podcast';

const getAbsTitle = (item: AudiobookshelfLibraryItem) =>
    item.media?.metadata?.title ?? item.name ?? 'Untitled';

const getAbsAuthor = (item: AudiobookshelfLibraryItem) => {
    const meta = item.media?.metadata;

    return (
        meta?.author ??
        meta?.authorName ??
        item.media?.authorName ??
        meta?.authors?.map((author) => author.name).join(', ') ??
        item.media?.authors?.map((author) => author.name).join(', ') ??
        ''
    );
};

const getAbsNarrator = (item: AudiobookshelfLibraryItem) => {
    const meta = item.media?.metadata;

    return meta?.narratorName ?? meta?.narrators?.join(', ') ?? item.media?.narratorName ?? '';
};

const formatAbsDuration = (duration?: null | number) => {
    if (!duration) return '';

    const hours = Math.floor(duration / 3600);
    const minutes = Math.round((duration % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
};

const countText = (count: null | number | undefined, singular: string) => {
    if (typeof count !== 'number') return undefined;

    return `${count} ${singular}${count === 1 ? '' : 's'}`;
};

const getAbsSubtitle = (item: AudiobookshelfLibraryItem, kind: AbsMediaKind) => {
    const author = getAbsAuthor(item);

    if (kind === 'podcast') {
        return countText(item.numEpisodes, 'episode') || author || 'Podcast';
    }

    const narrator = getAbsNarrator(item);
    const duration = formatAbsDuration(item.media?.duration);

    return (
        [author, narrator ? `Narrated by ${narrator}` : '', duration].filter(Boolean).join(' - ') ||
        item.media?.metadata?.publishedYear ||
        item.media?.publishedYear ||
        'Audiobook'
    );
};

const getLibrariesForKind = (libraries: AudiobookshelfLibrary[], kind: AbsMediaKind) =>
    libraries.filter((library) =>
        kind === 'audiobook' ? library.mediaType === 'book' : library.mediaType === 'podcast',
    );

const isItemForKind = (
    item: AudiobookshelfLibraryItem,
    library: AudiobookshelfLibrary | undefined,
    kind: AbsMediaKind,
) => {
    if (kind === 'audiobook') {
        return item.mediaType === 'book' || library?.mediaType === 'book';
    }

    return (
        item.mediaType === 'podcast' ||
        library?.mediaType === 'podcast' ||
        Boolean(item.media?.episodes)
    );
};

const useHomeAbsItems = (kind: AbsMediaKind) => {
    const server = useAudiobookshelfServer();
    const serverId = server?.id ?? '';

    const librariesQuery = useQuery({
        enabled: Boolean(server),
        gcTime: ABS_LIBRARY_GC_TIME_MS,
        queryFn: () => audiobookshelfController.getLibraries(server!),
        queryKey: ['audiobookshelf', 'home', 'libraries', serverId],
        staleTime: ABS_LIBRARY_STALE_TIME_MS,
    });

    const libraries = useMemo(
        () => getLibrariesForKind(librariesQuery.data?.libraries ?? [], kind),
        [librariesQuery.data?.libraries, kind],
    );

    const itemQueries = useQueries({
        queries: libraries.map((library) => ({
            enabled: Boolean(server),
            gcTime: ABS_LIBRARY_GC_TIME_MS,
            queryFn: () => audiobookshelfController.getLibraryItems(server!, library.id),
            queryKey: ['audiobookshelf', 'home', 'library-items', serverId, kind, library.id],
            staleTime: ABS_LIBRARY_STALE_TIME_MS,
        })),
    });

    const items = useMemo(
        () =>
            itemQueries.flatMap((query, index) => {
                const library = libraries[index];

                return (query.data?.results ?? []).filter((item) =>
                    isItemForKind(item, library, kind),
                );
            }),
        [itemQueries, libraries, kind],
    );

    return { items, server };
};

const HomeAbsFavoriteCarousel = ({
    containerQuery,
    kind,
    title,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    kind: AbsMediaKind;
    title: ReactNode | string;
}) => {
    const navigate = useNavigate();
    const audiobookActions = useAudiobookActions();
    const { items: allItems, server } = useHomeAbsItems(kind);
    const audiobookFavoriteIds = useFavoriteAudiobookIds(server?.id);
    const podcastFavoriteIds = useFavoritePodcastIds(server?.id);
    const favoriteIds = kind === 'audiobook' ? audiobookFavoriteIds : podcastFavoriteIds;

    const items = useMemo(() => {
        const favoriteItems = allItems.filter((item) => favoriteIds.has(item.id));
        const nonFavoriteItems = allItems.filter((item) => !favoriteIds.has(item.id));
        return [...favoriteItems, ...nonFavoriteItems].slice(0, HOME_ABS_ITEM_LIMIT);
    }, [allItems, favoriteIds]);

    if (!server || !items.length) {
        return null;
    }

    const openItem = (item: AudiobookshelfLibraryItem) => {
        if (kind === 'audiobook') {
            audiobookActions.play(server, item);
            return;
        }

        recordRecentPodcast(item, server.id);
        navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
    };

    const cards = items.map((item) => ({
        content: (
            <HomeAbsFavoriteCard
                item={item}
                kind={kind}
                onClick={() => openItem(item)}
                server={server}
            />
        ),
        id: item.id,
    }));

    return (
        <GridCarousel
            cards={cards}
            containerQuery={containerQuery}
            hasNextPage={false}
            onNextPage={() => {}}
            onPrevPage={() => {}}
            rowCount={1}
            title={title}
        />
    );
};

const HomeAbsFavoriteCard = ({
    item,
    kind,
    onClick,
    server,
}: {
    item: AudiobookshelfLibraryItem;
    kind: AbsMediaKind;
    onClick: () => void;
    server: NonNullable<ReturnType<typeof useAudiobookshelfServer>>;
}) => {
    const title = getAbsTitle(item);

    return (
        <button
            aria-label={`${kind === 'audiobook' ? 'Play' : 'Open'} ${title}`}
            className={styles.cardButton}
            onClick={onClick}
            onContextMenu={(event) => {
                event.preventDefault();
                ContextMenuController.call({
                    cmd: { items: [item], server, type: kind },
                    event,
                });
            }}
            type="button"
        >
            <div className={styles.artWrap}>
                <AbsCoverImage
                    alt={title}
                    fallbackIcon={kind === 'audiobook' ? 'metadata' : 'microphone'}
                    itemId={item.id}
                />
            </div>
            <Text className={styles.title} fw={600} size="sm">
                {title}
            </Text>
            <Text className={styles.subtitle} isMuted size="xs">
                {getAbsSubtitle(item, kind)}
            </Text>
        </button>
    );
};

export const HomeFavoriteAudiobooks = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => (
    <HomeAbsFavoriteCarousel
        containerQuery={containerQuery}
        kind="audiobook"
        title={<HomeSectionTitle title="Audiobooks" to={AppRoute.AUDIOBOOKS} />}
    />
);

export const HomeFavoritePodcasts = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => (
    <HomeAbsFavoriteCarousel
        containerQuery={containerQuery}
        kind="podcast"
        title={<HomeSectionTitle title="Podcasts" to={AppRoute.PODCASTS} />}
    />
);
