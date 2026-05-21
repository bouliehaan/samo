import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import styles from './visualizer-settings-form.module.css';
import { useTranslation } from 'react-i18next';
import { useSettingsStoreActions, useVisualizerSettings } from '/@/renderer/store/settings.store';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { AudiomotionColorSettings } from './audiomotion-color-settings';
import { AudiomotionGeneralSettings } from './audiomotion-general-settings';
import { AudiomotionSchemaSections } from './audiomotion-schema-sections';
import { ButterchurnSettings } from './butterchurn-settings';
import { PresetSettings } from './preset-settings';
const VISUALIZER_TYPE_OPTIONS = [
    { label: 'AudioMotion Analyzer', value: 'audiomotionanalyzer' },
    { label: 'Butterchurn', value: 'butterchurn' },
];
export const VisualizerSettingsForm = () => {
    const { t } = useTranslation();
    const visualizer = useVisualizerSettings();
    const { setSettings } = useSettingsStoreActions();
    const handleTypeChange = (value) => {
        setSettings({ visualizer: { type: value } });
    };
    return (_jsxs("div", { className: styles.container, children: [_jsx(Fieldset, { legend: t('visualizer.visualizerType'), children: _jsx(Stack, { children: _jsx(SegmentedControl, { data: [...VISUALIZER_TYPE_OPTIONS], onChange: handleTypeChange, value: visualizer.type }) }) }), visualizer.type === 'audiomotionanalyzer' && (_jsxs(_Fragment, { children: [_jsx(PresetSettings, {}), _jsx(AudiomotionGeneralSettings, {}), _jsx(AudiomotionColorSettings, {}), _jsx(AudiomotionSchemaSections, {})] })), visualizer.type === 'butterchurn' && _jsx(ButterchurnSettings, {})] }));
};
