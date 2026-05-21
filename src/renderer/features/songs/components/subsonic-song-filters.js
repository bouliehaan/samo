import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { useGenreList } from '/@/renderer/features/genres/api/genres-api';
import { ArtistMultiSelectRow, GenreMultiSelectRow, } from '/@/renderer/features/shared/components/multi-select-rows';
import { useSongListFilters } from '/@/renderer/features/songs/hooks/use-song-list-filters';
import { useCurrentServerId } from '/@/renderer/store';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { VirtualMultiSelect } from '/@/shared/components/multi-select/virtual-multi-select';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { Text } from '/@/shared/components/text/text';
import { AlbumArtistListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';
export const SubsonicSongFilters = ({ disableArtistFilter, disableGenreFilter, }) => {
    const { t } = useTranslation();
    const serverId = useCurrentServerId();
    const { query, setArtistIds, setFavorite, setGenreId } = useSongListFilters();
    const genreListQuery = useGenreList();
    const genreList = useMemo(() => {
        if (!genreListQuery.data)
            return [];
        return genreListQuery.data.items.map((genre) => ({
            albumCount: genre.albumCount,
            label: genre.name,
            songCount: genre.songCount,
            value: genre.id,
        }));
    }, [genreListQuery.data]);
    const selectedGenreIds = useMemo(() => query.genreIds || [], [query.genreIds]);
    const albumArtistListQuery = useSuspenseQuery(artistsQueries.albumArtistList({
        options: {
            gcTime: 1000 * 60 * 2,
            staleTime: 1000 * 60 * 1,
        },
        query: {
            sortBy: AlbumArtistListSort.NAME,
            sortOrder: SortOrder.ASC,
            startIndex: 0,
        },
        serverId,
    }));
    const items = albumArtistListQuery?.data?.items;
    const selectableAlbumArtists = useMemo(() => {
        if (!items)
            return [];
        return items.map((artist) => ({
            albumCount: artist.albumCount,
            imageUrl: getItemImageUrl({
                id: artist.id,
                itemType: LibraryItem.ARTIST,
                type: 'table',
            }),
            label: artist.name,
            songCount: artist.songCount,
            value: artist.id,
        }));
    }, [items]);
    const selectedArtistIds = useMemo(() => query.artistIds || [], [query.artistIds]);
    const hasFavorite = query.favorite === true;
    const hasArtist = query.artistIds && query.artistIds.length > 0;
    const hasGenre = query.genreIds && query.genreIds.length > 0;
    const isFavoriteDisabled = hasArtist || hasGenre;
    const isArtistDisabled = hasFavorite || hasGenre;
    const isGenreDisabled = hasFavorite || hasArtist;
    const handleArtistFilter = useCallback((e) => {
        if (isArtistDisabled && e !== null)
            return;
        setArtistIds(e ?? null);
    }, [isArtistDisabled, setArtistIds]);
    const artistFilterLabel = useMemo(() => {
        return (_jsx(Text, { fw: 500, size: "sm", children: t('entity.artist', { count: 2, postProcess: 'sentenceCase' }) }));
    }, [t]);
    const handleGenresFilter = useCallback((e) => {
        if (isGenreDisabled && e !== null && e.length > 0)
            return;
        if (e && e.length > 0) {
            setGenreId([e[0]]);
        }
        else {
            setGenreId(null);
        }
    }, [isGenreDisabled, setGenreId]);
    const genreFilterLabel = useMemo(() => {
        return (_jsx(Text, { fw: 500, size: "sm", children: t('entity.genre', { count: 1, postProcess: 'sentenceCase' }) }));
    }, [t]);
    const toggleFilters = useMemo(() => [
        {
            label: t('filter.isFavorited', { postProcess: 'sentenceCase' }),
            onChange: (e) => {
                if (isFavoriteDisabled && e.target.checked)
                    return;
                const favoriteValue = e.target.checked ? true : undefined;
                setFavorite(favoriteValue ?? null);
            },
            value: query.favorite,
        },
    ], [isFavoriteDisabled, query.favorite, setFavorite, t]);
    return (_jsxs(Stack, { px: "md", py: "md", children: [toggleFilters.map((filter) => (_jsxs(Group, { justify: "space-between", children: [_jsx(Text, { children: filter.label }), _jsx(Switch, { checked: filter.value ?? false, disabled: isFavoriteDisabled, onChange: filter.onChange })] }, `ss-filter-${filter.label}`))), !disableArtistFilter && (_jsxs(_Fragment, { children: [_jsx(Divider, { my: "md" }), _jsx(VirtualMultiSelect, { disabled: isArtistDisabled, displayCountType: "song", height: 300, isLoading: albumArtistListQuery.isFetching, label: artistFilterLabel, onChange: handleArtistFilter, options: selectableAlbumArtists, RowComponent: ArtistMultiSelectRow, singleSelect: true, value: selectedArtistIds })] })), !disableGenreFilter && (_jsxs(_Fragment, { children: [_jsx(Divider, { my: "md" }), _jsx(VirtualMultiSelect, { disabled: isGenreDisabled, displayCountType: "song", height: 220, isLoading: genreListQuery.isFetching, label: genreFilterLabel, onChange: handleGenresFilter, options: genreList, RowComponent: GenreMultiSelectRow, singleSelect: true, value: selectedGenreIds })] }))] }));
};
