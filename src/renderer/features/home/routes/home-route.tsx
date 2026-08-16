import { Suspense, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { HomeContinueListening } from '/@/renderer/features/home/components/home-continue-listening';
import {
    HomeFavoriteAudiobooks,
    HomeFavoritePlaylists,
} from '/@/renderer/features/home/components/home-media-sections';
import { HomePodcastFeedSection } from '/@/renderer/features/home/components/home-podcast-feed';
import { HomeRadioStations } from '/@/renderer/features/home/components/home-radio-stations';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { HomePageSkeleton } from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import { useWindowSettings } from '/@/renderer/store';
import { Stack } from '/@/shared/components/stack/stack';
import { Platform } from '/@/shared/types/types';

/**
 * Where you left off, across every kind of media.
 *
 * The library-browse shelves moved to Music when the section pills arrived —
 * albums, artists, explore, discover, rediscover. What stays is the part that
 * is about you rather than about the library: what you were listening to, your
 * playlists, the shows with new episodes, the stations you keep coming back to.
 *
 * Playlists appear here AND on Music on purpose. They are both a thing you
 * reach for by name and a thing you browse, and Home without them is not a
 * page about what you listen to.
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
                        <HomeFavoritePlaylists containerQuery={containerQuery} />
                        <HomeRadioStations />
                        <HomePodcastFeedSection containerQuery={containerQuery} />
                        <HomeFavoriteAudiobooks containerQuery={containerQuery} />
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
