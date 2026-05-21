import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useDeferredValue, useRef, useState } from 'react';
import { Command, CommandPalettePages } from '/@/renderer/features/search/components/command';
import { GoToCommands } from '/@/renderer/features/search/components/go-to-commands';
import { HomeCommands } from '/@/renderer/features/search/components/home-commands';
import { SearchAlbumArtistsSection } from '/@/renderer/features/search/components/search-album-artists-section';
import { SearchAlbumsSection } from '/@/renderer/features/search/components/search-albums-section';
import { SearchSongsSection } from '/@/renderer/features/search/components/search-songs-section';
import { ServerCommands } from '/@/renderer/features/search/components/server-commands';
import { useAppStore } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Breadcrumb } from '/@/shared/components/breadcrumb/breadcrumb';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Kbd } from '/@/shared/components/kbd/kbd';
import { Modal } from '/@/shared/components/modal/modal';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { useDebouncedValue } from '/@/shared/hooks/use-debounced-value';
const SEARCH_SECTION_IDS = {
    albums: 'albums',
    artists: 'artists',
    tracks: 'tracks',
};
function CommandPaletteSearch({ children, isHome, onSelectResult, query, searchInputRef, setQuery, }) {
    const [debouncedQuery] = useDebouncedValue(query, 400);
    const deferredSearchQuery = useDeferredValue(debouncedQuery ?? '');
    const searchSectionsExpanded = useAppStore((state) => state.commandPaletteSearchSectionsExpanded);
    const setSearchSectionExpanded = useAppStore((state) => state.actions.setCommandPaletteSearchSectionExpanded);
    return (_jsxs(_Fragment, { children: [_jsx(TextInput, { "data-autofocus": true, leftSection: _jsx(Icon, { icon: "search" }), onChange: (e) => setQuery(e.currentTarget.value), ref: searchInputRef, rightSection: query && (_jsx(ActionIcon, { onClick: () => {
                        setQuery('');
                        searchInputRef.current?.focus();
                    }, variant: "transparent", children: _jsx(Icon, { icon: "x" }) })), size: "sm", value: query }), _jsx(Divider, { my: "sm" }), _jsxs(Command.List, { children: [_jsxs(Stack, { gap: "xs", children: [_jsx(SearchAlbumsSection, { debouncedQuery: deferredSearchQuery, expanded: searchSectionsExpanded[SEARCH_SECTION_IDS.albums] ?? true, isHome: isHome, onSelectResult: onSelectResult, onToggle: () => setSearchSectionExpanded(SEARCH_SECTION_IDS.albums, !(searchSectionsExpanded[SEARCH_SECTION_IDS.albums] ?? true)), query: query }), _jsx(SearchAlbumArtistsSection, { debouncedQuery: deferredSearchQuery, expanded: searchSectionsExpanded[SEARCH_SECTION_IDS.artists] ?? true, isHome: isHome, onSelectResult: onSelectResult, onToggle: () => setSearchSectionExpanded(SEARCH_SECTION_IDS.artists, !(searchSectionsExpanded[SEARCH_SECTION_IDS.artists] ?? true)), query: query }), _jsx(SearchSongsSection, { debouncedQuery: deferredSearchQuery, expanded: searchSectionsExpanded[SEARCH_SECTION_IDS.tracks] ?? true, isHome: isHome, onSelectResult: onSelectResult, onToggle: () => setSearchSectionExpanded(SEARCH_SECTION_IDS.tracks, !(searchSectionsExpanded[SEARCH_SECTION_IDS.tracks] ?? true)), query: query })] }), children] })] }));
}
export const CommandPalette = ({ modalProps }) => {
    const [value, setValue] = useState('');
    const [query, setQuery] = useState('');
    const [pages, setPages] = useState([CommandPalettePages.HOME]);
    const activePage = pages[pages.length - 1];
    const isHome = activePage === CommandPalettePages.HOME;
    const commandRootRef = useRef(null);
    const searchInputRef = useRef(null);
    const popPage = useCallback(() => {
        setPages((pages) => {
            const x = [...pages];
            x.splice(-1, 1);
            return x;
        });
    }, []);
    const handleSelectResult = useCallback(() => {
        modalProps.handlers.close();
        setQuery('');
    }, [modalProps.handlers]);
    return (_jsxs(Modal, { ...modalProps, centered: true, handlers: {
            ...modalProps.handlers,
            close: () => {
                if (isHome) {
                    modalProps.handlers.close();
                    setQuery('');
                }
                else {
                    popPage();
                }
            },
            toggle: () => {
                if (isHome) {
                    modalProps.handlers.toggle();
                    setQuery('');
                }
                else {
                    popPage();
                }
            },
        }, size: "lg", styles: {
            body: { padding: '0' },
            header: { display: 'none' },
        }, children: [_jsx(Command, { filter: (value, search) => {
                    if (value.includes(search))
                        return 1;
                    if (value.includes('search'))
                        return 1;
                    return 0;
                }, label: "Global Command Menu", onKeyDown: (e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        searchInputRef.current?.focus();
                    }
                    if (e.key === 'Tab' && !e.shiftKey) {
                        const root = commandRootRef.current;
                        if (!root)
                            return;
                        const selectedItem = root.querySelector('[cmdk-item][aria-selected="true"]');
                        if (!selectedItem)
                            return;
                        const focusTarget = selectedItem.querySelector('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
                        if (!focusTarget)
                            return;
                        e.preventDefault();
                        e.stopPropagation();
                        requestAnimationFrame(() => {
                            focusTarget.focus();
                        });
                    }
                }, onValueChange: setValue, ref: commandRootRef, value: value, children: _jsxs(CommandPaletteSearch, { isHome: isHome, onSelectResult: handleSelectResult, query: query, searchInputRef: searchInputRef, setQuery: setQuery, children: [activePage === CommandPalettePages.HOME && (_jsx(HomeCommands, { handleClose: modalProps.handlers.close, pages: pages, query: query, setPages: setPages, setQuery: setQuery })), activePage === CommandPalettePages.GO_TO && (_jsx(GoToCommands, { handleClose: modalProps.handlers.close, setPages: setPages, setQuery: setQuery })), activePage === CommandPalettePages.MANAGE_SERVERS && (_jsx(ServerCommands, { handleClose: modalProps.handlers.close, setPages: setPages, setQuery: setQuery }))] }) }), _jsx(Divider, { my: "sm" }), _jsxs(Group, { justify: "space-between", children: [_jsx(Breadcrumb, { separator: _jsx(Icon, { icon: "arrowRight" }), children: pages.map((page, index) => (_jsx(Button, { onClick: () => setPages((prev) => prev.slice(0, index + 1)), size: "compact-xs", variant: "subtle", children: page?.toLocaleUpperCase() }, page))) }), _jsxs(Group, { gap: "sm", children: [_jsx(Kbd, { size: "md", children: "ESC" }), _jsx(Kbd, { size: "md", children: "\u2191" }), _jsx(Kbd, { size: "md", children: "\u2193" }), _jsx(Kbd, { size: "md", children: "\u23CE" })] })] })] }));
};
