import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { useLocation, useParams } from 'react-router';
import { SearchContent } from '/@/renderer/features/search/components/search-content';
import { SearchHeader } from '/@/renderer/features/search/components/search-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
const SearchRoute = () => {
    const { state: locationState } = useLocation();
    const localNavigationId = useId();
    const navigationId = locationState?.navigationId || localNavigationId;
    const { itemType } = useParams();
    return (_jsxs(AnimatedPage, { children: [_jsx(SearchHeader, { navigationId: navigationId }), _jsx(SearchContent, {}, `page-${itemType}`)] }, `search-${navigationId}`));
};
const SearchRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(SearchRoute, {}) }));
};
export default SearchRouteWithBoundary;
