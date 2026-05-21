import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import debounce from 'lodash/debounce';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './hotkeys-manager-settings.module.css';
import i18n from '/@/i18n/i18n';
import { SettingsOptions } from '/@/renderer/features/settings/components/settings-option';
import { SettingsSection, } from '/@/renderer/features/settings/components/settings-section';
import { useSettingSearchContext } from '/@/renderer/features/settings/context/search-context';
import { useHotkeySettings, useSettingsStoreActions } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { Icon } from '/@/shared/components/icon/icon';
import { Table } from '/@/shared/components/table/table';
import { TextInput } from '/@/shared/components/text-input/text-input';
const ipc = isElectron() ? window.api.ipc : null;
const BINDINGS_MAP = {
    browserBack: i18n.t('setting.hotkey', { context: 'browserBack', postProcess: 'sentenceCase' }),
    browserForward: i18n.t('setting.hotkey', {
        context: 'browserForward',
        postProcess: 'sentenceCase',
    }),
    favoriteCurrentAdd: i18n.t('setting.hotkey', {
        context: 'favoriteCurrentSong',
        postProcess: 'sentenceCase',
    }),
    favoriteCurrentRemove: i18n.t('setting.hotkey', {
        context: 'unfavoriteCurrentSong',
        postProcess: 'sentenceCase',
    }),
    favoriteCurrentToggle: i18n.t('setting.hotkey', {
        context: 'toggleCurrentSongFavorite',
        postProcess: 'sentenceCase',
    }),
    favoritePreviousAdd: i18n.t('setting.hotkey', {
        context: 'favoritePreviousSong',
        postProcess: 'sentenceCase',
    }),
    favoritePreviousRemove: i18n.t('setting.hotkey', {
        context: 'unfavoritePreviousSong',
        postProcess: 'sentenceCase',
    }),
    favoritePreviousToggle: i18n.t('setting.hotkey', {
        context: 'togglePreviousSongFavorite',
        postProcess: 'sentenceCase',
    }),
    globalSearch: i18n.t('setting.hotkey', {
        context: 'globalSearch',
        postProcess: 'sentenceCase',
    }),
    listNavigateToPage: i18n.t('setting.hotkey', {
        context: 'listNavigateToPage',
        postProcess: 'sentenceCase',
    }),
    listPlayDefault: i18n.t('setting.hotkey', {
        context: 'listPlayDefault',
        postProcess: 'sentenceCase',
    }),
    listPlayLast: i18n.t('setting.hotkey', {
        context: 'listPlayLast',
        postProcess: 'sentenceCase',
    }),
    listPlayNext: i18n.t('setting.hotkey', {
        context: 'listPlayNext',
        postProcess: 'sentenceCase',
    }),
    listPlayNow: i18n.t('setting.hotkey', { context: 'listPlayNow', postProcess: 'sentenceCase' }),
    localSearch: i18n.t('setting.hotkey', { context: 'localSearch', postProcess: 'sentenceCase' }),
    navigateHome: i18n.t('setting.hotkey', {
        context: 'navigateHome',
        postProcess: 'sentenceCase',
    }),
    next: i18n.t('setting.hotkey', { context: 'playbackNext', postProcess: 'sentenceCase' }),
    pause: i18n.t('setting.hotkey', { context: 'playbackPause', postProcess: 'sentenceCase' }),
    play: i18n.t('setting.hotkey', { context: 'playbackPlay', postProcess: 'sentenceCase' }),
    playPause: i18n.t('setting.hotkey', {
        context: 'playbackPlayPause',
        postProcess: 'sentenceCase',
    }),
    previous: i18n.t('setting.hotkey', {
        context: 'playbackPrevious',
        postProcess: 'sentenceCase',
    }),
    rate0: i18n.t('setting.hotkey', { context: 'rate0', postProcess: 'sentenceCase' }),
    rate1: i18n.t('setting.hotkey', { context: 'rate1', postProcess: 'sentenceCase' }),
    rate2: i18n.t('setting.hotkey', { context: 'rate2', postProcess: 'sentenceCase' }),
    rate3: i18n.t('setting.hotkey', { context: 'rate3', postProcess: 'sentenceCase' }),
    rate4: i18n.t('setting.hotkey', { context: 'rate4', postProcess: 'sentenceCase' }),
    rate5: i18n.t('setting.hotkey', { context: 'rate5', postProcess: 'sentenceCase' }),
    skipBackward: i18n.t('setting.hotkey', {
        context: 'skipBackward',
        postProcess: 'sentenceCase',
    }),
    skipForward: i18n.t('setting.hotkey', { context: 'skipForward', postProcess: 'sentenceCase' }),
    stop: i18n.t('setting.hotkey', { context: 'playbackStop', postProcess: 'sentenceCase' }),
    toggleFullscreenPlayer: i18n.t('setting.hotkey', {
        context: 'toggleFullScreenPlayer',
        postProcess: 'sentenceCase',
    }),
    toggleQueue: i18n.t('setting.hotkey', { context: 'toggleQueue', postProcess: 'sentenceCase' }),
    toggleRepeat: i18n.t('setting.hotkey', {
        context: 'toggleRepeat',
        postProcess: 'sentenceCase',
    }),
    toggleShuffle: i18n.t('setting.hotkey', {
        context: 'toggleShuffle',
        postProcess: 'sentenceCase',
    }),
    volumeDown: i18n.t('setting.hotkey', { context: 'volumeDown', postProcess: 'sentenceCase' }),
    volumeMute: i18n.t('setting.hotkey', { context: 'volumeMute', postProcess: 'sentenceCase' }),
    volumeUp: i18n.t('setting.hotkey', { context: 'volumeUp', postProcess: 'sentenceCase' }),
    zoomIn: i18n.t('setting.hotkey', { context: 'zoomIn', postProcess: 'sentenceCase' }),
    zoomOut: i18n.t('setting.hotkey', { context: 'zoomOut', postProcess: 'sentenceCase' }),
};
export const HotkeyManagerSettings = memo(() => {
    const { t } = useTranslation();
    const { bindings } = useHotkeySettings();
    const { setSettings } = useSettingsStoreActions();
    const [selected, setSelected] = useState(null);
    const keyword = useSettingSearchContext();
    const debouncedSetHotkey = debounce((binding, e) => {
        e.preventDefault();
        const IGNORED_KEYS = ['Control', 'Alt', 'Shift', 'Meta', ' ', 'Escape'];
        const keys = [];
        if (e.ctrlKey)
            keys.push('mod');
        if (e.altKey)
            keys.push('alt');
        if (e.shiftKey)
            keys.push('shift');
        if (e.metaKey)
            keys.push('meta');
        if (e.key === ' ')
            keys.push('space');
        if (!IGNORED_KEYS.includes(e.key)) {
            if (e.code.includes('Numpad')) {
                if (e.key === '+')
                    keys.push('numpadadd');
                else if (e.key === '-')
                    keys.push('numpadsubtract');
                else if (e.key === '*')
                    keys.push('numpadmultiply');
                else if (e.key === '/')
                    keys.push('numpaddivide');
                else if (e.key === '.')
                    keys.push('numpaddecimal');
                else
                    keys.push(`numpad${e.key}`.toLowerCase());
            }
            else if (e.key === '+') {
                keys.push('equal');
            }
            else {
                keys.push(e.key?.toLowerCase());
            }
        }
        const bindingString = keys.join('+');
        const updatedBindings = {
            ...bindings,
            [binding]: { ...bindings[binding], hotkey: bindingString },
        };
        setSettings({
            hotkeys: {
                bindings: updatedBindings,
            },
        });
        ipc?.send('set-global-shortcuts', updatedBindings);
    }, 20);
    const handleSetHotkey = useCallback((binding, e) => {
        debouncedSetHotkey(binding, e);
    }, [debouncedSetHotkey]);
    const handleSetGlobalHotkey = useCallback((binding, e) => {
        const updatedBindings = {
            ...bindings,
            [binding]: { ...bindings[binding], isGlobal: e.currentTarget.checked },
        };
        setSettings({
            hotkeys: {
                bindings: updatedBindings,
            },
        });
        ipc?.send('set-global-shortcuts', updatedBindings);
    }, [bindings, setSettings]);
    const handleClearHotkey = useCallback((binding) => {
        const updatedBindings = {
            ...bindings,
            [binding]: { ...bindings[binding], hotkey: '', isGlobal: false },
        };
        setSettings({
            hotkeys: {
                bindings: updatedBindings,
            },
        });
        ipc?.send('set-global-shortcuts', updatedBindings);
    }, [bindings, setSettings]);
    const duplicateHotkeyMap = useMemo(() => {
        const countPerHotkey = Object.values(bindings).reduce((acc, key) => {
            const hotkey = key.hotkey;
            if (!hotkey)
                return acc;
            if (acc[hotkey]) {
                acc[hotkey] += 1;
            }
            else {
                acc[hotkey] = 1;
            }
            return acc;
        }, {});
        const duplicateKeys = Object.keys(countPerHotkey).filter((key) => countPerHotkey[key] > 1);
        return duplicateKeys;
    }, [bindings]);
    const filteredBindings = useMemo(() => {
        const base = Object.keys(bindings);
        if (keyword === '') {
            return base.filter((binding) => BINDINGS_MAP[binding]);
        }
        return base.filter((binding) => {
            const item = BINDINGS_MAP[binding];
            if (!item)
                return false;
            return item.toLocaleLowerCase().includes(keyword);
        });
    }, [bindings, keyword]);
    const options = [];
    return (_jsx(SettingsSection, { extra: _jsxs(_Fragment, { children: [_jsx(SettingsOptions, { control: _jsx(_Fragment, {}), description: t('setting.applicationHotkeys', {
                        context: 'description',
                        postProcess: 'sentenceCase',
                    }), title: t('setting.applicationHotkeys', { postProcess: 'sentenceCase' }) }), _jsx("div", { className: styles.container, children: _jsx(Table, { withColumnBorders: true, withRowBorders: true, children: _jsx(Table.Tbody, { children: filteredBindings.map((binding) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { style: { userSelect: 'none' }, children: BINDINGS_MAP[binding] }), _jsx(Table.Td, { children: _jsx(TextInput, { id: `hotkey-${binding}`, leftSection: _jsx(Icon, { icon: "keyboard" }), onBlur: () => setSelected(null), onChange: () => { }, onKeyDownCapture: (e) => {
                                                if (selected !== binding)
                                                    return;
                                                handleSetHotkey(binding, e);
                                            }, readOnly: true, rightSection: _jsx(ActionIcon, { icon: "edit", onClick: () => {
                                                    setSelected(binding);
                                                    document
                                                        .getElementById(`hotkey-${binding}`)
                                                        ?.focus();
                                                }, variant: "transparent" }), style: {
                                                opacity: selected === binding
                                                    ? 0.8
                                                    : 1,
                                                outline: duplicateHotkeyMap.includes(bindings[binding].hotkey)
                                                    ? '1px dashed red'
                                                    : undefined,
                                            }, value: bindings[binding]
                                                .hotkey }) }), isElectron() && (_jsx(Table.Td, { children: _jsx(Checkbox, { checked: bindings[binding].isGlobal, disabled: bindings[binding].hotkey === '', onChange: (e) => handleSetGlobalHotkey(binding, e), size: "md", style: {
                                                opacity: bindings[binding].allowGlobal
                                                    ? 1
                                                    : 0,
                                            } }) })), bindings[binding].hotkey && (_jsx(Table.Td, { children: _jsx(ActionIcon, { icon: "x", iconProps: {
                                                color: 'error',
                                            }, onClick: () => handleClearHotkey(binding), variant: "transparent" }) }))] }, `hotkey-${binding}`))) }) }) })] }), options: options }));
});
