import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '/@/renderer/api';
import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { AlbumInfiniteCarousel } from '/@/renderer/features/albums/components/album-infinite-carousel';
import { HomeFavoriteAudiobooks, HomeFavoritePodcasts, } from '/@/renderer/features/home/components/home-abs-favorites';
import { HomeFavoriteArtists, HomeFavoritePlaylists, HomeFavoriteTracks, HomeMostPlayedSection, HomeRediscoverySection, HomeUnplayedSection, } from '/@/renderer/features/home/components/home-media-sections';
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
const HomeAlbumsWithFallback = ({ containerQuery, }) => {
    const serverId = useCurrentServerId();
    const [useFallback, setUseFallback] = useState(false);
    const favoritesQuery = useQuery({
        enabled: Boolean(serverId) && !useFallback,
        queryFn: ({ signal }) => api.controller.getAlbumList({
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
        return (_jsx(AlbumInfiniteCarousel, { containerQuery: containerQuery, enableRefresh: true, queryKey: ['home', 'album', 'recently-played'], rowCount: 1, sortBy: AlbumListSort.RECENTLY_PLAYED, sortOrder: SortOrder.DESC, title: _jsx(HomeSectionTitle, { title: "Albums", to: AppRoute.LIBRARY_ALBUMS }) }));
    }
    return (_jsx(AlbumInfiniteCarousel, { containerQuery: containerQuery, enableRefresh: true, query: { favorite: true }, queryKey: ['home', 'album', 'favorites'], rowCount: 1, sortBy: AlbumListSort.FAVORITED, sortOrder: SortOrder.DESC, title: _jsx(HomeSectionTitle, { title: "Albums", to: AppRoute.LIBRARY_ALBUMS }) }));
};
const HomeRecentlyAddedAlbums = ({ containerQuery, }) => {
    const server = useCurrentServer();
    if (server?.type !== ServerType.NAVIDROME) {
        return null;
    }
    return (_jsx(AlbumInfiniteCarousel, { containerQuery: containerQuery, enableRefresh: true, queryKey: ['home', 'album', 'recently-added'], rowCount: 1, sortBy: AlbumListSort.RECENTLY_ADDED, sortOrder: SortOrder.DESC, title: _jsx(HomeSectionTitle, { title: "Recently Added", to: AppRoute.LIBRARY_ALBUMS }) }));
};
const HomeRoute = () => {
    const { t } = useTranslation();
    const scrollAreaRef = useRef(null);
    const { windowBarStyle } = useWindowSettings();
    const containerQuery = useGridCarouselContainerQuery();
    return (_jsx(AnimatedPage, { children: _jsx(NativeScrollArea, { pageHeaderProps: {
                backgroundColor: 'var(--theme-colors-background)',
                children: (_jsx(LibraryHeaderBar, { children: _jsx(LibraryHeaderBar.Title, { children: t('page.home.title', { postProcess: 'titleCase' }) }) })),
                offset: 200,
            }, ref: scrollAreaRef, children: _jsx(LibraryContainer, { children: _jsxs(Stack, { gap: "2xl", mb: "5rem", pt: windowBarStyle === Platform.WEB ? '5rem' : '3rem', px: "2rem", ref: containerQuery.ref, children: [_jsx(HomeRadioStations, {}), _jsx(HomeAlbumsWithFallback, { containerQuery: containerQuery }), _jsx(HomeFavoritePlaylists, { containerQuery: containerQuery }), _jsx(HomeFavoriteAudiobooks, { containerQuery: containerQuery }), _jsx(HomeFavoritePodcasts, { containerQuery: containerQuery }), _jsx(HomeRecentlyAddedAlbums, { containerQuery: containerQuery }), _jsx(HomeFavoriteArtists, { containerQuery: containerQuery }), _jsx(HomeFavoriteTracks, {}), _jsx(HomeRediscoverySection, {}), _jsx(HomeUnplayedSection, {}), _jsx(HomeMostPlayedSection, {})] }) }) }) }));
};
const HomeRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(HomeRoute, {}) }) }));
};
export default HomeRouteWithBoundary;
