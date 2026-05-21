import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import { generatePath, Link } from 'react-router';
import { AppRoute } from '/@/renderer/router/routes';
import { Text } from '/@/shared/components/text/text';
const TEXT_PROPS = { isMuted: true, isNoSelect: true, size: 'sm' };
export const GenreColumn = ({ isRowHovered, song }) => {
    const genres = song.genres ?? [];
    if (!genres.length)
        return _jsx(_Fragment, { children: "\u00A0" });
    return (_jsx(_Fragment, { children: genres.map((genre, index) => (_jsxs(Fragment, { children: [isRowHovered ? (_jsx(Text, { component: Link, isLink: true, state: { item: genre }, to: generatePath(AppRoute.LIBRARY_GENRES_DETAIL, {
                        genreId: genre.id,
                    }), ...TEXT_PROPS, children: genre.name })) : (_jsx(Text, { component: "span", ...TEXT_PROPS, children: genre.name })), index < genres.length - 1 && ', '] }, genre.id))) }));
};
