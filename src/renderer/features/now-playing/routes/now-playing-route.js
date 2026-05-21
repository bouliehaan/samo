import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { NowPlayingHeader } from '/@/renderer/features/now-playing/components/now-playing-header';
import { PlayQueue } from '/@/renderer/features/now-playing/components/play-queue';
import { PlayQueueListControls } from '/@/renderer/features/now-playing/components/play-queue-list-controls';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { useAppStoreActions } from '/@/renderer/store';
import { ItemListKey } from '/@/shared/types/types';
const NowPlayingRoute = () => {
    const [search, setSearch] = useState(undefined);
    const { setSideBar } = useAppStoreActions();
    const tableRef = useRef(null);
    useEffect(() => {
        // On page enter, set rightExpanded to false
        setSideBar({ rightExpanded: false });
        return () => {
            // On page exit, set rightExpanded to true
            setSideBar({ rightExpanded: true });
        };
    }, [setSideBar]);
    return (_jsxs(AnimatedPage, { children: [_jsx(NowPlayingHeader, {}), _jsx(PlayQueueListControls, { handleSearch: setSearch, searchTerm: search, tableRef: tableRef, type: ItemListKey.QUEUE_SONG }), _jsx(PlayQueue, { listKey: ItemListKey.QUEUE_SONG, ref: tableRef, searchTerm: search })] }));
};
const NowPlayingRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(NowPlayingRoute, {}) }));
};
export default NowPlayingRouteWithBoundary;
