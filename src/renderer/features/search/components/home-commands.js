import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { nanoid } from 'nanoid/non-secure';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createSearchParams, generatePath, useNavigate } from 'react-router';
import { openCreatePlaylistModal } from '/@/renderer/features/playlists/components/create-playlist-form';
import { Command, CommandPalettePages } from '/@/renderer/features/search/components/command';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer } from '/@/renderer/store';
import { LibraryItem } from '/@/shared/types/domain-types';
export const HomeCommands = ({ handleClose, pages, query, setPages, setQuery, }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const server = useCurrentServer();
    const handleCreatePlaylistModal = useCallback(() => {
        handleClose();
        openCreatePlaylistModal(server);
    }, [handleClose, server]);
    const handleSearch = () => {
        navigate({
            pathname: generatePath(AppRoute.SEARCH, { itemType: LibraryItem.SONG }),
            search: createSearchParams({
                query,
            }).toString(),
        }, {
            state: {
                navigationId: nanoid(),
            },
        });
        handleClose();
        setQuery('');
    };
    return (_jsx(_Fragment, { children: _jsxs(Command.Group, { heading: t('page.globalSearch.title', { postProcess: 'titleCase' }), children: [_jsx(Command.Item, { onSelect: handleSearch, value: t('common.search', { postProcess: 'sentenceCase' }), children: query
                        ? t('page.globalSearch.commands.searchFor', {
                            postProcess: 'sentenceCase',
                            query,
                        })
                        : `${t('common.search', { postProcess: 'sentenceCase' })}...` }), _jsxs(Command.Item, { onSelect: handleCreatePlaylistModal, children: [t('action.createPlaylist', { postProcess: 'sentenceCase' }), "..."] }), _jsxs(Command.Item, { onSelect: () => setPages([...pages, CommandPalettePages.GO_TO]), children: [t('page.globalSearch.commands.goToPage', { postProcess: 'sentenceCase' }), "..."] }), _jsxs(Command.Item, { onSelect: () => setPages([...pages, CommandPalettePages.MANAGE_SERVERS]), children: [t('page.globalSearch.commands.serverCommands', {
                            postProcess: 'sentenceCase',
                        }), "..."] })] }) }));
};
