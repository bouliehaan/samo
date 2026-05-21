import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { useSettingsStore, useSettingsStoreActions } from '/@/renderer/store/settings.store';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Tabs } from '/@/shared/components/tabs/tabs';
const GeneralTab = lazy(() => import('/@/renderer/features/settings/components/general/general-tab').then((module) => ({
    default: module.GeneralTab,
})));
const PlaybackTab = lazy(() => import('/@/renderer/features/settings/components/playback/playback-tab').then((module) => ({
    default: module.PlaybackTab,
})));
const HotkeysTab = lazy(() => import('/@/renderer/features/settings/components/hotkeys/hotkeys-tab').then((module) => ({
    default: module.HotkeysTab,
})));
const WindowTab = lazy(() => import('/@/renderer/features/settings/components/window/window-tab').then((module) => ({
    default: module.WindowTab,
})));
const AdvancedTab = lazy(() => import('/@/renderer/features/settings/components/advanced/advanced-tab').then((module) => ({
    default: module.AdvancedTab,
})));
export const SettingsContent = () => {
    const { t } = useTranslation();
    const currentTab = useSettingsStore((state) => state.tab);
    const { setSettings } = useSettingsStoreActions();
    return (_jsx(LibraryContainer, { children: _jsx("div", { style: { height: '100%', overflow: 'scroll', padding: '1rem', width: '100%' }, children: _jsxs(Tabs, { keepMounted: false, onChange: (e) => e && setSettings({ tab: e }), orientation: "horizontal", value: currentTab, variant: "default", children: [_jsxs(Tabs.List, { children: [_jsx(Tabs.Tab, { value: "general", children: t('page.setting.generalTab', { postProcess: 'sentenceCase' }) }), _jsx(Tabs.Tab, { value: "playback", children: "Audio" }), _jsx(Tabs.Tab, { value: "hotkeys", children: t('page.setting.hotkeysTab', { postProcess: 'sentenceCase' }) }), isElectron() && _jsx(Tabs.Tab, { value: "window", children: "Application" }), _jsx(Tabs.Tab, { value: "advanced", children: t('page.setting.advanced', { postProcess: 'sentenceCase' }) })] }), _jsx(Tabs.Panel, { value: "general", children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(GeneralTab, {}) }) }), _jsx(Tabs.Panel, { value: "playback", children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(PlaybackTab, {}) }) }), _jsx(Tabs.Panel, { value: "hotkeys", children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(HotkeysTab, {}) }) }), isElectron() && (_jsx(Tabs.Panel, { value: "window", children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(WindowTab, {}) }) })), _jsx(Tabs.Panel, { value: "advanced", children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(AdvancedTab, {}) }) })] }) }) }));
};
