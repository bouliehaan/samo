import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { useTranslation } from 'react-i18next';
import { languages } from '/@/i18n/i18n';
import { SettingsSection, } from '/@/renderer/features/settings/components/settings-section';
import { useLyricsDisplaySettings, useLyricsSettings, useSettingsStore, useSettingsStoreActions, } from '/@/renderer/store';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Select } from '/@/shared/components/select/select';
import { Slider } from '/@/shared/components/slider/slider';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
export const LyricsSettingsForm = ({ settingsKey }) => {
    const { t } = useTranslation();
    const lyricsSettings = useLyricsSettings();
    const displaySettings = useLyricsDisplaySettings(settingsKey);
    const allLyricsDisplay = useSettingsStore((state) => state.lyricsDisplay);
    const { setSettings } = useSettingsStoreActions();
    const updateLyricsSetting = (updates) => {
        setSettings({
            lyrics: {
                ...lyricsSettings,
                ...updates,
            },
        });
    };
    const updateDisplaySetting = (updates) => {
        setSettings({
            lyricsDisplay: {
                ...allLyricsDisplay,
                [settingsKey]: {
                    ...displaySettings,
                    ...updates,
                },
            },
        });
    };
    const displayOptions = [
        {
            control: (_jsx(NumberInput, { onBlur: (e) => {
                    const value = Number(e.currentTarget.value);
                    updateDisplaySetting({ fontSize: value });
                }, rightSection: _jsx(Text, { pr: "md", size: "sm", children: "px" }), step: 1, value: displaySettings.fontSize, width: 100 })),
            description: '',
            title: t(`${t('page.fullscreenPlayer.config.lyricSize')} (${t('page.fullscreenPlayer.config.synchronized')})`, { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(NumberInput, { onBlur: (e) => {
                    const value = Number(e.currentTarget.value);
                    updateDisplaySetting({ fontSizeUnsync: value });
                }, rightSection: _jsx(Text, { pr: "md", size: "sm", children: "px" }), step: 1, value: displaySettings.fontSizeUnsync, width: 100 })),
            description: '',
            title: t(`${t('page.fullscreenPlayer.config.lyricSize')} (${t('page.fullscreenPlayer.config.unsynchronized')})`, { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(NumberInput, { onBlur: (e) => {
                    const value = Number(e.currentTarget.value);
                    updateDisplaySetting({ gap: value });
                }, rightSection: _jsx(Text, { pr: "md", size: "sm", children: "px" }), step: 1, value: displaySettings.gap, width: 100 })),
            description: '',
            title: t(`${t('page.fullscreenPlayer.config.lyricGap')} (${t('page.fullscreenPlayer.config.synchronized')})`, { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(NumberInput, { onBlur: (e) => {
                    const value = Number(e.currentTarget.value);
                    updateDisplaySetting({ gapUnsync: value });
                }, rightSection: _jsx(Text, { pr: "md", size: "sm", children: "px" }), step: 1, value: displaySettings.gapUnsync, width: 100 })),
            description: '',
            title: t(`${t('page.fullscreenPlayer.config.lyricGap')} (${t('page.fullscreenPlayer.config.unsynchronized')})`, { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(SegmentedControl, { data: [
                    { label: t('common.left', { postProcess: 'titleCase' }), value: 'left' },
                    {
                        label: t('common.center', { postProcess: 'titleCase' }),
                        value: 'center',
                    },
                    { label: t('common.right', { postProcess: 'titleCase' }), value: 'right' },
                ], onChange: (value) => updateLyricsSetting({ alignment: value }), value: lyricsSettings.alignment })),
            description: '',
            title: t('page.fullscreenPlayer.config.lyricAlignment', {
                postProcess: 'sentenceCase',
            }),
        },
        {
            control: (_jsx(Switch, { "aria-label": "Follow lyrics", defaultChecked: lyricsSettings.follow, onChange: (e) => updateLyricsSetting({ follow: e.currentTarget.checked }) })),
            description: '',
            title: t('page.fullscreenPlayer.config.followCurrentLyric', {
                postProcess: 'sentenceCase',
            }),
        },
        {
            control: (_jsx(Slider, { defaultValue: displaySettings.opacityNonActive, label: (e) => (e * 100).toFixed(0) + '%', max: 1.0, min: 0.0, onChangeEnd: (e) => {
                    updateDisplaySetting({
                        opacityNonActive: e,
                    });
                }, step: 0.01, w: 100 })),
            description: '',
            title: t(`${t('page.fullscreenPlayer.config.lyricOpacityNonActive')}`, {
                postProcess: 'sentenceCase',
            }),
        },
        {
            control: (_jsx(Slider, { defaultValue: displaySettings.scaleNonActive, label: (e) => (e * 100).toFixed(0) + '%', max: 1.0, min: 0.5, onChangeEnd: (e) => {
                    updateDisplaySetting({
                        scaleNonActive: e,
                    });
                }, step: 0.01, w: 100 })),
            description: '',
            title: t(`${t('page.fullscreenPlayer.config.lyricScaleNonActive')}`, {
                postProcess: 'sentenceCase',
            }),
        },
    ];
    const lyricOptions = [
        {
            control: (_jsx(Switch, { "aria-label": "Prefer local lyrics", defaultChecked: lyricsSettings.preferLocalLyrics, onChange: (e) => updateLyricsSetting({ preferLocalLyrics: e.currentTarget.checked }) })),
            description: t('setting.preferLocalLyrics', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.preferLocalLyrics', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(Switch, { "aria-label": "Enable fetching lyrics", defaultChecked: lyricsSettings.fetch, onChange: (e) => updateLyricsSetting({ fetch: e.currentTarget.checked }) })),
            description: t('setting.lyricFetch', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.lyricFetch', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(NumberInput, { defaultValue: lyricsSettings.delayMs, onBlur: (e) => {
                    const value = Number(e.currentTarget.value);
                    updateLyricsSetting({ delayMs: value });
                }, step: 10, width: 100 })),
            description: t('setting.lyricOffset', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.lyricOffset', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(Select, { data: languages, onChange: (value) => {
                    updateLyricsSetting({ translationTargetLanguage: value });
                }, value: lyricsSettings.translationTargetLanguage })),
            description: t('setting.translationTargetLanguage', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.translationTargetLanguage', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(Select, { clearable: true, data: ['Microsoft Azure', 'Google Cloud'], onChange: (value) => {
                    updateLyricsSetting({ translationApiProvider: value });
                }, value: lyricsSettings.translationApiProvider })),
            description: t('setting.translationApiProvider', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.translationApiProvider', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(TextInput, { onChange: (e) => {
                    updateLyricsSetting({ translationApiKey: e.currentTarget.value });
                }, value: lyricsSettings.translationApiKey })),
            description: t('setting.translationApiKey', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.translationApiKey', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(Switch, { "aria-label": "Enable auto translation", defaultChecked: lyricsSettings.enableAutoTranslation, onChange: (e) => updateLyricsSetting({ enableAutoTranslation: e.currentTarget.checked }) })),
            description: t('setting.enableAutoTranslation', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.enableAutoTranslation', { postProcess: 'sentenceCase' }),
        },
    ];
    return (_jsxs(Stack, { gap: "md", p: "md", children: [_jsx(Fieldset, { legend: t('page.setting.lyricsDisplay', { postProcess: 'sentenceCase' }), children: _jsx(SettingsSection, { options: displayOptions }) }), _jsx(Fieldset, { legend: t('page.setting.lyrics', { postProcess: 'sentenceCase' }), children: _jsx(SettingsSection, { options: lyricOptions }) })] }));
};
