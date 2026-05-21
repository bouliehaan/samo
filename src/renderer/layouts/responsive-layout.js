import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { CommandPalette } from '/@/renderer/features/search/components/command-palette';
import { useGarbageCollection } from '/@/renderer/hooks/use-garbage-collection';
import { useIsMobile } from '/@/renderer/hooks/use-is-mobile';
import { DefaultLayout } from '/@/renderer/layouts/default-layout';
import { MobileLayout } from '/@/renderer/layouts/mobile-layout/mobile-layout';
import { AppRoute } from '/@/renderer/router/routes';
import { useCommandPaletteState, useLayoutHotkeyBindings, useSettingsStoreActions, useZoomFactor, } from '/@/renderer/store';
import { useHotkeys } from '/@/shared/hooks/use-hotkeys';
const ResponsiveLayoutBase = ({ shell }) => {
    const isMobile = useIsMobile();
    if (isMobile) {
        return _jsx(MobileLayout, { shell: shell });
    }
    return _jsx(DefaultLayout, { shell: shell });
};
export const ResponsiveLayout = ({ shell }) => {
    return (_jsxs(_Fragment, { children: [_jsx(ResponsiveLayoutBase, { shell: shell }), _jsx(LayoutHotkeys, {}), _jsx(GarbageCollection, {})] }));
};
const localSettings = isElectron() ? window.api.localSettings : null;
const LayoutHotkeys = () => {
    const navigate = useNavigate();
    const zoomFactor = useZoomFactor();
    const { setSettings } = useSettingsStoreActions();
    const bindings = useLayoutHotkeyBindings();
    const { close, open, opened, toggle } = useCommandPaletteState();
    const handlers = useMemo(() => ({
        close,
        open,
        toggle,
    }), [close, open, toggle]);
    const updateZoom = useCallback((increase) => {
        const newVal = zoomFactor + increase;
        if (newVal > 300 || newVal < 50 || !localSettings)
            return;
        setSettings({
            general: {
                zoomFactor: newVal,
            },
        });
        localSettings?.setZoomFactor(newVal);
    }, [setSettings, zoomFactor]);
    useEffect(() => {
        if (localSettings) {
            localSettings?.setZoomFactor(zoomFactor);
        }
    }, [zoomFactor]);
    const hotkeys = useMemo(() => [
        [bindings.globalSearch.hotkey, open],
        [bindings.browserBack.hotkey, () => navigate(-1)],
        [bindings.browserForward.hotkey, () => navigate(1)],
        [bindings.navigateHome.hotkey, () => navigate(AppRoute.HOME)],
        ...(localSettings
            ? [
                [bindings.zoomIn.hotkey, () => updateZoom(5)],
                [bindings.zoomOut.hotkey, () => updateZoom(-5)],
            ]
            : []),
    ], [bindings, navigate, open, updateZoom]);
    const modalProps = useMemo(() => ({
        handlers,
        opened,
    }), [handlers, opened]);
    useHotkeys(hotkeys);
    return _jsx(CommandPalette, { modalProps: modalProps });
};
const GarbageCollection = () => {
    useGarbageCollection();
    return null;
};
