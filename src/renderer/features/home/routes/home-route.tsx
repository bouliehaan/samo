import { useQuery } from '@tanstack/react-query';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '/@/renderer/api';
import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { AlbumInfiniteCarousel } from '/@/renderer/features/albums/components/album-infinite-carousel';
import {
    HomeFavoriteAudiobooks,
    HomeFavoritePodcasts,
} from '/@/renderer/features/home/components/home-abs-favorites';
import {
    HomeFavoriteArtists,
    HomeFavoritePlaylists,
    HomeFavoriteTracks,
    HomeMostPlayedSection,
    HomeRediscoverySection,
    HomeUnplayedSection,
} from '/@/renderer/features/home/components/home-media-sections';
import { HomeRadioStations } from '/@/renderer/features/home/components/home-radio-stations';
import { HomeSectionTitle } from '/@/renderer/features/home/components/home-section-title';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer, useCurrentServerId, useWindowSettings } from '/@/renderer/store';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { AlbumListSort, ServerType, SortOrder } from '/@/shared/types/domain-types';
import { Platform } from '/@/shared/types/types';

const HomeAlbumsWithFallback = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const serverId = useCurrentServerId();
    const [useFallback, setUseFallback] = useState(false);

    const favoritesQuery = useQuery({
        enabled: Boolean(serverId) && !useFallback,
        queryFn: ({ signal }) =>
            api.controller.getAlbumList({
                apiClientProps: { serverId, signal },
                query: {
                    favorite: true,
                    limit: 8,
                    sortBy: AlbumListSort.FAVORITED,
                    sortOrder: SortOrder.DESC,
                    startIndex: 0,
                },
            }),
        queryKey: ['home', 'album', 'favorites-check', serverId],
    });

    useEffect(() => {
        if (favoritesQuery.data && favoritesQuery.data.items.length === 0) {
            setUseFallback(true);
        }
    }, [favoritesQuery.data]);

    if (useFallback) {
        return (
            <AlbumInfiniteCarousel
                containerQuery={containerQuery}
                enableRefresh
                queryKey={['home', 'album', 'recently-played'] as const}
                rowCount={1}
                sortBy={AlbumListSort.RECENTLY_PLAYED}
                sortOrder={SortOrder.DESC}
                title={<HomeSectionTitle title="Albums" to={AppRoute.LIBRARY_ALBUMS} />}
            />
        );
    }

    return (
        <AlbumInfiniteCarousel
            containerQuery={containerQuery}
            enableRefresh
            query={{ favorite: true }}
            queryKey={['home', 'album', 'favorites'] as const}
            rowCount={1}
            sortBy={AlbumListSort.FAVORITED}
            sortOrder={SortOrder.DESC}
            title={<HomeSectionTitle title="Albums" to={AppRoute.LIBRARY_ALBUMS} />}
        />
    );
};

const HomeRecentlyAddedAlbums = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const server = useCurrentServer();

    if (server?.type !== ServerType.NAVIDROME && server?.type !== ServerType.SAMO) {
        return null;
    }

    return (
        <AlbumInfiniteCarousel
            containerQuery={containerQuery}
            enableRefresh
            queryKey={['home', 'album', 'recently-added'] as const}
            rowCount={1}
            sortBy={AlbumListSort.RECENTLY_ADDED}
            sortOrder={SortOrder.DESC}
            title={<HomeSectionTitle title="Recently Added" to={AppRoute.LIBRARY_ALBUMS} />}
        />
    );
};

const HomeRoute = () => {
    const { t } = useTranslation();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { windowBarStyle } = useWindowSettings();
    const containerQuery = useGridCarouselContainerQuery();

    return (
        <AnimatedPage>
            <NativeScrollArea
                pageHeaderProps={{
                    backgroundColor: 'var(--theme-colors-background)',
                    children: (
                        <LibraryHeaderBar>
                            <LibraryHeaderBar.Title>
                                {t('page.home.title', { postProcess: 'titleCase' })}
                            </LibraryHeaderBar.Title>
                        </LibraryHeaderBar>
                    ),
                    offset: 200,
                }}
                ref={scrollAreaRef}
            >
                <LibraryContainer>
                    <Stack
                        gap="2xl"
                        mb="5rem"
                        pt={windowBarStyle === Platform.WEB ? '5rem' : '3rem'}
                        px="2rem"
                        ref={containerQuery.ref}
                    >
                        <HomeRadioStations />
                        <HomeAlbumsWithFallback containerQuery={containerQuery} />
                        <HomeFavoritePlaylists containerQuery={containerQuery} />
                        <HomeFavoriteAudiobooks containerQuery={containerQuery} />
                        <HomeFavoritePodcasts containerQuery={containerQuery} />
                        <HomeRecentlyAddedAlbums containerQuery={containerQuery} />
                        <HomeFavoriteArtists containerQuery={containerQuery} />
                        <HomeFavoriteTracks />
                        <HomeRediscoverySection />
                        <HomeUnplayedSection />
                        <HomeMostPlayedSection />
                    </Stack>
                </LibraryContainer>
            </NativeScrollArea>
        </AnimatedPage>
    );
};

const HomeRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <Suspense fallback={<Spinner container />}>
                <HomeRoute />
            </Suspense>
        </PageErrorBoundary>
    );
};

export default HomeRouteWithBoundary;
