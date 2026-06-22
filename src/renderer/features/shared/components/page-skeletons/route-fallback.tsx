import { useLocation } from 'react-router';

import {
    DetailPageSkeleton,
    GridPageSkeleton,
    HomePageSkeleton,
    TrackListSkeleton,
} from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import { Spinner } from '/@/shared/components/spinner/spinner';

/**
 * Skeleton chosen from the target path so the lazy chunk-load and the route's own
 * data-load Suspense show the SAME skeleton — no spinner-then-skeleton flash.
 * Utility pages (settings, now-playing, login, …) keep the neutral spinner.
 */
export const RouteFallback = () => {
    const { pathname } = useLocation();

    // Artist detail + sub-routes (id segment present).
    if (/^\/library\/(album-artists|artists)\/[^/]+/.test(pathname)) {
        if (/\/discography\/?$/.test(pathname)) {
            return <GridPageSkeleton />;
        }
        if (/\/(songs|top-songs|favorite-songs)\/?$/.test(pathname)) {
            return <TrackListSkeleton />;
        }
        return <DetailPageSkeleton circle />;
    }

    // Album / playlist / podcast detail.
    if (
        /^\/library\/albums\/[^/]+/.test(pathname) ||
        /^\/playlists\/[^/]+/.test(pathname) ||
        /^\/podcasts\/[^/]+/.test(pathname)
    ) {
        return <DetailPageSkeleton />;
    }

    // Artist grids (circular cards).
    if (/^\/library\/(album-artists|artists)\/?$/.test(pathname)) {
        return <GridPageSkeleton circle />;
    }

    // Song lists.
    if (/^\/library\/songs\/?$/.test(pathname)) {
        return <TrackListSkeleton />;
    }

    // Square-card grids.
    if (
        /^\/library\/(albums|genres|folders)\/?$/.test(pathname) ||
        /^\/playlists\/?$/.test(pathname) ||
        /^\/(radio|audiobooks|podcasts|favorites)\/?$/.test(pathname) ||
        pathname.startsWith('/search')
    ) {
        return <GridPageSkeleton />;
    }

    // Home.
    if (pathname === '/' || pathname.startsWith('/home')) {
        return <HomePageSkeleton />;
    }

    return <Spinner container />;
};
