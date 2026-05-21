import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSuspenseQueries } from '@tanstack/react-query';
import { Suspense, useRef } from 'react';
import { useParams } from 'react-router';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { AlbumArtistDetailContent } from '/@/renderer/features/artists/components/album-artist-detail-content';
import { AlbumArtistDetailHeader } from '/@/renderer/features/artists/components/album-artist-detail-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryBackgroundImage, LibraryBackgroundOverlay, } from '/@/renderer/features/shared/components/library-background-overlay';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { useFastAverageColor } from '/@/renderer/hooks';
import { recordRecentArtist, useArtistBackground, useCurrentServer, useCurrentServerId, } from '/@/renderer/store';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { AlbumListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';
const AlbumArtistDetailRouteContent = () => {
    const scrollAreaRef = useRef(null);
    const headerRef = useRef(null);
    const server = useCurrentServer();
    const serverId = useCurrentServerId();
    const { artistBackground, artistBackgroundBlur } = useArtistBackground();
    const { albumArtistId, artistId } = useParams();
    const routeId = (artistId || albumArtistId);
    const [detailQuery, albumsQuery] = useSuspenseQueries({
        queries: [
            artistsQueries.albumArtistDetail({ query: { id: routeId }, serverId: server?.id }),
            albumQueries.list({
                query: {
                    artistIds: [routeId],
                    limit: -1,
                    sortBy: AlbumListSort.RELEASE_DATE,
                    sortOrder: SortOrder.DESC,
                    startIndex: 0,
                },
                serverId,
            }),
        ],
    });
    const imageUrl = useItemImageUrl({
        id: detailQuery.data?.imageId || undefined,
        imageUrl: detailQuery.data?.imageUrl,
        itemType: LibraryItem.ALBUM_ARTIST,
        type: 'header',
    });
    const libraryBackgroundImageUrl = useItemImageUrl({
        id: detailQuery.data?.imageId || undefined,
        imageUrl: detailQuery.data?.imageUrl,
        itemType: LibraryItem.ALBUM_ARTIST,
        type: 'itemCard',
    });
    const selectedImageUrl = imageUrl || detailQuery.data?.imageUrl;
    const { background: backgroundColor } = useFastAverageColor({
        id: artistId,
        src: selectedImageUrl,
        srcLoaded: true,
    });
    const background = backgroundColor;
    const showBlurredImage = artistBackground;
    // if (isColorLoading) {
    //     return <Spinner container />;
    // }
    return (_jsx(AnimatedPage, { children: _jsxs(NativeScrollArea, { pageHeaderProps: {
                backgroundColor: backgroundColor || undefined,
                children: (_jsxs(LibraryHeaderBar, { children: [_jsx(LibraryHeaderBar.PlayButton, { ids: [routeId], itemType: LibraryItem.ALBUM_ARTIST, onBeforePlay: () => {
                                if (detailQuery.data) {
                                    recordRecentArtist(detailQuery.data);
                                }
                            }, variant: "default" }), _jsx(LibraryHeaderBar.Title, { children: detailQuery.data?.name })] })),
                offset: 200,
                target: headerRef,
            }, ref: scrollAreaRef, children: [showBlurredImage ? (_jsx(LibraryBackgroundImage, { blur: artistBackgroundBlur, headerRef: headerRef, imageUrl: libraryBackgroundImageUrl || '' })) : (_jsx(LibraryBackgroundOverlay, { backgroundColor: background, headerRef: headerRef })), _jsxs(LibraryContainer, { children: [_jsx(AlbumArtistDetailHeader, { albumsQuery: albumsQuery, ref: headerRef }), _jsx(AlbumArtistDetailContent, { albumsQuery: albumsQuery, detailQuery: detailQuery })] })] }) }, `album-artist-detail-${routeId}`));
};
const AlbumArtistDetailRoute = () => {
    const { albumArtistId, artistId } = useParams();
    const routeId = (artistId || albumArtistId);
    return (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(AlbumArtistDetailRouteContent, {}) }, `album-artist-detail-suspense-${routeId}`));
};
const AlbumArtistDetailRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(AlbumArtistDetailRoute, {}) }));
};
export default AlbumArtistDetailRouteWithBoundary;
