import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router';

import { useLongFormMediaServer } from '/@/renderer/api/samo/samo-long-form';
import { longFormQueries } from '/@/renderer/features/long-form/api/long-form-queries';
import { LongFormLibraryPage } from '/@/renderer/features/long-form/components/long-form-library-page';
import { PodcastSections } from '/@/renderer/features/podcasts/components/podcast-sections';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentPodcast } from '/@/renderer/store';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';

const podcastTitle = (item: LongFormLibraryItem) => item.media?.metadata?.title || item.name || '';

const podcastAuthor = (item: LongFormLibraryItem) => {
    const metadata = item.media?.metadata;
    return metadata?.author || metadata?.authors?.map((author) => author.name).join(', ') || '';
};

const podcastSearchText = (item: LongFormLibraryItem) =>
    [
        podcastTitle(item),
        podcastAuthor(item),
        item.media?.metadata?.description,
        item.media?.metadata?.genres?.join(' '),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

const PodcastsRoute = () => {
    const { t } = useTranslation();
    const server = useLongFormMediaServer();
    const navigate = useNavigate();

    const itemsQuery = useQuery(longFormQueries.podcasts(server));

    const handleOpen = useCallback(
        (item: LongFormLibraryItem) => {
            if (server) {
                recordRecentPodcast(item, server.id);
            }
            navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
        },
        [navigate, server],
    );

    const describe = useCallback(
        (item: LongFormLibraryItem) => ({
            subtitle: podcastAuthor(item),
            tertiary:
                typeof item.numEpisodes === 'number' && item.numEpisodes > 0
                    ? t('entity.episodeWithCount', { count: item.numEpisodes })
                    : undefined,
            title: podcastTitle(item) || t('common.unknown', { postProcess: 'sentenceCase' }),
        }),
        [t],
    );

    const items = itemsQuery.data ?? [];

    return (
        <LongFormLibraryPage
            describe={describe}
            emptyLabel={t('error.noPodcastsFound', { postProcess: 'sentenceCase' })}
            gridLabel="All Shows"
            isLoading={itemsQuery.isLoading}
            items={items}
            kind="podcast"
            noServerLabel={t('error.noServerForPodcasts', { postProcess: 'sentenceCase' })}
            onOpen={handleOpen}
            searchPlaceholder={t('common.searchPodcasts', { postProcess: 'sentenceCase' })}
            sections={
                server ? (
                    <PodcastSections items={items} onOpen={handleOpen} server={server} />
                ) : null
            }
            server={server}
            title={t('page.podcastList.title', { postProcess: 'titleCase' })}
            toSearchText={podcastSearchText}
        />
    );
};

const PodcastsRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <PodcastsRoute />
        </PageErrorBoundary>
    );
};

export default PodcastsRouteWithBoundary;
