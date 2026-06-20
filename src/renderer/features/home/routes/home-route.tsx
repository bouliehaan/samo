import { Suspense, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { AlbumInfiniteCarousel } from '/@/renderer/features/albums/components/album-infinite-carousel';
import { HomeFavoriteAudiobooks } from '/@/renderer/features/home/components/home-abs-favorites';
import { HomePodcastFeedSection } from '/@/renderer/features/home/components/home-podcast-feed';
import {
    HomeAlbumsSection,
    HomeFavoriteArtists,
    HomeFavoritePlaylists,
    HomeFavoriteTracks,
    HomeDiscoverSection,
    HomeRediscoverySection,
} from '/@/renderer/features/home/components/home-media-sections';
import { HomeRadioStations } from '/@/renderer/features/home/components/home-radio-stations';
import { HomeSectionTitle } from '/@/renderer/features/home/components/home-section-title';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { useWindowSettings } from '/@/renderer/store';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { AlbumListSort, SortOrder } from '/@/shared/types/domain-types';
import { Platform } from '/@/shared/types/types';

const HomeRecentlyAddedAlbums = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
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
                        <HomeFavoritePlaylists containerQuery={containerQuery} />
                        <HomeFavoriteAudiobooks containerQuery={containerQuery} />
                        <HomePodcastFeedSection containerQuery={containerQuery} />
                        <HomeRecentlyAddedAlbums containerQuery={containerQuery} />
                        <HomeFavoriteArtists containerQuery={containerQuery} />
                        <HomeAlbumsSection containerQuery={containerQuery} />
                        <HomeFavoriteTracks />
                        <HomeDiscoverSection />
                        <HomeRediscoverySection />
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
