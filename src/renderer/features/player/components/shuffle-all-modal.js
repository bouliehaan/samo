import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openContextModal } from '@mantine/modals';
import { queryOptions, useQuery } from '@tanstack/react-query';
import merge from 'lodash/merge';
import { Suspense, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createWithEqualityFn } from 'zustand/traditional';
import i18n from '/@/i18n/i18n';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { useGenreList } from '/@/renderer/features/genres/api/genres-api';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { PlayButtonGroup } from '/@/renderer/features/shared/components/play-button-group';
import { useCurrentServer } from '/@/renderer/store';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Select } from '/@/shared/components/select/select';
import { Stack } from '/@/shared/components/stack/stack';
import { Played, ServerType } from '/@/shared/types/domain-types';
const useShuffleAllStore = createWithEqualityFn()(persist(immer((set, get) => ({
    actions: {
        setStore: (data) => {
            set({ ...get(), ...data });
        },
    },
    enableMaxYear: false,
    enableMinYear: false,
    genre: '',
    maxYear: 2020,
    minYear: 2000,
    musicFolder: '',
    played: Played.All,
    songCount: 100,
})), {
    merge: (persistedState, currentState) => merge(currentState, persistedState),
    name: 'store_shuffle_all',
    version: 1,
}));
const PLAYED_DATA = [
    { label: 'all tracks', value: Played.All },
    { label: 'only unplayed tracks', value: Played.Never },
    { label: 'only played tracks', value: Played.Played },
];
export const useShuffleAllStoreActions = () => useShuffleAllStore((state) => state.actions);
export const ShuffleAllContextModal = () => {
    const server = useCurrentServer();
    const { addToQueueByData } = usePlayer();
    const { t } = useTranslation();
    const { enableMaxYear, enableMinYear, genre, limit, maxYear, minYear, musicFolderId, played } = useShuffleAllStore();
    const { setStore } = useShuffleAllStoreActions();
    const { isFetching, refetch } = useQuery({
        ...randomFetchQuery({
            query: {
                genre: genre || undefined,
                limit: limit || 100,
                maxYear: enableMaxYear ? maxYear || undefined : undefined,
                minYear: enableMinYear ? minYear || undefined : undefined,
                musicFolderId: musicFolderId || undefined,
                played,
            },
            serverId: server.id,
        }),
        enabled: false,
        gcTime: 0,
        staleTime: 0,
    });
    const fetchTypeRef = useRef(null);
    const handlePlay = async (playType) => {
        fetchTypeRef.current = playType;
        const { data } = await refetch();
        addToQueueByData(data?.items || [], playType);
        closeAllModals();
    };
    return (_jsxs(Stack, { gap: "md", children: [_jsx(NumberInput, { label: t('form.shuffleAll.input_limit', { postProcess: 'sentenceCase' }), max: 500, min: 1, onChange: (e) => setStore({ limit: e ? Number(e) : 500 }), required: true, value: limit }), _jsxs(Group, { grow: true, children: [_jsx(NumberInput, { label: t('form.shuffleAll.input_minYear', { postProcess: 'sentenceCase' }), max: 2050, min: 1850, onChange: (e) => setStore({ minYear: e ? Number(e) : 0 }), rightSection: _jsx(Checkbox, { checked: enableMinYear, onChange: (e) => setStore({ enableMinYear: e.currentTarget.checked }), style: { marginRight: '0.5rem' } }), value: minYear }), _jsx(NumberInput, { label: t('form.shuffleAll.input_maxYear', { postProcess: 'sentenceCase' }), max: 2050, min: 1850, onChange: (e) => setStore({ maxYear: e ? Number(e) : 0 }), rightSection: _jsx(Checkbox, { checked: enableMaxYear, onChange: (e) => setStore({ enableMaxYear: e.currentTarget.checked }), style: { marginRight: '0.5rem' } }), value: maxYear })] }), _jsx(Suspense, { fallback: _jsx(Select, { data: [] }), children: _jsx(GenreSelect, {}) }), server?.type === ServerType.JELLYFIN && (_jsx(Select, { clearable: true, data: PLAYED_DATA, label: t('form.shuffleAll.input_played', { postProcess: 'sentenceCase' }), onChange: (e) => {
                    setStore({ played: e });
                }, value: played })), _jsx(Divider, {}), _jsx(PlayButtonGroup, { loading: (isFetching && fetchTypeRef.current) || false, onPlay: handlePlay })] }));
};
const randomFetchQuery = (args) => {
    return queryOptions({
        queryFn: async ({ signal }) => {
            return api.controller.getRandomSongList({
                apiClientProps: { serverId: args.serverId, signal },
                query: args.query,
            });
        },
        queryKey: queryKeys.player.fetch(),
    });
};
export const openShuffleAllModal = async () => {
    openContextModal({
        innerProps: {},
        modal: 'shuffleAll',
        size: 'sm',
        title: i18n.t('player.playRandom', { postProcess: 'sentenceCase' }),
    });
};
const GenreSelect = () => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const { genre } = useShuffleAllStore();
    const { data: genres } = useGenreList();
    const { setStore } = useShuffleAllStoreActions();
    const genreData = useMemo(() => {
        if (!genres)
            return [];
        return genres.items.map((genre) => {
            const value = server?.type === ServerType.NAVIDROME || server?.type === ServerType.SUBSONIC
                ? genre.name
                : genre.id;
            return {
                label: genre.name,
                value,
            };
        });
    }, [genres, server.type]);
    return (_jsx(Select, { clearable: true, data: genreData, label: t('form.shuffleAll.input_genre', { postProcess: 'sentenceCase' }), onChange: (e) => setStore({ genre: e || '' }), searchable: true, value: genre }));
};
