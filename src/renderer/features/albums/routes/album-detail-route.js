import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSuspenseQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { useParams } from 'react-router';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { AlbumDetailContent } from '/@/renderer/features/albums/components/album-detail-content';
import { AlbumDetailHeader } from '/@/renderer/features/albums/components/album-detail-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryBackgroundImage, LibraryBackgroundOverlay, } from '/@/renderer/features/shared/components/library-background-overlay';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { useFastAverageColor } from '/@/renderer/hooks';
import { recordRecentAlbum, useAlbumBackground, useCurrentServerId } from '/@/renderer/store';
import { LibraryItem } from '/@/shared/types/domain-types';
const ALBUM_DETAIL_BG_FALLBACK = 'var(--theme-colors-foreground-muted)';
const AlbumDetailRoute = () => {
    const scrollAreaRef = useRef(null);
    const headerRef = useRef(null);
    const { albumBackground, albumBackgroundBlur } = useAlbumBackground();
    const { albumId } = useParams();
    const serverId = useCurrentServerId();
    const detailQuery = useSuspenseQuery({
        ...albumQueries.detail({ query: { id: albumId }, serverId }),
    });
    const imageUrl = useItemImageUrl({
        id: detailQuery?.data?.imageId || undefined,
        itemType: LibraryItem.ALBUM,
        type: 'itemCard',
    }) || '';
    const { background: backgroundColor } = useFastAverageColor({
        id: albumId,
        src: imageUrl,
        srcLoaded: true,
    });
    const background = backgroundColor ?? ALBUM_DETAIL_BG_FALLBACK;
    const showBlurredImage = albumBackground;
    return (_jsx(AnimatedPage, { children: _jsxs(NativeScrollArea, { pageHeaderProps: {
                backgroundColor: backgroundColor ?? ALBUM_DETAIL_BG_FALLBACK,
                children: (_jsxs(LibraryHeaderBar, { children: [_jsx(LibraryHeaderBar.PlayButton, { ids: [albumId], itemType: LibraryItem.ALBUM, onBeforePlay: () => recordRecentAlbum(detailQuery.data), variant: "default" }), _jsx(LibraryHeaderBar.Title, { children: detailQuery.data.name })] })),
                offset: 200,
                target: headerRef,
            }, ref: scrollAreaRef, children: [showBlurredImage ? (_jsx(LibraryBackgroundImage, { blur: albumBackgroundBlur, headerRef: headerRef, imageUrl: imageUrl })) : (_jsx(LibraryBackgroundOverlay, { backgroundColor: background, headerRef: headerRef })), _jsxs(LibraryContainer, { children: [_jsx(AlbumDetailHeader, { ref: headerRef }), _jsx(AlbumDetailContent, {})] })] }) }, `album-detail-${albumId}`));
};
const AlbumDetailRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(AlbumDetailRoute, {}) }));
};
export default AlbumDetailRouteWithBoundary;
