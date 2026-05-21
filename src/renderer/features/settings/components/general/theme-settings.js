import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '/@/i18n/i18n';
import { SettingsSection, } from '/@/renderer/features/settings/components/settings-section';
import { useGeneralSettings, useSettingsStoreActions } from '/@/renderer/store/settings.store';
import { THEME_DATA } from '/@/renderer/themes/use-app-theme';
import { ColorInput } from '/@/shared/components/color-input/color-input';
import { Group } from '/@/shared/components/group/group';
import { Select } from '/@/shared/components/select/select';
import { Slider } from '/@/shared/components/slider/slider';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { getAppTheme } from '/@/shared/themes/app-theme';
const localSettings = isElectron() ? window.api.localSettings : null;
const getThemeSwatchColors = (theme) => {
    const themeConfig = getAppTheme(theme);
    return {
        background: themeConfig.colors?.background || 'rgb(0, 0, 0)',
        foreground: themeConfig.colors?.foreground || 'rgb(255, 255, 255)',
        primary: themeConfig.colors?.primary ||
            themeConfig.colors?.['state-info'] ||
            'rgb(53, 116, 252)',
        surface: themeConfig.colors?.surface || themeConfig.colors?.background || 'rgb(0, 0, 0)',
    };
};
const getGroupedThemeData = () => {
    const darkThemes = THEME_DATA.filter((theme) => theme.type === 'dark').sort((a, b) => a.label.localeCompare(b.label));
    const lightThemes = THEME_DATA.filter((theme) => theme.type === 'light').sort((a, b) => a.label.localeCompare(b.label));
    return [
        {
            group: i18n.t('setting.themeDark', { postProcess: 'sentenceCase' }),
            items: darkThemes,
        },
        {
            group: i18n.t('setting.themeLight', { postProcess: 'sentenceCase' }),
            items: lightThemes,
        },
    ];
};
const ColorSwatch = ({ color }) => {
    return (_jsx("div", { style: {
            backgroundColor: color,
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '3px',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05)',
            height: '14px',
            width: '14px',
        } }));
};
const renderThemeOption = ({ option }) => {
    const themeValue = option.value;
    const colors = getThemeSwatchColors(themeValue);
    return (_jsxs(Group, { gap: "sm", style: { alignItems: 'center', flex: 1 }, children: [_jsxs(Group, { gap: 4, style: { alignItems: 'center', flexShrink: 0 }, children: [_jsx(ColorSwatch, { color: String(colors.background) }), _jsx(ColorSwatch, { color: String(colors.surface) }), _jsx(ColorSwatch, { color: String(colors.foreground) }), _jsx(ColorSwatch, { color: String(colors.primary) })] }), _jsx("span", { style: { flex: 1 }, children: option.label })] }));
};
export const ThemeSettings = memo(() => {
    const { t } = useTranslation();
    const settings = useGeneralSettings();
    const { setSettings } = useSettingsStoreActions();
    const groupedThemeData = useMemo(() => getGroupedThemeData(), []);
    const themeOptions = [
        {
            control: (_jsx(Switch, { defaultChecked: settings.followSystemTheme, onChange: (e) => {
                    setSettings({
                        general: {
                            followSystemTheme: e.currentTarget.checked,
                        },
                    });
                    if (localSettings) {
                        localSettings.themeSet(e.currentTarget.checked
                            ? 'system'
                            : (getAppTheme(settings.theme).mode ?? 'dark'));
                    }
                } })),
            description: t('setting.useSystemTheme', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: false,
            title: t('setting.useSystemTheme', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(Select, { data: groupedThemeData, defaultValue: settings.themeDark, onChange: (e) => {
                    setSettings({
                        general: {
                            themeDark: e,
                        },
                    });
                }, renderOption: renderThemeOption, width: 240 })),
            description: t('setting.themeDark', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !settings.followSystemTheme,
            title: t('setting.themeDark', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(Select, { data: groupedThemeData, defaultValue: settings.themeLight, onChange: (e) => {
                    setSettings({
                        general: {
                            themeLight: e,
                        },
                    });
                }, renderOption: renderThemeOption, width: 240 })),
            description: t('setting.themeLight', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !settings.followSystemTheme,
            title: t('setting.themeLight', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(Stack, { align: "center", children: _jsx(ColorInput, { defaultValue: settings.accent, format: "rgb", onChangeEnd: (e) => {
                        setSettings({
                            general: {
                                accent: e,
                            },
                        });
                    }, swatches: [
                        'rgb(53, 116, 252)',
                        'rgb(240, 170, 22)',
                        'rgb(29, 185, 84)',
                        'rgb(214, 81, 63)',
                        'rgb(170, 110, 216)',
                    ], swatchesPerRow: 5, withEyeDropper: false }) })),
            description: t('setting.accentColor', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            title: t('setting.accentColor', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(Slider, { defaultValue: settings.primaryShade, label: (value) => value, max: 9, min: 0, onChangeEnd: (value) => {
                    setSettings({
                        general: {
                            primaryShade: value,
                        },
                    });
                }, step: 1, w: 120 })),
            description: t('setting.primaryShade', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            title: t('setting.primaryShade', { postProcess: 'sentenceCase' }),
        },
    ];
    return (_jsx(SettingsSection, { options: themeOptions, title: t('page.setting.theme', { postProcess: 'sentenceCase' }) }));
});
