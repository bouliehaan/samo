import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import styles from './podcast-detail-route.module.css';

import { useLongFormMediaServer } from '/@/renderer/api/samo/samo-long-form';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { longFormQueries } from '/@/renderer/features/long-form/api/long-form-queries';
import { PodcastEpisodeList } from '/@/renderer/features/podcasts/components/podcast-episode-list';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import {
    LibraryBackgroundImage,
    LibraryBackgroundOverlay,
} from '/@/renderer/features/shared/components/library-background-overlay';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import {
    LibraryHeader,
    LibraryHeaderMenu,
} from '/@/renderer/features/shared/components/library-header';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { DetailPageSkeleton } from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import { useFastAverageColor } from '/@/renderer/hooks';
import { AppRoute } from '/@/renderer/router/routes';
import { useAlbumBackground } from '/@/renderer/store';
import {
    useIsLibraryFavorite,
    useLibraryFavoritesActions,
} from '/@/renderer/store/library-favorites.store';
import { usePodcastActions, usePodcastEpisode } from '/@/renderer/store/podcast.store';
import { LongFormPodcastEpisode } from '/@/shared/api/long-form-types';
import { Spoiler } from '/@/shared/components/spoiler/spoiler';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

const PODCAST_DETAIL_BG_FALLBACK = 'var(--theme-colors-foreground-muted)';

const PodcastDetailRoute = () => {
    const { t } = useTranslation();
    const { itemId } = useParams() as { itemId: string };
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const { albumBackground, albumBackgroundBlur } = useAlbumBackground();

    const server = useLongFormMediaServer();
    const { play: playPodcast } = usePodcastActions();
    const activeEpisode = usePodcastEpisode();
    const isFavorite = useIsLibraryFavorite('podcast', server?.id, itemId);
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();

    const itemQuery = useQuery(longFormQueries.podcastDetail(server, itemId));
    const item = itemQuery.data;

    const coverUrl = item?.media?.metadata?.imageUrl;

    const { background: backgroundColor } = useFastAverageColor({
        id: itemId,
        src: coverUrl,
        srcLoaded: Boolean(coverUrl),
    });
    const background = backgroundColor ?? PODCAST_DETAIL_BG_FALLBACK;

    // Newest-first is how listeners browse a podcast; the server returns
    // oldest-first.
    const episodes = useMemo(
        () =>
            (item?.media?.episodes ?? [])
                .slice()
                .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)),
        [item],
    );

    const handlePlayEpisode = useCallback(
        (episode: LongFormPodcastEpisode) => {
            if (!server || !item) return;
            void playPodcast(server, item, episode);
        },
        [item, playPodcast, server],
    );

    const handleMoreOptions = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            if (!server || !item) return;
            ContextMenuController.call({
                cmd: { items: [item], server, type: 'podcast' },
                event,
            });
        },
        [item, server],
    );

    const handleEpisodeContextMenu = useCallback(
        (episode: LongFormPodcastEpisode, event: React.MouseEvent<HTMLButtonElement>) => {
            if (!server || !item) return;
            event.preventDefault();
            ContextMenuController.call({
                cmd: { episodes: [episode], item, server, type: 'podcast-episode' },
                event,
            });
        },
        [item, server],
    );

    if (!server) {
        return (
            <AnimatedPage>
                <Stack className={styles.emptyState}>
                    <Text isMuted>
                        {t('error.noServerForPodcasts', { postProcess: 'sentenceCase' })}
                    </Text>
                </Stack>
            </AnimatedPage>
        );
    }

    if (itemQuery.isLoading) {
        return <DetailPageSkeleton />;
    }

    if (!item) {
        return (
            <AnimatedPage>
                <Stack className={styles.emptyState}>
                    <Text isMuted>
                        {t('error.podcastNotFound', { postProcess: 'sentenceCase' })}
                    </Text>
                </Stack>
            </AnimatedPage>
        );
    }

    const title = item.media?.metadata?.title || item.name || '';
    const author = item.media?.metadata?.author;
    const description = item.media?.metadata?.description;

    return (
        <AnimatedPage key={`podcast-detail-${itemId}`}>
            <NativeScrollArea
                pageHeaderProps={{
                    backgroundColor: background,
                    children: (
                        <LibraryHeaderBar>
                            <LibraryHeaderBar.Title>{title}</LibraryHeaderBar.Title>
                        </LibraryHeaderBar>
                    ),
                    offset: 200,
                    target: headerRef,
                }}
                ref={scrollAreaRef}
            >
                {albumBackground ? (
                    <LibraryBackgroundImage
                        blur={albumBackgroundBlur}
                        headerRef={headerRef}
                        imageUrl={coverUrl ?? ''}
                    />
                ) : (
                    <LibraryBackgroundOverlay backgroundColor={background} headerRef={headerRef} />
                )}
                <LibraryContainer>
                    <Stack ref={headerRef}>
                        <LibraryHeader
                            imageUrl={coverUrl}
                            item={{
                                children: (
                                    <Text
                                        className={styles.itemType}
                                        component="span"
                                        fw={600}
                                        size="md"
                                        tt="uppercase"
                                    >
                                        {t('entity.podcast', { count: 1 })}
                                    </Text>
                                ),
                                imageUrl: coverUrl,
                                route: AppRoute.PODCASTS,
                            }}
                            title={title}
                        >
                            <Stack gap="md" w="100%">
                                {author ? (
                                    <Text fw={600} size="lg">
                                        {author}
                                    </Text>
                                ) : null}
                                <Text fw={400} isMuted>
                                    {t('entity.episodeWithCount', { count: episodes.length })}
                                </Text>
                                <LibraryHeaderMenu
                                    favorite={isFavorite}
                                    onFavorite={() => {
                                        if (!server.id) return;
                                        toggleFavorite('podcast', server.id, itemId);
                                    }}
                                    onMore={handleMoreOptions}
                                />
                            </Stack>
                        </LibraryHeader>
                    </Stack>
                    <Stack className={styles.content} gap="lg">
                        {description ? (
                            <Spoiler
                                hideLabel={t('common.showLess', { postProcess: 'sentenceCase' })}
                                maxHeight={100}
                                showLabel={t('common.showMore', { postProcess: 'sentenceCase' })}
                            >
                                <Text isMuted>{description}</Text>
                            </Spoiler>
                        ) : null}
                        <div className={styles.episodeList}>
                            <PodcastEpisodeList
                                activeEpisodeId={activeEpisode?.id}
                                episodes={episodes}
                                onContextMenu={handleEpisodeContextMenu}
                                onPlay={handlePlayEpisode}
                            />
                        </div>
                    </Stack>
                </LibraryContainer>
            </NativeScrollArea>
        </AnimatedPage>
    );
};

const PodcastDetailRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <PodcastDetailRoute />
        </PageErrorBoundary>
    );
};

export default PodcastDetailRouteWithBoundary;
