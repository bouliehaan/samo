import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ListContext } from '/@/renderer/context/list-context';
import { FolderListContent } from '/@/renderer/features/folders/components/folder-list-content';
import { FolderListHeader } from '/@/renderer/features/folders/components/folder-list-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { ListWithSidebarContainer } from '/@/renderer/features/shared/components/list-with-sidebar-container';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { ItemListKey } from '/@/shared/types/types';
const FolderListRoute = () => {
    const pageKey = ItemListKey.SONG;
    const [itemCount, setItemCount] = useState(undefined);
    const providerValue = useMemo(() => {
        return {
            id: undefined,
            itemCount,
            pageKey,
            setItemCount,
        };
    }, [itemCount, pageKey]);
    return (_jsx(AnimatedPage, { children: _jsxs(ListContext.Provider, { value: providerValue, children: [_jsx(FolderListHeader, {}), _jsx(ListWithSidebarContainer, { useBreakpoint: true, children: _jsx(FolderListContent, {}) })] }) }));
};
const FolderListRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(FolderListRoute, {}) }));
};
export default FolderListRouteWithBoundary;
