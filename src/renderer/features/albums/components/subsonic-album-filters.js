import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { genresQueries } from '/@/renderer/features/genres/api/genres-api';
import { ArtistMultiSelectRow, GenreMultiSelectRow, } from '/@/renderer/features/shared/components/multi-select-rows';
import { useCurrentServerId } from '/@/renderer/store';
import { useAppStore, useAppStoreActions } from '/@/renderer/store/app.store';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { VirtualMultiSelect } from '/@/shared/components/multi-select/virtual-multi-select';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { Text } from '/@/shared/components/text/text';
import { useDebouncedCallback } from '/@/shared/hooks/use-debounced-callback';
import { AlbumArtistListSort, GenreListSort, LibraryItem, SortOrder, } from '/@/shared/types/domain-types';
export const SubsonicAlbumFilters = ({ disableArtistFilter, disableGenreFilter, }) => {
    const { t } = useTranslation();
    const serverId = useCurrentServerId();
    const { query, setAlbumArtist, setFavorite, setGenreId, setMaxYear, setMinYear } = useAlbumListFilters();
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
    const hasFavorite = query.favorite === true;
    const hasArtist = query.artistIds && query.artistIds.length > 0;
    const hasGenre = query.genreIds && query.genreIds.length > 0;
    const hasYear = query.minYear !== undefined || query.maxYear !== undefined;
    const isFavoriteDisabled = hasArtist || hasGenre || hasYear;
    const isArtistDisabled = hasFavorite || hasGenre || hasYear;
    const isGenreDisabled = hasFavorite || hasArtist || hasYear;
    const isYearDisabled = hasFavorite || hasArtist || hasGenre;
    const handleAlbumArtistFilter = useCallback((e) => {
        if (isArtistDisabled && e !== null)
            return;
        setAlbumArtist(e ?? null);
    }, [isArtistDisabled, setAlbumArtist]);
    const genreListQuery = useQuery(genresQueries.list({
        options: {
            gcTime: 1000 * 60 * 2,
            staleTime: 1000 * 60 * 1,
        },
        query: {
            sortBy: GenreListSort.NAME,
            sortOrder: SortOrder.ASC,
            startIndex: 0,
        },
        serverId,
    }));
    const genreList = useMemo(() => {
        if (!genreListQuery?.data)
            return [];
        return genreListQuery.data.items.map((genre) => ({
            albumCount: genre.albumCount,
            label: genre.name,
            songCount: genre.songCount,
            value: genre.id,
        }));
    }, [genreListQuery.data]);
    const selectedGenreIds = useMemo(() => query.genreIds || [], [query.genreIds]);
    const handleGenresFilter = useCallback((e) => {
        if (isGenreDisabled && e !== null && e.length > 0)
            return; // Prevent setting if disabled
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
                    return; // Prevent setting if disabled
                const favoriteValue = e.target.checked ? true : undefined;
                setFavorite(favoriteValue ?? null);
            },
            value: query.favorite,
        },
    ], [isFavoriteDisabled, query.favorite, setFavorite, t]);
    const handleMinYearFilter = useMemo(() => (e) => {
        if (isYearDisabled) {
            const isEmpty = e === '' || e === null || e === undefined || isNaN(Number(e));
            if (!isEmpty)
                return;
        }
        // Handle empty string, null, undefined, or invalid numbers as clearing
        if (e === '' || e === null || e === undefined || isNaN(Number(e))) {
            setMinYear(null);
            return;
        }
        const year = typeof e === 'number' ? e : Number(e);
        // If it's a valid number, set it; otherwise clear
        if (!isNaN(year) && isFinite(year) && year > 0) {
            setMinYear(year);
        }
        else {
            setMinYear(null);
        }
    }, [isYearDisabled, setMinYear]);
    const handleMaxYearFilter = useMemo(() => (e) => {
        if (isYearDisabled) {
            const isEmpty = e === '' || e === null || e === undefined || isNaN(Number(e));
            if (!isEmpty)
                return;
        }
        // Handle empty string, null, undefined, or invalid numbers as clearing
        if (e === '' || e === null || e === undefined || isNaN(Number(e))) {
            setMaxYear(null);
            return;
        }
        const year = typeof e === 'number' ? e : Number(e);
        // If it's a valid number, set it; otherwise clear
        if (!isNaN(year) && isFinite(year) && year > 0) {
            setMaxYear(year);
        }
        else {
            setMaxYear(null);
        }
    }, [isYearDisabled, setMaxYear]);
    const debouncedHandleMinYearFilter = useDebouncedCallback(handleMinYearFilter, 300);
    const debouncedHandleMaxYearFilter = useDebouncedCallback(handleMaxYearFilter, 300);
    const artistSelectMode = useAppStore((state) => state.artistSelectMode);
    const { setArtistSelectMode } = useAppStoreActions();
    const selectedArtistIds = useMemo(() => query.artistIds || [], [query.artistIds]);
    const handleArtistSelectModeChange = useCallback((value) => {
        const newMode = value;
        setArtistSelectMode(newMode);
        if (newMode === 'single' && selectedArtistIds.length > 1) {
            setAlbumArtist([selectedArtistIds[0]]);
        }
    }, [selectedArtistIds, setAlbumArtist, setArtistSelectMode]);
    const artistFilterLabel = useMemo(() => {
        return (_jsxs(Group, { gap: "xs", justify: "space-between", w: "100%", children: [_jsx(Text, { fw: 500, size: "sm", children: t('entity.artist', { count: 2, postProcess: 'sentenceCase' }) }), _jsx(SegmentedControl, { data: [
                        {
                            label: t('common.filter_single', { postProcess: 'titleCase' }),
                            value: 'single',
                        },
                        {
                            label: t('common.filter_multiple', { postProcess: 'titleCase' }),
                            value: 'multi',
                        },
                    ], disabled: isArtistDisabled, onChange: handleArtistSelectModeChange, size: "xs", value: artistSelectMode })] }));
    }, [artistSelectMode, handleArtistSelectModeChange, isArtistDisabled, t]);
    return (_jsxs(Stack, { px: "md", py: "md", children: [toggleFilters.map((filter) => (_jsxs(Group, { justify: "space-between", children: [_jsx(Text, { children: filter.label }), _jsx(Switch, { checked: filter.value ?? false, disabled: isFavoriteDisabled, onChange: filter.onChange })] }, `ss-filter-${filter.label}`))), !disableArtistFilter && (_jsxs(_Fragment, { children: [_jsx(Divider, { my: "md" }), _jsx(VirtualMultiSelect, { disabled: isArtistDisabled, displayCountType: "album", height: 300, isLoading: albumArtistListQuery.isFetching, label: artistFilterLabel, onChange: handleAlbumArtistFilter, options: selectableAlbumArtists, RowComponent: ArtistMultiSelectRow, singleSelect: artistSelectMode === 'single', value: selectedArtistIds })] })), !disableGenreFilter && (_jsxs(_Fragment, { children: [_jsx(Divider, { my: "md" }), _jsx(VirtualMultiSelect, { disabled: isGenreDisabled, displayCountType: "album", height: 220, isLoading: genreListQuery.isFetching, label: genreFilterLabel, onChange: handleGenresFilter, options: genreList, RowComponent: GenreMultiSelectRow, singleSelect: true, value: selectedGenreIds })] })), _jsx(Divider, { my: "md" }), _jsxs(Group, { grow: true, children: [_jsx(NumberInput, { disabled: isYearDisabled, hideControls: false, label: t('filter.fromYear', { postProcess: 'sentenceCase' }), max: 5000, min: 0, onChange: (e) => debouncedHandleMinYearFilter(e), value: query.minYear ?? undefined }), _jsx(NumberInput, { disabled: isYearDisabled, hideControls: false, label: t('filter.toYear', { postProcess: 'sentenceCase' }), max: 5000, min: 0, onChange: (e) => debouncedHandleMaxYearFilter(e), value: query.maxYear ?? undefined })] })] }));
};
