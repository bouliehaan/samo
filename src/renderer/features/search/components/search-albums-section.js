import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useInfiniteQuery } from '@tanstack/react-query';
import { nanoid } from 'nanoid/non-secure';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createSearchParams, generatePath, useNavigate } from 'react-router';
import { searchQueries } from '/@/renderer/features/search/api/search-api';
import { CollapsibleCommandGroup } from '/@/renderer/features/search/components/collapsible-command-group';
import { CommandItemSelectable } from '/@/renderer/features/search/components/command-item-selectable';
import { LibraryCommandItem } from '/@/renderer/features/search/components/library-command-item';
import { FILTER_KEYS } from '/@/renderer/features/shared/utils';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer } from '/@/renderer/store';
import { Box } from '/@/shared/components/box/box';
import { Button } from '/@/shared/components/button/button';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
export function SearchAlbumsSection({ debouncedQuery, expanded, isHome, onSelectResult, onToggle, query, }) {
    const navigate = useNavigate();
    const server = useCurrentServer();
    const { t } = useTranslation();
    const { data, fetchNextPage, hasNextPage, isFetched, isFetchingNextPage, isLoading } = useInfiniteQuery(searchQueries.searchAlbumsInfinite({
        enabled: isHome && debouncedQuery !== '' && query !== '',
        searchTerm: debouncedQuery,
        serverId: server?.id,
    }));
    const albums = data?.pages.flatMap((p) => p.albums) ?? [];
    const showSection = isHome;
    const numberOfResults = hasNextPage ? `${albums.length}+` : albums.length;
    const handleGoToPage = useCallback(() => {
        navigate({
            pathname: AppRoute.LIBRARY_ALBUMS,
            search: createSearchParams({
                [FILTER_KEYS.SHARED.SEARCH_TERM]: debouncedQuery || query,
            }).toString(),
        }, { state: { navigationId: nanoid() } });
        onSelectResult();
    }, [debouncedQuery, navigate, onSelectResult, query]);
    if (!showSection)
        return null;
    return (_jsx(CollapsibleCommandGroup, { expanded: expanded, heading: t('entity.album', { count: 2, postProcess: 'titleCase' }), onToggle: onToggle, subtitle: isFetched ? (_jsx(_Fragment, { children: query ? (_jsx(Button, { onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGoToPage();
                }, onKeyDown: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, size: "compact-xs", variant: "filled", w: "8rem", children: t('common.numberOfResults', { numberOfResults }) })) : null })) : undefined, children: isLoading ? (_jsx(Box, { p: "md", children: _jsx(Spinner, { container: true }) })) : (_jsxs(_Fragment, { children: [albums.map((album) => (_jsx(CommandItemSelectable, { onSelect: () => {
                        navigate(generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                            albumId: album.id,
                        }));
                        onSelectResult();
                    }, value: `search-album-${album.id}`, children: ({ isHighlighted }) => (_jsx(LibraryCommandItem, { explicitStatus: album.explicitStatus, id: album.id, imageId: album.imageId, imageUrl: album.imageUrl, isHighlighted: isHighlighted, itemType: LibraryItem.ALBUM, subtitle: album.albumArtists
                            .map((artist) => artist.name)
                            .join(', '), title: album.name })) }, `search-album-${album.id}`))), hasNextPage && (_jsx(CommandItemSelectable, { disabled: isFetchingNextPage, onSelect: () => fetchNextPage(), value: "search-albums-load-more", children: () => (_jsx("div", { style: {
                            display: 'flex',
                            justifyContent: 'center',
                            width: '100%',
                        }, children: isFetchingNextPage ? (_jsx(Spinner, {})) : (_jsx(Text, { size: "sm", children: t('action.viewMore', { postProcess: 'titleCase' }) })) })) }))] })) }));
}
