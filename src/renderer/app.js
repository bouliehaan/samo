import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* eslint-disable perfectionist/sort-imports */
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import 'overlayscrollbars/overlayscrollbars.css';
import '/styles/overlayscrollbars.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import isElectron from 'is-electron';
import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import i18n from '/@/i18n/i18n';
import { WebAudioContext } from '/@/renderer/features/player/context/webaudio-context';
import { useCheckForUpdates } from '/@/renderer/hooks/use-check-for-updates';
import { useLyricsPrefetch } from '/@/renderer/hooks/use-lyrics-prefetch';
import { useNativeMenuSync } from '/@/renderer/hooks/use-native-menu-sync';
import { useSyncSettingsToMain } from '/@/renderer/hooks/use-sync-settings-to-main';
import { AppRouter } from '/@/renderer/router/app-router';
import { useCssSettings, useHotkeySettings, useLanguage } from '/@/renderer/store';
import { useAppTheme } from '/@/renderer/themes/use-app-theme';
import { sanitizeCss } from '/@/renderer/utils/sanitize';
import '/@/shared/styles/global.css';
import { PlayerProvider } from '/@/renderer/features/player/context/player-context';
import { AudioPlayers } from '/@/renderer/features/player/components/audio-players';
const UpdateAvailableDialog = lazy(() => import('./update-available-dialog').then((module) => ({
    default: module.UpdateAvailableDialog,
})));
const ipc = isElectron() ? window.api.ipc : null;
export const App = () => {
    return _jsx(ThemedApp, {});
};
const ThemedApp = () => {
    const { mode, theme } = useAppTheme();
    return (_jsx(MantineProvider, { forceColorScheme: mode, theme: theme, children: _jsx(AppShell, {}) }));
};
const AppShell = memo(function AppShell() {
    const [webAudio, setWebAudio] = useState();
    const webAudioProvider = useMemo(() => {
        return { setWebAudio, webAudio };
    }, [webAudio]);
    const notificationStyles = useMemo(() => ({
        root: {
            marginBottom: 90,
        },
    }), []);
    return (_jsxs(_Fragment, { children: [_jsx(AppEffects, {}), _jsx(Notifications, { containerWidth: "300px", position: "bottom-center", styles: notificationStyles, transitionDuration: 0, zIndex: 50000 }), _jsx(WebAudioContext.Provider, { value: webAudioProvider, children: _jsxs(PlayerProvider, { children: [_jsx(AudioPlayers, {}), _jsx(AppRouter, {})] }) }), _jsx(Suspense, { fallback: null, children: _jsx(UpdateAvailableDialog, {}) })] }));
});
const AppEffects = () => (_jsxs(_Fragment, { children: [_jsx(SyncSettingsEffect, {}), _jsx(UpdateCheckEffect, {}), _jsx(CssSettingsEffect, {}), _jsx(GlobalShortcutsEffect, {}), _jsx(LanguageEffect, {}), _jsx(NativeMenuSyncEffect, {}), _jsx(LyricsPrefetchEffect, {})] }));
const SyncSettingsEffect = () => {
    useSyncSettingsToMain();
    return null;
};
const UpdateCheckEffect = () => {
    useCheckForUpdates();
    return null;
};
const CssSettingsEffect = () => {
    const { content, enabled } = useCssSettings();
    const cssRef = useRef(null);
    useEffect(() => {
        if (!enabled || !content) {
            if (cssRef.current) {
                cssRef.current.textContent = '';
            }
            return;
        }
        // Yes, CSS is sanitized here as well. Prevent a user from changing the
        // localStorage to bypass sanitizing.
        const sanitized = sanitizeCss(content);
        if (!cssRef.current) {
            cssRef.current = document.createElement('style');
            document.body.appendChild(cssRef.current);
        }
        cssRef.current.textContent = sanitized;
        return () => {
            if (cssRef.current) {
                cssRef.current.textContent = '';
            }
        };
    }, [content, enabled]);
    return null;
};
const GlobalShortcutsEffect = () => {
    const { bindings } = useHotkeySettings();
    useEffect(() => {
        if (isElectron()) {
            ipc?.send('set-global-shortcuts', bindings);
        }
    }, [bindings]);
    return null;
};
const LanguageEffect = () => {
    const language = useLanguage();
    useEffect(() => {
        if (language) {
            i18n.changeLanguage(language);
        }
    }, [language]);
    return null;
};
const NativeMenuSyncEffect = () => {
    useNativeMenuSync();
    return null;
};
const LyricsPrefetchEffect = () => {
    useLyricsPrefetch();
    return null;
};
