import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Command, CommandPalettePages } from '/@/renderer/features/search/components/command';
import { openSettingsModal } from '/@/renderer/features/settings/utils/open-settings-modal';
import { AppRoute } from '/@/renderer/router/routes';
export const GoToCommands = ({ handleClose, setPages, setQuery }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const goTo = useCallback((route) => {
        navigate(route);
        handleClose();
        setPages([CommandPalettePages.HOME]);
        setQuery('');
    }, [handleClose, navigate, setPages, setQuery]);
    return (_jsxs(_Fragment, { children: [_jsxs(Command.Group, { children: [_jsx(Command.Item, { onSelect: () => goTo(AppRoute.HOME), children: t('page.sidebar.home', { postProcess: 'titleCase' }) }), _jsx(Command.Item, { onSelect: () => goTo(AppRoute.SEARCH), children: t('page.sidebar.search', { postProcess: 'titleCase' }) }), _jsx(Command.Item, { onSelect: () => {
                            openSettingsModal();
                        }, children: t('page.sidebar.settings', { postProcess: 'titleCase' }) })] }), _jsxs(Command.Group, { heading: "Library", children: [_jsx(Command.Item, { onSelect: () => goTo(AppRoute.LIBRARY_ALBUMS), children: t('page.sidebar.albums', { postProcess: 'titleCase' }) }), _jsx(Command.Item, { onSelect: () => goTo(AppRoute.LIBRARY_SONGS), children: t('page.sidebar.tracks', { postProcess: 'titleCase' }) }), _jsx(Command.Item, { onSelect: () => goTo(AppRoute.LIBRARY_ALBUM_ARTISTS), children: t('page.sidebar.albumArtists', { postProcess: 'titleCase' }) }), _jsx(Command.Item, { onSelect: () => goTo(AppRoute.LIBRARY_GENRES), children: t('page.sidebar.genres', { postProcess: 'titleCase' }) }), _jsx(Command.Item, { onSelect: () => goTo(AppRoute.LIBRARY_FOLDERS), children: t('page.sidebar.folders', { postProcess: 'titleCase' }) }), _jsx(Command.Item, { onSelect: () => goTo(AppRoute.PLAYLISTS), children: t('page.sidebar.playlists', { postProcess: 'titleCase' }) })] }), _jsx(Command.Separator, {})] }));
};
