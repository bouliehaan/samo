import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useListContext } from '/@/renderer/context/list-context';
import { AlbumListHeaderFilters } from '/@/renderer/features/albums/components/album-list-header-filters';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { AlbumArtistListHeaderFilters } from '/@/renderer/features/artists/components/album-artist-list-header-filters';
import { useAlbumArtistListFilters } from '/@/renderer/features/artists/hooks/use-album-artist-list-filters';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import { SongListHeaderFilters } from '/@/renderer/features/songs/components/song-list-header-filters';
import { useSongListFilters } from '/@/renderer/features/songs/hooks/use-song-list-filters';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
export const FavoritesHeader = ({ itemType }) => {
    const { t } = useTranslation();
    const { customFilters, itemCount } = useListContext();
    const navigate = useNavigate();
    const albumFilters = useAlbumListFilters();
    const albumArtistFilters = useAlbumArtistListFilters();
    const songFilters = useSongListFilters();
    const playQuery = useMemo(() => {
        let query = {};
        switch (itemType) {
            case LibraryItem.ALBUM:
                query = albumFilters.query;
                break;
            case LibraryItem.ALBUM_ARTIST:
                query = albumArtistFilters.query;
                break;
            case LibraryItem.SONG:
                query = songFilters.query;
                break;
        }
        return {
            ...query,
            ...(customFilters ?? {}),
        };
    }, [albumFilters.query, albumArtistFilters.query, songFilters.query, customFilters, itemType]);
    const handleItemTypeChange = useCallback((type) => {
        albumFilters.clear();
        songFilters.clear();
        albumArtistFilters.clear();
        // Clear all URL search params except 'type'
        navigate(`?type=${type}`, { replace: true });
    }, [albumFilters, albumArtistFilters, songFilters, navigate]);
    return (_jsxs(Stack, { gap: 0, children: [_jsx(PageHeader, { children: _jsxs(Flex, { justify: "space-between", w: "100%", children: [_jsxs(LibraryHeaderBar, { ignoreMaxWidth: true, children: [_jsx(PlayButton, { itemType: itemType, query: playQuery }), _jsx(LibraryHeaderBar.Title, { children: _jsxs(DropdownMenu, { position: "right", children: [_jsx(DropdownMenu.Target, { children: _jsxs(Stack, { gap: 0, style: { cursor: 'pointer' }, children: [_jsxs(Group, { children: [_jsx(TextTitle, { isNoSelect: true, order: 3, children: t('page.favorites.title', {
                                                                        postProcess: 'sentenceCase',
                                                                    }) }), _jsx(Icon, { icon: "dropdown", size: "xl" })] }), _jsxs(Text, { isMuted: true, size: "sm", children: [itemType === LibraryItem.ALBUM &&
                                                                    t('entity.album', {
                                                                        count: 2,
                                                                        postProcess: 'sentenceCase',
                                                                    }), itemType === LibraryItem.ALBUM_ARTIST &&
                                                                    t('entity.artist', {
                                                                        count: 2,
                                                                        postProcess: 'sentenceCase',
                                                                    }), itemType === LibraryItem.SONG &&
                                                                    t('entity.track', {
                                                                        count: 2,
                                                                        postProcess: 'sentenceCase',
                                                                    })] })] }) }), _jsxs(DropdownMenu.Dropdown, { children: [_jsx(DropdownMenu.Item, { isSelected: itemType === LibraryItem.SONG, leftSection: _jsx(Icon, { icon: "track", size: "xl" }), onClick: () => handleItemTypeChange(LibraryItem.SONG), children: t('entity.track', {
                                                            count: 2,
                                                            postProcess: 'sentenceCase',
                                                        }) }), _jsx(DropdownMenu.Item, { isSelected: itemType === LibraryItem.ALBUM, leftSection: _jsx(Icon, { icon: "album", size: "xl" }), onClick: () => handleItemTypeChange(LibraryItem.ALBUM), children: t('entity.album', {
                                                            count: 2,
                                                            postProcess: 'sentenceCase',
                                                        }) }), _jsx(DropdownMenu.Item, { isSelected: itemType === LibraryItem.ALBUM_ARTIST, leftSection: _jsx(Icon, { icon: "artist", size: "xl" }), onClick: () => handleItemTypeChange(LibraryItem.ALBUM_ARTIST), children: t('entity.artist', {
                                                            count: 2,
                                                            postProcess: 'sentenceCase',
                                                        }) })] })] }) }), _jsx(LibraryHeaderBar.Badge, { isLoading: !itemCount, children: itemCount })] }), _jsx(Group, { children: _jsx(ListSearchInput, {}) })] }) }), _jsxs(FilterBar, { children: [itemType === LibraryItem.ALBUM && _jsx(AlbumListHeaderFilters, {}), itemType === LibraryItem.ALBUM_ARTIST && _jsx(AlbumArtistListHeaderFilters, {}), itemType === LibraryItem.SONG && _jsx(SongListHeaderFilters, {})] })] }));
};
const PlayButton = ({ itemType, query }) => {
    return _jsx(LibraryHeaderBar.PlayButton, { itemType: itemType, listQuery: query, variant: "filled" });
};
