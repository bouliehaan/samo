import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ListContext } from '/@/renderer/context/list-context';
import { ArtistListContent } from '/@/renderer/features/artists/components/artist-list-content';
import { ArtistListHeader } from '/@/renderer/features/artists/components/artist-list-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { ItemListKey } from '/@/shared/types/types';
const ArtistListRoute = () => {
    const pageKey = ItemListKey.ARTIST;
    const [itemCount, setItemCount] = useState(undefined);
    const providerValue = useMemo(() => {
        return {
            id: undefined,
            itemCount,
            pageKey,
            setItemCount,
        };
    }, [itemCount, pageKey, setItemCount]);
    return (_jsx(AnimatedPage, { children: _jsxs(ListContext.Provider, { value: providerValue, children: [_jsx(ArtistListHeader, {}), _jsx(ArtistListContent, {})] }) }));
};
const ArtistListRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(ArtistListRoute, {}) }));
};
export default ArtistListRouteWithBoundary;
