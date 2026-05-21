import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import shuffle from 'lodash/shuffle';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, Link } from 'react-router';
import styles from './featured-genres.module.css';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { genresQueries } from '/@/renderer/features/genres/api/genres-api';
import { useIsPlayerFetching, usePlayer } from '/@/renderer/features/player/context/player-context';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { useContainerQuery } from '/@/renderer/hooks';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer, useCurrentServerId } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { GenreListSort, Played, SortOrder } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
import { stringToColor } from '/@/shared/utils/string-to-color';
function getGenresToShow(breakpoints) {
    if (breakpoints.isLargerThanXxxl) {
        return 18;
    }
    if (breakpoints.isLargerThanXxl) {
        return 15;
    }
    if (breakpoints.isLargerThanXl) {
        return 12;
    }
    if (breakpoints.isLargerThanLg) {
        return 12;
    }
    if (breakpoints.isLargerThanMd) {
        return 12;
    }
    if (breakpoints.isLargerThanSm) {
        return 8;
    }
    return 6;
}
export const FeaturedGenres = () => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const { ref, ...cq } = useContainerQuery({
        lg: 900,
        md: 600,
        sm: 360,
    });
    const genresQuery = useQuery({
        ...genresQueries.list({
            query: {
                limit: -1,
                sortBy: GenreListSort.NAME,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId: server?.id,
        }),
        enabled: Boolean(server?.id),
        queryKey: [server?.id ?? '', 'home', 'featured-genres'],
    });
    const hasNoGenres = !genresQuery.data?.items?.length;
    const randomGenres = useMemo(() => {
        if (!genresQuery.data?.items)
            return [];
        return shuffle(genresQuery.data.items);
    }, [genresQuery.data]);
    const genresToShow = useMemo(() => {
        return getGenresToShow({
            isLargerThanLg: cq.isLg,
            isLargerThanMd: cq.isMd,
            isLargerThanSm: cq.isSm,
            isLargerThanXl: cq.isXl,
            isLargerThanXxl: cq.is2xl,
            isLargerThanXxxl: cq.is3xl,
        });
    }, [cq.isLg, cq.isMd, cq.isSm, cq.isXl, cq.is2xl, cq.is3xl]);
    const visibleGenres = useMemo(() => {
        return randomGenres.slice(0, genresToShow);
    }, [randomGenres, genresToShow]);
    const genresWithColors = useMemo(() => {
        if (!visibleGenres)
            return [];
        return visibleGenres.map((genre) => {
            const { color, isLight } = stringToColor(genre.name);
            const path = generatePath(AppRoute.LIBRARY_GENRES_DETAIL, { genreId: genre.id });
            return {
                ...genre,
                color,
                isLight,
                path,
            };
        });
    }, [visibleGenres]);
    if (!server?.id || genresQuery.isError || hasNoGenres) {
        return null;
    }
    return (_jsx("div", { className: styles.container, ref: ref, children: cq.isCalculated && (_jsxs(_Fragment, { children: [_jsxs(Group, { align: "flex-end", justify: "space-between", children: [_jsx(TextTitle, { fw: 700, isNoSelect: true, order: 3, children: t('entity.genre', { count: 2, postProcess: 'titleCase' }) }), _jsx(Button, { component: Link, size: "compact-sm", to: AppRoute.LIBRARY_GENRES, variant: "subtle", children: t('action.viewMore', { postProcess: 'sentenceCase' }) })] }), _jsx("div", { className: styles.grid, children: genresWithColors.map((genre) => (_jsx(GenreItem, { genre: genre }, genre.id))) })] })) }));
};
const GenrePlayButton = ({ genre }) => {
    const queryClient = useQueryClient();
    const isPlayerFetching = useIsPlayerFetching();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const handlePlay = useCallback(async (genre) => {
        if (!serverId)
            return;
        const data = await queryClient.fetchQuery({
            gcTime: 0,
            queryFn: () => {
                return api.controller.getRandomSongList({
                    apiClientProps: { serverId },
                    query: {
                        genre: genre.id,
                        limit: 100,
                        played: Played.All,
                    },
                });
            },
            queryKey: queryKeys.player.fetch(),
            staleTime: 0,
        });
        player.addToQueueByData(data?.items || [], Play.NOW);
    }, [player, queryClient, serverId]);
    return (_jsx("span", { className: styles.playButtonWrapper, children: _jsx(PlayButton, { fill: true, isSecondary: true, loading: isPlayerFetching, onClick: () => handlePlay(genre) }) }));
};
const GenreItem = memo(({ genre }) => {
    return (_jsx("div", { className: styles.genreContainer, style: {
            '--genre-color': genre.color,
        }, children: _jsxs(Link, { className: styles.genreLink, state: { item: genre }, to: genre.path, children: [_jsx("span", { className: styles.genreName, children: genre.name }), _jsx(GenrePlayButton, { genre: genre })] }) }, genre.id));
});
GenreItem.displayName = 'GenreItem';
