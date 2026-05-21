import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentArtist } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem, } from '/@/shared/types/domain-types';
export const GoToAction = ({ items }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { albumArtists, albumId } = useMemo(() => {
        const firstItem = items[0];
        if (firstItem._itemType === LibraryItem.ALBUM) {
            return {
                albumArtists: firstItem.albumArtists || [],
                albumId: firstItem.id,
            };
        }
        else if (firstItem._itemType === LibraryItem.SONG) {
            return {
                albumArtists: firstItem.albumArtists || [],
                albumId: firstItem.albumId,
            };
        }
        else if (firstItem._itemType === LibraryItem.ARTIST ||
            firstItem._itemType === LibraryItem.ALBUM_ARTIST) {
            return {
                albumArtists: [{ id: firstItem.id, name: firstItem.name }],
                albumId: null,
            };
        }
        return {
            albumArtists: [],
            albumId: null,
        };
    }, [items]);
    const handleGoToAlbum = useCallback(() => {
        if (!albumId)
            return;
        navigate(generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId }));
    }, [albumId, navigate]);
    const handleGoToAlbumArtist = useCallback((albumArtistId) => {
        const firstItem = items[0];
        const artist = firstItem._itemType === LibraryItem.ARTIST ||
            firstItem._itemType === LibraryItem.ALBUM_ARTIST
            ? firstItem
            : firstItem._itemType === LibraryItem.SONG
                ? firstItem.albumArtists.find((item) => item.id === albumArtistId)
                : undefined;
        if (artist) {
            recordRecentArtist(artist, {
                serverId: firstItem._serverId,
                serverType: firstItem._serverType,
            });
        }
        navigate(generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, { albumArtistId }));
    }, [items, navigate]);
    const hasAlbum = !!albumId;
    return (_jsxs(ContextMenu.Submenu, { disabled: items.length !== 1, children: [_jsx(ContextMenu.SubmenuTarget, { children: _jsx(ContextMenu.Item, { leftIcon: "externalLink", onSelect: (e) => e.preventDefault(), rightIcon: "arrowRightS", children: t('page.contextMenu.goTo', { postProcess: 'sentenceCase' }) }) }), _jsxs(ContextMenu.SubmenuContent, { children: [hasAlbum && (_jsx(ContextMenu.Item, { leftIcon: "album", onSelect: handleGoToAlbum, children: t('page.contextMenu.goToAlbum', { postProcess: 'sentenceCase' }) })), albumArtists.map((albumArtist) => (_jsx(ContextMenu.Item, { leftIcon: "artist", onSelect: () => handleGoToAlbumArtist(albumArtist.id), children: `${t('page.contextMenu.goTo', { postProcess: 'sentenceCase' })} ${albumArtist.name}` }, albumArtist.id)))] })] }));
};
