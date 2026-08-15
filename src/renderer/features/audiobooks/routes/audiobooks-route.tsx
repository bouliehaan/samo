import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router';

import { useLongFormMediaServer } from '/@/renderer/api/samo/samo-long-form';
import { longFormQueries } from '/@/renderer/features/long-form/api/long-form-queries';
import { LongFormLibraryPage } from '/@/renderer/features/long-form/components/long-form-library-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentAudiobook } from '/@/renderer/store';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';

const audiobookTitle = (item: LongFormLibraryItem) =>
    item.media?.metadata?.title || item.name || '';

const audiobookAuthor = (item: LongFormLibraryItem) => {
    const metadata = item.media?.metadata;
    return metadata?.author || metadata?.authors?.map((author) => author.name).join(', ') || '';
};

const audiobookSearchText = (item: LongFormLibraryItem) => {
    const metadata = item.media?.metadata;

    return [
        audiobookTitle(item),
        audiobookAuthor(item),
        metadata?.narratorName,
        metadata?.narrators?.join(' '),
        metadata?.publishedYear,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
};

const AudiobooksRoute = () => {
    const { t } = useTranslation();
    const server = useLongFormMediaServer();
    const navigate = useNavigate();

    const itemsQuery = useQuery(longFormQueries.audiobooks(server));

    const handleOpen = useCallback(
        (item: LongFormLibraryItem) => {
            if (server) {
                recordRecentAudiobook(item, server.id);
            }
            navigate(generatePath(AppRoute.AUDIOBOOKS_DETAIL, { itemId: item.id }));
        },
        [navigate, server],
    );

    const describe = useCallback(
        (item: LongFormLibraryItem) => ({
            subtitle: audiobookAuthor(item),
            tertiary: item.media?.metadata?.publishedYear,
            title: audiobookTitle(item) || t('common.unknown', { postProcess: 'sentenceCase' }),
        }),
        [t],
    );

    return (
        <LongFormLibraryPage
            describe={describe}
            emptyLabel={t('error.noAudiobooksFound', { postProcess: 'sentenceCase' })}
            isLoading={itemsQuery.isLoading}
            items={itemsQuery.data ?? []}
            kind="audiobook"
            noServerLabel={t('error.noServerForAudiobooks', { postProcess: 'sentenceCase' })}
            onOpen={handleOpen}
            searchPlaceholder={t('common.searchAudiobooks', { postProcess: 'sentenceCase' })}
            server={server}
            title={t('page.audiobookList.title', { postProcess: 'titleCase' })}
            toSearchText={audiobookSearchText}
        />
    );
};

const AudiobooksRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <AudiobooksRoute />
        </PageErrorBoundary>
    );
};

export default AudiobooksRouteWithBoundary;
