import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ListContext } from '/@/renderer/context/list-context';
import { AlbumArtistListContent } from '/@/renderer/features/artists/components/album-artist-list-content';
import { AlbumArtistListHeader } from '/@/renderer/features/artists/components/album-artist-list-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { ItemListKey } from '/@/shared/types/types';
const AlbumArtistListRoute = () => {
    const pageKey = ItemListKey.ALBUM_ARTIST;
    const [itemCount, setItemCount] = useState(undefined);
    const providerValue = useMemo(() => {
        return {
            id: undefined,
            itemCount,
            pageKey,
            setItemCount,
        };
    }, [itemCount, pageKey, setItemCount]);
    return (_jsx(AnimatedPage, { children: _jsxs(ListContext.Provider, { value: providerValue, children: [_jsx(AlbumArtistListHeader, {}), _jsx(AlbumArtistListContent, {})] }) }));
};
const AlbumArtistListRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(AlbumArtistListRoute, {}) }));
};
export default AlbumArtistListRouteWithBoundary;
