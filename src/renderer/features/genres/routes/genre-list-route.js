import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ListContext } from '/@/renderer/context/list-context';
import { GenreListContent } from '/@/renderer/features/genres/components/genre-list-content';
import { GenreListHeader } from '/@/renderer/features/genres/components/genre-list-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { ItemListKey } from '/@/shared/types/types';
const GenreListRoute = () => {
    const pageKey = ItemListKey.GENRE;
    const [itemCount, setItemCount] = useState(undefined);
    const providerValue = useMemo(() => {
        return {
            id: undefined,
            itemCount,
            pageKey,
            setItemCount,
        };
    }, [itemCount, pageKey, setItemCount]);
    return (_jsx(AnimatedPage, { children: _jsxs(ListContext.Provider, { value: providerValue, children: [_jsx(GenreListHeader, {}), _jsx(GenreListContent, {})] }) }));
};
const GenreListRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(GenreListRoute, {}) }));
};
export default GenreListRouteWithBoundary;
