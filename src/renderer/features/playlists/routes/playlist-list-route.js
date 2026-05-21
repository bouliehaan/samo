import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { ListContext } from '/@/renderer/context/list-context';
import { PlaylistListContent } from '/@/renderer/features/playlists/components/playlist-list-content';
import { PlaylistListHeader } from '/@/renderer/features/playlists/components/playlist-list-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { ItemListKey } from '/@/shared/types/types';
const PlaylistListRoute = () => {
    const { playlistId } = useParams();
    const pageKey = ItemListKey.PLAYLIST;
    const [itemCount, setItemCount] = useState(undefined);
    const providerValue = useMemo(() => {
        return {
            id: playlistId,
            itemCount,
            pageKey,
            setItemCount,
        };
    }, [playlistId, itemCount, pageKey, setItemCount]);
    return (_jsx(AnimatedPage, { children: _jsxs(ListContext.Provider, { value: providerValue, children: [_jsx(PlaylistListHeader, {}), _jsx(PlaylistListContent, {})] }) }));
};
const PlaylistListRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(PlaylistListRoute, {}) }));
};
export default PlaylistListRouteWithBoundary;
