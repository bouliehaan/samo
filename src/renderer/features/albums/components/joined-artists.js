import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, memo } from 'react';
import { generatePath, Link } from 'react-router';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentArtist, useCurrentServer } from '/@/renderer/store';
import { Text } from '/@/shared/components/text/text';
export const JOINED_ARTISTS_MUTED_PROPS = {
    linkProps: { fw: 400, isMuted: true },
    rootTextProps: { fw: 400, isMuted: true, size: 'sm' },
};
const JoinedArtistsComponent = ({ artistName, artists, linkProps, readOnly = false, rootTextProps, }) => {
    const server = useCurrentServer();
    const recordArtistClick = (artist) => {
        recordRecentArtist(artist, { serverId: server?.id, serverType: server?.type });
    };
    const parts = [];
    const matches = [];
    for (const artist of artists) {
        const name = artist.name;
        // Avoid an infinite loop when `artist.name` is an empty string.
        if (!name)
            continue;
        const regex = new RegExp(escapeRegex(name), 'gi');
        let match = null;
        while ((match = regex.exec(artistName)) !== null) {
            matches.push({
                artist,
                end: match.index + match[0].length,
                name: match[0],
                start: match.index,
            });
        }
    }
    matches.sort((a, b) => {
        const lengthDiff = b.end - b.start - (a.end - a.start);
        if (lengthDiff !== 0)
            return lengthDiff;
        return a.start - b.start;
    });
    const nonOverlappingMatches = [];
    for (const match of matches) {
        const overlaps = nonOverlappingMatches.some((existing) => (match.start >= existing.start && match.start < existing.end) ||
            (match.end > existing.start && match.end <= existing.end) ||
            (match.start <= existing.start && match.end >= existing.end));
        if (!overlaps) {
            nonOverlappingMatches.push(match);
        }
    }
    nonOverlappingMatches.sort((a, b) => a.start - b.start);
    let lastIndex = 0;
    for (const match of nonOverlappingMatches) {
        if (match.start > lastIndex) {
            parts.push(artistName.substring(lastIndex, match.start));
        }
        parts.push({
            artist: match.artist,
            end: match.end,
            start: match.start,
            text: match.name,
        });
        lastIndex = match.end;
    }
    if (lastIndex < artistName?.length) {
        parts.push(artistName.substring(lastIndex));
    }
    const hasArtistMatches = parts.some((part) => typeof part !== 'string');
    // Find artists that were matched
    const matchedArtistIds = new Set(nonOverlappingMatches.map((match) => match.artist.id));
    // Find artists that are not present in the artist name
    const unmatchedArtists = artists.filter((artist) => artist.name && !matchedArtistIds.has(artist.id));
    // If no matches found and there are album artists, return the album artists
    if (!hasArtistMatches && artists.length > 0) {
        return (_jsx(Text, { component: "span", ...rootTextProps, children: artists.map((artist, index) => (_jsxs(Fragment, { children: [index > 0 && ', ', artist.id && !readOnly ? (_jsx(Text, { component: Link, fw: 500, isLink: true, onClick: () => recordArtistClick(artist), to: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                            albumArtistId: artist.id,
                        }), ...linkProps, children: artist.name })) : (_jsx(Text, { component: "span", fw: 500, ...linkProps, children: artist.name }))] }, artist.id || `artist-${index}`))) }));
    }
    // If no matches found and no albumArtists, return the original string
    if (!hasArtistMatches) {
        return (_jsx(Text, { fw: 400, isNoSelect: true, ...rootTextProps, children: artistName }));
    }
    return (_jsxs(Text, { component: "span", fw: 400, ...rootTextProps, children: [parts.map((part, index) => {
                if (typeof part === 'string') {
                    return _jsx(Fragment, { children: part }, index);
                }
                const { artist, text } = part;
                if (artist.id && !readOnly) {
                    return (_jsx(Text, { component: Link, fw: 500, isLink: true, onClick: () => recordArtistClick(artist), to: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                            albumArtistId: artist.id,
                        }), ...linkProps, children: text }, `${artist.id}-${index}`));
                }
                return (_jsx(Text, { component: "span", fw: 500, ...linkProps, children: text }, `${artist.name}-${index}`));
            }), unmatchedArtists.length > 0 && (_jsxs(_Fragment, { children: [', ', unmatchedArtists.map((artist, index) => (_jsxs(Fragment, { children: [index > 0 && ', ', artist.id && !readOnly ? (_jsx(Text, { component: Link, fw: 500, isLink: true, onClick: () => recordArtistClick(artist), to: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                                    albumArtistId: artist.id,
                                }), ...linkProps, children: artist.name })) : artist.id ? (_jsx(Text, { component: "span", fw: 500, ...linkProps, children: artist.name })) : (_jsx(Text, { component: "span", isMuted: true, children: artist.name }))] }, artist.id)))] }))] }));
};
export const JoinedArtists = memo(JoinedArtistsComponent);
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
