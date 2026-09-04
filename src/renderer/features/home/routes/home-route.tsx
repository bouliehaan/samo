import { Suspense, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { AlbumInfiniteCarousel } from '/@/renderer/features/albums/components/album-infinite-carousel';
import { HomeContinueListening } from '/@/renderer/features/home/components/home-continue-listening';
import {
    HomeExploSection,
    HomeFavoriteAudiobooks,
    HomeFavoritePlaylists,
} from '/@/renderer/features/home/components/home-media-sections';
import { HomePodcastFeedSection } from '/@/renderer/features/home/components/home-podcast-feed';
import { HomeRadioStations } from '/@/renderer/features/home/components/home-radio-stations';
import { HomeSectionTitle } from '/@/renderer/features/home/components/home-section-title';
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
 * What arrived since you were last here.
 *
 * Its own query key rather than Music's, because the two shelves are on screen
 * at different moments and each should be able to refresh without dragging the
 * other's cache with it.
 */
const HomeRecentlyAddedAlbums = ({
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
            queryKey={['home', 'album', 'recently-added'] as const}
            rowCount={1}
            sortBy={AlbumListSort.RECENTLY_ADDED}
            sortOrder={SortOrder.DESC}
            title={<HomeSectionTitle title="Recently Added" to={AppRoute.LIBRARY_ALBUMS} />}
        />
    );
};

/**
 * Where you left off, across every kind of media.
 *
 * The library-browse shelves moved to Music when the section pills arrived —
 * albums, artists, discover, rediscover. What stays is the part that is about
 * you rather than about the library: what you were listening to, this week's
 * Explore drop, your playlists, the shows with new episodes, the stations you
 * keep coming back to.
 *
 * Explore, Playlists and Recently Added appear here AND on Music on purpose.
 * Each is both a thing you reach for by name and a thing you browse, and Home
 * without them is not a page about what you listen to. Explore is dated, not
 * browsed — a week's drop that is stale by the next one — so burying it one tab
 * away is the same as deleting it; it sits directly under Continue Listening,
 * above the shelf of playlists, which is where it sat before the move. Recently
 * Added is the one library shelf that is genuinely about you: it answers "what
 * is new since I was last here", which is a Home question, and it is the
 * section the phone's Home leads with — desktop dropping it was the two ends
 * disagreeing about what Home means. It stays last here, which is where it sat
 * before the move.
 */
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
                        pt={windowBarStyle === Platform.WEB ? '3rem' : '1rem'}
                        px="2rem"
                        ref={containerQuery.ref}
                    >
                        <HomeContinueListening containerQuery={containerQuery} />
                        <HomeExploSection />
                        <HomeFavoritePlaylists containerQuery={containerQuery} />
                        <HomeRadioStations />
                        <HomePodcastFeedSection containerQuery={containerQuery} />
                        <HomeFavoriteAudiobooks containerQuery={containerQuery} />
                        <HomeRecentlyAddedAlbums containerQuery={containerQuery} />
                    </Stack>
                </LibraryContainer>
            </NativeScrollArea>
        </AnimatedPage>
    );
};

const HomeRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <Suspense fallback={<HomePageSkeleton />}>
                <HomeRoute />
            </Suspense>
        </PageErrorBoundary>
    );
};

export default HomeRouteWithBoundary;
