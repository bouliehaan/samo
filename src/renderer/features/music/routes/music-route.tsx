import { Suspense, useRef } from 'react';

import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { AlbumInfiniteCarousel } from '/@/renderer/features/albums/components/album-infinite-carousel';
import {
    HomeAlbumsSection,
    HomeDiscoverSection,
    HomeExploSection,
    HomeFavoriteArtists,
    HomeFavoritePlaylists,
    HomeFavoriteTracks,
    HomeRediscoverySection,
} from '/@/renderer/features/home/components/home-media-sections';
import { HomeSectionTitle } from '/@/renderer/features/home/components/home-section-title';
import { MusicLibraryLinks } from '/@/renderer/features/music/components/music-library-links';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { HomePageSkeleton } from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import { AppRoute } from '/@/renderer/router/routes';
import { useWindowSettings } from '/@/renderer/store';
import { useHiddenHomeIdsByType } from '/@/renderer/store/hidden-home-items.store';
import { Stack } from '/@/shared/components/stack/stack';
import { AlbumListSort, SortOrder } from '/@/shared/types/domain-types';
import { Platform } from '/@/shared/types/types';

/**
 * Everything music, on one page.
 *
 * The browse half of what used to be Home: the shelves that are about the music
 * library rather than about what you were just doing. Home keeps the second
 * half, so nothing is on both — a section repeated across two pages teaches you
 * that neither is the real one.
 */

const MusicRecentlyAddedAlbums = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const hiddenAlbumIds = useHiddenHomeIdsByType('album');

    return (
        <AlbumInfiniteCarousel
            containerQuery={containerQuery}
            enableRefresh
            enableRemoveFromHome
            excludeIds={hiddenAlbumIds}
            queryKey={['music', 'album', 'recently-added'] as const}
            rowCount={1}
            sortBy={AlbumListSort.RECENTLY_ADDED}
            sortOrder={SortOrder.DESC}
            title={<HomeSectionTitle title="Recently Added" to={AppRoute.LIBRARY_ALBUMS} />}
        />
    );
};

const MusicRoute = () => {
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
                            <LibraryHeaderBar.Title>Music</LibraryHeaderBar.Title>
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
                        pt={windowBarStyle === Platform.WEB ? '3rem' : '1rem'}
                        px="2rem"
                        ref={containerQuery.ref}
                    >
                        <MusicLibraryLinks />
                        <HomeExploSection />
                        <HomeFavoritePlaylists containerQuery={containerQuery} />
                        <MusicRecentlyAddedAlbums containerQuery={containerQuery} />
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

const MusicRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <Suspense fallback={<HomePageSkeleton />}>
                <MusicRoute />
            </Suspense>
        </PageErrorBoundary>
    );
};

export default MusicRouteWithBoundary;
