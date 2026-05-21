import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { getItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { usePlaylistSongListFilters } from '/@/renderer/features/playlists/hooks/use-playlist-song-list-filters';
import { applyClientSideSongFilters } from '/@/renderer/features/playlists/hooks/use-playlist-track-list';
import { ArtistMultiSelectRow, GenreMultiSelectRow, } from '/@/renderer/features/shared/components/multi-select-rows';
import { FILTER_KEYS } from '/@/renderer/features/shared/utils';
import { useCurrentServer } from '/@/renderer/store';
import { useAppStore, useAppStoreActions } from '/@/renderer/store/app.store';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { VirtualMultiSelect, } from '/@/shared/components/multi-select/virtual-multi-select';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { useDebouncedCallback } from '/@/shared/hooks/use-debounced-callback';
import { LibraryItem } from '/@/shared/types/domain-types';
function booleanToSegmentValue(value) {
    if (value === true)
        return 'true';
    if (value === false)
        return 'false';
    return 'none';
}
function segmentValueToBoolean(value) {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    return null;
}
const BooleanSegmentFilter = ({ label, onChange, segmentData, value, }) => (_jsxs(Stack, { gap: "xs", children: [_jsx(Text, { size: "sm", weight: 500, children: label }), _jsx(SegmentedControl, { data: segmentData, onChange: (v) => onChange(segmentValueToBoolean(v)), size: "sm", value: booleanToSegmentValue(value), w: "100%" })] }));
const MultiSelectFilter = ({ displayCountType = 'song', height, label, onChange, options, RowComponent, singleSelect, value, }) => (_jsx(VirtualMultiSelect, { displayCountType: displayCountType, height: height, label: label, onChange: onChange, options: options, RowComponent: RowComponent, singleSelect: singleSelect, value: value }));
const YearRangeFilter = ({ fromYearLabel, maxYear, minYear, onMaxYear, onMinYear, toYearLabel, }) => (_jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(NumberInput, { hideControls: false, label: fromYearLabel, max: 5000, min: 0, onChange: (e) => onMinYear(e), style: { flex: 1 }, value: minYear != null ? minYear : '' }), _jsx(NumberInput, { hideControls: false, label: toYearLabel, max: 5000, min: 0, onChange: (e) => onMaxYear(e), style: { flex: 1 }, value: maxYear != null ? maxYear : '' })] }));
const MultiSelectFilterLabel = ({ andOrValue, entityLabel, filterMultipleLabel, filterSingleLabel, matchAndLabel, matchOrLabel, onAndOrChange, onSingleMultiChange, showAndOr, singleMultiValue, }) => (_jsxs(Group, { gap: "xs", justify: "space-between", w: "100%", children: [_jsx(Text, { fw: 500, size: "sm", children: entityLabel }), _jsxs(Group, { gap: "xs", children: [showAndOr && (_jsx(SegmentedControl, { data: [
                        { label: matchAndLabel, value: 'and' },
                        { label: matchOrLabel, value: 'or' },
                    ], onChange: (value) => onAndOrChange(value === 'or' ? 'or' : 'and'), size: "xs", value: andOrValue })), _jsx(SegmentedControl, { data: [
                        { label: filterSingleLabel, value: 'single' },
                        { label: filterMultipleLabel, value: 'multi' },
                    ], onChange: onSingleMultiChange, size: "xs", value: singleMultiValue })] })] }));
export const ClientSideSongFilters = () => {
    const { t } = useTranslation();
    const { playlistId } = useParams();
    const server = useCurrentServer();
    const { query, setAlbumArtistIds, setAlbumArtistIdsMode, setArtistIds, setArtistIdsMode, setFavorite, setGenreId, setGenreIdsMode, setMaxYear, setMinYear, } = usePlaylistSongListFilters();
    const playlistSongsQuery = useSuspenseQuery(playlistsQueries.songList({
        query: { id: playlistId },
        serverId: server?.id,
    }));
    const albumArtistSelectMode = useAppStore((state) => state.albumArtistSelectMode);
    const artistSelectMode = useAppStore((state) => state.artistSelectMode);
    const genreSelectMode = useAppStore((state) => state.genreSelectMode);
    const { setAlbumArtistSelectMode, setArtistSelectMode, setGenreSelectMode } = useAppStoreActions();
    const songs = useMemo(() => {
        return (playlistSongsQuery.data?.items ?? []);
    }, [playlistSongsQuery.data]);
    const filteredSongs = useMemo(() => applyClientSideSongFilters(songs, query), [songs, query]);
    const songsForAlbumArtistOptions = useMemo(() => {
        const idsMode = query[FILTER_KEYS.SONG.ALBUM_ARTIST_IDS_MODE] ?? 'and';
        const useFilteredResult = albumArtistSelectMode === 'multi' && idsMode === 'and';
        if (!useFilteredResult) {
            const queryWithoutAlbumArtist = {
                ...query,
                [FILTER_KEYS.SONG.ALBUM_ARTIST_IDS]: undefined,
            };
            return applyClientSideSongFilters(songs, queryWithoutAlbumArtist);
        }
        return filteredSongs;
    }, [albumArtistSelectMode, filteredSongs, query, songs]);
    const songsForArtistOptions = useMemo(() => {
        const idsMode = query[FILTER_KEYS.SONG.ARTIST_IDS_MODE] ?? 'and';
        const useFilteredResult = artistSelectMode === 'multi' && idsMode === 'and';
        if (!useFilteredResult) {
            const queryWithoutArtist = {
                ...query,
                [FILTER_KEYS.SONG.ARTIST_IDS]: undefined,
            };
            return applyClientSideSongFilters(songs, queryWithoutArtist);
        }
        return filteredSongs;
    }, [artistSelectMode, filteredSongs, query, songs]);
    const songsForGenreOptions = useMemo(() => {
        const idsMode = query[FILTER_KEYS.SONG.GENRE_ID_MODE] ?? 'and';
        const useFilteredResult = genreSelectMode === 'multi' && idsMode === 'and';
        if (!useFilteredResult) {
            const queryWithoutGenre = {
                ...query,
                [FILTER_KEYS.SONG.GENRE_ID]: undefined,
            };
            return applyClientSideSongFilters(songs, queryWithoutGenre);
        }
        return filteredSongs;
    }, [filteredSongs, genreSelectMode, query, songs]);
    const albumArtistOptions = useMemo(() => {
        const byId = new Map();
        for (const song of songsForAlbumArtistOptions) {
            for (const artist of song.albumArtists ?? []) {
                if (!artist.id)
                    continue;
                const existing = byId.get(artist.id);
                if (existing) {
                    existing.songCount += 1;
                }
                else {
                    byId.set(artist.id, {
                        id: artist.id,
                        imageUrl: artist.imageUrl ??
                            getItemImageUrl({
                                id: artist.id,
                                itemType: LibraryItem.ALBUM_ARTIST,
                                type: 'table',
                            }),
                        name: artist.name,
                        songCount: 1,
                    });
                }
            }
        }
        return Array.from(byId.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => ({
            albumCount: null,
            imageUrl: a.imageUrl,
            label: a.name,
            songCount: a.songCount,
            value: a.id,
        }));
    }, [songsForAlbumArtistOptions]);
    const artistOptions = useMemo(() => {
        const byId = new Map();
        for (const song of songsForArtistOptions) {
            for (const artist of song.artists ?? []) {
                if (!artist.id)
                    continue;
                const existing = byId.get(artist.id);
                if (existing) {
                    existing.songCount += 1;
                }
                else {
                    byId.set(artist.id, {
                        id: artist.id,
                        imageUrl: artist.imageUrl ??
                            getItemImageUrl({
                                id: artist.id,
                                itemType: LibraryItem.ARTIST,
                                type: 'table',
                            }),
                        name: artist.name,
                        songCount: 1,
                    });
                }
            }
        }
        return Array.from(byId.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => ({
            albumCount: null,
            imageUrl: a.imageUrl,
            label: a.name,
            songCount: a.songCount,
            value: a.id,
        }));
    }, [songsForArtistOptions]);
    const genreOptions = useMemo(() => {
        const byId = new Map();
        for (const song of songsForGenreOptions) {
            for (const genre of song.genres ?? []) {
                if (!genre.id)
                    continue;
                const existing = byId.get(genre.id);
                if (existing) {
                    existing.songCount += 1;
                }
                else {
                    byId.set(genre.id, {
                        id: genre.id,
                        name: genre.name,
                        songCount: 1,
                    });
                }
            }
        }
        return Array.from(byId.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((g) => ({
            albumCount: null,
            imageUrl: undefined,
            label: g.name,
            songCount: g.songCount,
            value: g.id,
        }));
    }, [songsForGenreOptions]);
    const segmentedControlData = useMemo(() => [
        { label: t('common.none', { postProcess: 'titleCase' }), value: 'none' },
        { label: t('common.yes', { postProcess: 'titleCase' }), value: 'true' },
        { label: t('common.no', { postProcess: 'titleCase' }), value: 'false' },
    ], [t]);
    const handleMinYear = useMemo(() => (e) => {
        if (e === '' || e === null || e === undefined) {
            setMinYear(null);
            return;
        }
        const year = typeof e === 'number' ? e : Number(e);
        setMinYear(!isNaN(year) && isFinite(year) && year > 0 ? year : null);
    }, [setMinYear]);
    const handleMaxYear = useMemo(() => (e) => {
        if (e === '' || e === null || e === undefined) {
            setMaxYear(null);
            return;
        }
        const year = typeof e === 'number' ? e : Number(e);
        setMaxYear(!isNaN(year) && isFinite(year) && year > 0 ? year : null);
    }, [setMaxYear]);
    const debouncedHandleMinYear = useDebouncedCallback(handleMinYear, 300);
    const debouncedHandleMaxYear = useDebouncedCallback(handleMaxYear, 300);
    const selectedGenreIds = useMemo(() => query[FILTER_KEYS.SONG.GENRE_ID] ?? [], [query]);
    const handleGenreSelectModeChange = useCallback((value) => {
        const newMode = value;
        setGenreSelectMode(newMode);
        if (newMode === 'single' && selectedGenreIds.length > 1) {
            setGenreId([selectedGenreIds[0]]);
        }
    }, [selectedGenreIds, setGenreId, setGenreSelectMode]);
    const genreIdsMode = query[FILTER_KEYS.SONG.GENRE_ID_MODE] ?? 'and';
    const handleGenreChange = useCallback((e) => {
        if (e && e.length > 0) {
            setGenreId(e);
        }
        else {
            setGenreId(null);
        }
    }, [setGenreId]);
    const selectedArtistIds = useMemo(() => query[FILTER_KEYS.SONG.ARTIST_IDS] ?? [], [query]);
    const handleArtistSelectModeChange = useCallback((value) => {
        const newMode = value;
        setArtistSelectMode(newMode);
        if (newMode === 'single' && selectedArtistIds.length > 1) {
            setArtistIds([selectedArtistIds[0]]);
        }
    }, [selectedArtistIds, setArtistIds, setArtistSelectMode]);
    const artistIdsMode = query[FILTER_KEYS.SONG.ARTIST_IDS_MODE] ?? 'and';
    const handleArtistChange = useCallback((e) => {
        if (e && e.length > 0) {
            setArtistIds(e);
        }
        else {
            setArtistIds(null);
        }
    }, [setArtistIds]);
    const selectedAlbumArtistIds = useMemo(() => query[FILTER_KEYS.SONG.ALBUM_ARTIST_IDS] ?? [], [query]);
    const handleAlbumArtistSelectModeChange = useCallback((value) => {
        const newMode = value;
        setAlbumArtistSelectMode(newMode);
        if (newMode === 'single' && selectedAlbumArtistIds.length > 1) {
            setAlbumArtistIds([selectedAlbumArtistIds[0]]);
        }
    }, [selectedAlbumArtistIds, setAlbumArtistIds, setAlbumArtistSelectMode]);
    const albumArtistIdsMode = query[FILTER_KEYS.SONG.ALBUM_ARTIST_IDS_MODE] ?? 'and';
    const handleAlbumArtistChange = useCallback((e) => {
        if (e && e.length > 0) {
            setAlbumArtistIds(e);
        }
        else {
            setAlbumArtistIds(null);
        }
    }, [setAlbumArtistIds]);
    const queryFavorite = query[FILTER_KEYS.SONG.FAVORITE];
    const queryMinYear = query[FILTER_KEYS.SONG.MIN_YEAR];
    const queryMaxYear = query[FILTER_KEYS.SONG.MAX_YEAR];
    const matchAndLabel = t('filter.matchAnd', { postProcess: 'titleCase' });
    const matchOrLabel = t('filter.matchOr', { postProcess: 'titleCase' });
    const filterSingleLabel = t('common.filter_single', { postProcess: 'titleCase' });
    const filterMultipleLabel = t('common.filter_multiple', { postProcess: 'titleCase' });
    return (_jsxs(Stack, { px: "md", py: "md", children: [_jsx(BooleanSegmentFilter, { label: t('filter.isFavorited', { postProcess: 'sentenceCase' }), onChange: setFavorite, segmentData: segmentedControlData, value: queryFavorite }), _jsx(Divider, { my: "md" }), _jsx(MultiSelectFilter, { height: 300, label: _jsx(MultiSelectFilterLabel, { andOrValue: artistIdsMode, entityLabel: t('entity.artist', { count: 2, postProcess: 'sentenceCase' }), filterMultipleLabel: filterMultipleLabel, filterSingleLabel: filterSingleLabel, matchAndLabel: matchAndLabel, matchOrLabel: matchOrLabel, onAndOrChange: setArtistIdsMode, onSingleMultiChange: handleArtistSelectModeChange, showAndOr: artistSelectMode === 'multi', singleMultiValue: artistSelectMode }), onChange: handleArtistChange, options: artistOptions, RowComponent: ArtistMultiSelectRow, singleSelect: artistSelectMode === 'single', value: selectedArtistIds }), _jsx(Divider, { my: "md" }), _jsx(MultiSelectFilter, { height: 300, label: _jsx(MultiSelectFilterLabel, { andOrValue: albumArtistIdsMode, entityLabel: t('entity.albumArtist', {
                        count: 2,
                        postProcess: 'sentenceCase',
                    }), filterMultipleLabel: filterMultipleLabel, filterSingleLabel: filterSingleLabel, matchAndLabel: matchAndLabel, matchOrLabel: matchOrLabel, onAndOrChange: setAlbumArtistIdsMode, onSingleMultiChange: handleAlbumArtistSelectModeChange, showAndOr: albumArtistSelectMode === 'multi', singleMultiValue: albumArtistSelectMode }), onChange: handleAlbumArtistChange, options: albumArtistOptions, RowComponent: ArtistMultiSelectRow, singleSelect: albumArtistSelectMode === 'single', value: selectedAlbumArtistIds }), _jsx(Divider, { my: "md" }), _jsx(MultiSelectFilter, { height: 220, label: _jsx(MultiSelectFilterLabel, { andOrValue: genreIdsMode, entityLabel: t('entity.genre', { count: 2, postProcess: 'sentenceCase' }), filterMultipleLabel: filterMultipleLabel, filterSingleLabel: filterSingleLabel, matchAndLabel: matchAndLabel, matchOrLabel: matchOrLabel, onAndOrChange: setGenreIdsMode, onSingleMultiChange: handleGenreSelectModeChange, showAndOr: genreSelectMode === 'multi', singleMultiValue: genreSelectMode }), onChange: handleGenreChange, options: genreOptions, RowComponent: GenreMultiSelectRow, singleSelect: genreSelectMode === 'single', value: selectedGenreIds }), _jsx(Divider, { my: "md" }), _jsx(YearRangeFilter, { fromYearLabel: t('filter.fromYear', { postProcess: 'titleCase' }), maxYear: queryMaxYear, minYear: queryMinYear, onMaxYear: debouncedHandleMaxYear, onMinYear: debouncedHandleMinYear, toYearLabel: t('filter.toYear', { postProcess: 'titleCase' }) })] }));
};
