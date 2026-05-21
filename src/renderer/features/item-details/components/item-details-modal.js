import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, Link } from 'react-router';
import { SongPath } from '/@/renderer/features/item-details/components/song-path';
import { AppRoute } from '/@/renderer/router/routes';
import { formatDurationString, formatSizeString } from '/@/renderer/utils';
import { formatDateRelative } from '/@/renderer/utils/format';
import { replaceURLWithHTMLLinks } from '/@/renderer/utils/linkify';
import { normalizeReleaseTypes } from '/@/renderer/utils/normalize-release-types';
import { sanitize } from '/@/renderer/utils/sanitize';
import { SEPARATOR_STRING } from '/@/shared/api/utils';
import { Icon } from '/@/shared/components/icon/icon';
import { Select } from '/@/shared/components/select/select';
import { Separator } from '/@/shared/components/separator/separator';
import { Spoiler } from '/@/shared/components/spoiler/spoiler';
import { Stack } from '/@/shared/components/stack/stack';
import { Table } from '/@/shared/components/table/table';
import { Text } from '/@/shared/components/text/text';
import { ExplicitStatus, LibraryItem, } from '/@/shared/types/domain-types';
const handleRow = (t, item, rule) => {
    let value;
    if (rule.render) {
        value = rule.render(item, t);
    }
    else {
        const prop = item[rule.key];
        value = prop !== undefined && prop !== null ? String(prop) : null;
    }
    if (!value)
        return null;
    return (_jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: t(rule.label, {
                    ...(rule.count !== undefined && { count: rule.count }),
                    postProcess: rule.postprocess || 'sentenceCase',
                }) }), _jsx(Table.Td, { children: value })] }, rule.label));
};
const formatArtists = (artists) => artists?.map((artist, index) => (_jsxs("span", { children: [index > 0 && _jsx(Separator, {}), artist.id ? (_jsx(Text, { component: Link, fw: 600, isLink: true, overflow: "visible", size: "md", to: artist.id
                ? generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                    albumArtistId: artist.id,
                })
                : '', children: artist.name || '—' })) : (_jsx(Text, { component: "span", overflow: "visible", size: "md", children: artist.name || '-' }))] }, artist.id || artist.name)));
const formatComment = (item) => item.comment ? (_jsx(Spoiler, { maxHeight: 50, children: _jsx(Text, { children: replaceURLWithHTMLLinks(item.comment) }) })) : null;
const FormatGenre = (item) => {
    if (!item.genres?.length) {
        return null;
    }
    return item.genres?.map((genre, index) => (_jsxs("span", { children: [index > 0 && _jsx(Separator, {}), _jsx(Text, { component: Link, fw: 600, isLink: true, overflow: "visible", size: "md", to: genre.id
                    ? generatePath(AppRoute.LIBRARY_GENRES_DETAIL, { genreId: genre.id })
                    : '', children: genre.name || '—' })] }, genre.id)));
};
const BoolField = (key) => key ? _jsx(Icon, { color: "success", icon: "check" }) : _jsx(Icon, { color: "error", icon: "x" });
const AlbumPropertyMapping = [
    { key: 'name', label: 'common.title' },
    { count: 1, label: 'entity.albumArtist', render: (item) => formatArtists(item.albumArtists) },
    {
        label: 'common.releaseType',
        render: (item, t) => normalizeReleaseTypes(item.releaseTypes, t).join(SEPARATOR_STRING),
    },
    { count: 2, label: 'entity.genre', render: FormatGenre },
    {
        label: 'common.duration',
        render: (album) => album.duration && formatDurationString(album.duration),
    },
    { key: 'releaseYear', label: 'filter.releaseYear' },
    { key: 'songCount', label: 'filter.songCount' },
    {
        label: 'filter.explicitStatus',
        render: (album, t) => album.explicitStatus === ExplicitStatus.EXPLICIT
            ? t('common.explicit', { postProcess: 'sentenceCase' })
            : album.explicitStatus === ExplicitStatus.CLEAN
                ? t('common.clean', { postProcess: 'sentenceCase' })
                : null,
    },
    { label: 'filter.isCompilation', render: (album) => BoolField(album.isCompilation || false) },
    {
        key: 'size',
        label: 'common.size',
        render: (album) => album.size && formatSizeString(album.size),
    },
    {
        label: 'common.favorite',
        render: (album) => BoolField(album.userFavorite),
    },
    { key: 'playCount', label: 'filter.playCount' },
    {
        label: 'filter.lastPlayed',
        render: (song) => formatDateRelative(song.lastPlayedAt),
    },
    {
        label: 'common.modified',
        render: (song) => formatDateRelative(song.updatedAt),
    },
    { label: 'filter.comment', render: formatComment },
    {
        label: 'common.mbid',
        postprocess: [],
        render: (album) => album.mbzId ? (_jsx(Link, { rel: "noopener noreferrer", target: "_blank", to: `https://musicbrainz.org/release/${album.mbzId}`, children: album.mbzId })) : null,
    },
    { key: 'id', label: 'filter.id' },
    { key: 'version', label: 'common.version' },
    { label: 'common.recordLabel', render: (item) => item.recordLabels.join(SEPARATOR_STRING) },
];
const AlbumArtistPropertyMapping = [
    { key: 'name', label: 'common.name' },
    { count: 2, label: 'entity.genre', render: FormatGenre },
    {
        label: 'common.duration',
        render: (artist) => artist.duration && formatDurationString(artist.duration),
    },
    { key: 'songCount', label: 'filter.songCount' },
    {
        label: 'common.favorite',
        render: (artist) => BoolField(artist.userFavorite),
    },
    { key: 'playCount', label: 'filter.playCount' },
    {
        label: 'filter.lastPlayed',
        render: (song) => formatDateRelative(song.lastPlayedAt),
    },
    {
        label: 'common.mbid',
        postprocess: [],
        render: (artist) => artist.mbz ? (_jsx(Link, { rel: "noopener noreferrer", target: "_blank", to: `https://musicbrainz.org/artist/${artist.mbz}`, children: artist.mbz })) : null,
    },
    {
        label: 'common.biography',
        render: (artist) => artist.biography ? (_jsx(Spoiler, { children: _jsx(Text, { dangerouslySetInnerHTML: { __html: sanitize(artist.biography) } }) })) : null,
    },
    { key: 'id', label: 'filter.id' },
];
const PlaylistPropertyMapping = [
    { key: 'name', label: 'common.title' },
    { key: 'description', label: 'common.description' },
    { count: 2, label: 'entity.genre', render: FormatGenre },
    {
        label: 'common.duration',
        render: (playlist) => playlist.duration && formatDurationString(playlist.duration),
    },
    { key: 'songCount', label: 'filter.songCount' },
    {
        key: 'size',
        label: 'common.size',
        render: (playlist) => playlist.size && formatSizeString(playlist.size),
    },
    { key: 'owner', label: 'common.owner' },
    { key: 'public', label: 'form.createPlaylist.input_public' },
    {
        label: 'entity.smartPlaylist',
        render: (playlist) => (playlist.rules ? BoolField(true) : null),
    },
    { key: 'id', label: 'filter.id' },
];
const SongPropertyMapping = [
    { key: 'name', label: 'common.title' },
    { key: 'path', label: 'common.path', render: SongPath },
    { count: 1, label: 'entity.albumArtist', render: (item) => formatArtists(item.albumArtists) },
    {
        count: 2,
        key: 'artists',
        label: 'entity.artist',
        render: (item) => formatArtists(item.artists),
    },
    {
        count: 1,
        key: 'album',
        label: 'entity.album',
        render: (song) => song.albumId &&
            song.album && (_jsx(Text, { component: Link, fw: 600, isLink: true, overflow: "visible", size: "md", to: song.albumId
                ? generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                    albumId: song.albumId,
                })
                : '', children: song.album })),
    },
    { key: 'discNumber', label: 'common.disc' },
    { key: 'trackNumber', label: 'common.trackNumber' },
    { key: 'releaseYear', label: 'filter.releaseYear' },
    {
        label: 'filter.explicitStatus',
        render: (song, t) => song.explicitStatus === ExplicitStatus.EXPLICIT
            ? t('common.explicit', { postProcess: 'sentenceCase' })
            : song.explicitStatus === ExplicitStatus.CLEAN
                ? t('common.clean', { postProcess: 'sentenceCase' })
                : null,
    },
    { count: 2, label: 'entity.genre', render: FormatGenre },
    {
        label: 'common.duration',
        render: (song) => formatDurationString(song.duration),
    },
    { label: 'filter.isCompilation', render: (song) => BoolField(song.compilation || false) },
    { key: 'container', label: 'common.codec' },
    { key: 'bitRate', label: 'common.bitrate', render: (song) => `${song.bitRate} kbps` },
    { key: 'sampleRate', label: 'common.sampleRate' },
    { key: 'bitDepth', label: 'common.bitDepth' },
    { count: 2, key: 'channels', label: 'common.channel' },
    { key: 'size', label: 'common.size', render: (song) => formatSizeString(song.size) },
    {
        label: 'common.favorite',
        render: (song) => BoolField(song.userFavorite),
    },
    { key: 'playCount', label: 'filter.playCount' },
    {
        label: 'filter.lastPlayed',
        render: (song) => formatDateRelative(song.lastPlayedAt),
    },
    {
        label: 'common.modified',
        render: (song) => formatDateRelative(song.updatedAt),
    },
    {
        label: 'common.albumGain',
        render: (song) => (song.gain?.album !== undefined ? `${song.gain.album} dB` : null),
    },
    {
        label: 'common.trackGain',
        render: (song) => (song.gain?.track !== undefined ? `${song.gain.track} dB` : null),
    },
    {
        label: 'common.albumPeak',
        render: (song) => (song.peak?.album !== undefined ? `${song.peak.album}` : null),
    },
    {
        label: 'common.trackPeak',
        render: (song) => (song.peak?.track !== undefined ? `${song.peak.track}` : null),
    },
    { label: 'filter.comment', render: formatComment },
    { key: 'id', label: 'filter.id' },
];
const handleTags = (item, t) => {
    if (item.tags) {
        const tags = Object.entries(item.tags).map(([tag, fields]) => {
            return (_jsxs(Table.Tr, { children: [_jsxs(Table.Th, { children: [tag.slice(0, 1).toLocaleUpperCase(), tag.slice(1)] }), _jsx(Table.Td, { children: fields.length === 0 ? BoolField(true) : fields.join(SEPARATOR_STRING) })] }, tag));
        });
        if (tags.length) {
            return [
                _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: t('common.tags', { postProcess: 'sentenceCase' }) }), _jsx(Table.Td, { children: tags.length })] }, "tags"),
            ].concat(tags);
        }
    }
    return [];
};
const handleParticipants = (item, t) => {
    if (item.participants) {
        const participants = Object.entries(item.participants).map(([role, participants]) => {
            return (_jsxs(Table.Tr, { children: [_jsxs(Table.Th, { children: [role.slice(0, 1).toLocaleUpperCase(), role.slice(1)] }), _jsx(Table.Td, { children: formatArtists(participants) })] }, role));
        });
        if (participants.length) {
            return [
                _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: t('common.additionalParticipants', {
                                postProcess: 'sentenceCase',
                            }) }), _jsx(Table.Td, { children: participants.length })] }, "participants"),
            ].concat(participants);
        }
    }
    return [];
};
export const ItemDetailsModal = ({ item, items }) => {
    const { t } = useTranslation();
    const allItems = useMemo(() => items || (item ? [item] : []), [item, items]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedItem = useMemo(() => {
        return allItems[selectedIndex] || null;
    }, [allItems, selectedIndex]);
    const selectData = useMemo(() => {
        return allItems.map((it, index) => ({
            label: it.name ||
                `${t('common.item', { defaultValue: 'Item', postProcess: 'sentenceCase' })} ${index + 1}`,
            value: String(index),
        }));
    }, [allItems, t]);
    if (!selectedItem) {
        return null;
    }
    let body = [];
    switch (selectedItem._itemType) {
        case LibraryItem.ALBUM:
            body = AlbumPropertyMapping.map((rule) => handleRow(t, selectedItem, rule));
            body.push(...handleParticipants(selectedItem, t));
            body.push(...handleTags(selectedItem, t));
            break;
        case LibraryItem.ALBUM_ARTIST:
            body = AlbumArtistPropertyMapping.map((rule) => handleRow(t, selectedItem, rule));
            break;
        case LibraryItem.PLAYLIST:
            body = PlaylistPropertyMapping.map((rule) => handleRow(t, selectedItem, rule));
            break;
        case LibraryItem.SONG:
            body = SongPropertyMapping.map((rule) => handleRow(t, selectedItem, rule));
            body.push(...handleParticipants(selectedItem, t));
            body.push(...handleTags(selectedItem, t));
            break;
        default:
            body = [];
    }
    return (_jsxs(Stack, { gap: "md", children: [allItems.length > 1 && (_jsx(Select, { data: selectData, onChange: (value) => {
                    if (value) {
                        setSelectedIndex(Number(value));
                    }
                }, value: String(selectedIndex) })), _jsx(Table, { highlightOnHover: false, styles: {
                    th: {
                        color: 'var(--theme-colors-foreground-muted)',
                        fontWeight: 500,
                        padding: 'var(--theme-spacing-sm)',
                    },
                    tr: {
                        color: 'var(--theme-colors-foreground-muted)',
                        padding: 'var(--theme-spacing-xl)',
                    },
                }, withRowBorders: true, children: _jsx(Table.Tbody, { children: body }) })] }));
};
