import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useButterchurnPresetOptions, useUpdateButterchurn, VisualizerSelect, VisualizerSlider, VisualizerToggle, } from './visualizer-settings-controls';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { MultiSelect } from '/@/shared/components/multi-select/multi-select';
import { Stack } from '/@/shared/components/stack/stack';
const ButterchurnGeneralSettings = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateButterchurn();
    const presetOptions = useButterchurnPresetOptions();
    return (_jsx(Fieldset, { legend: t('visualizer.general'), children: _jsxs(Stack, { children: [_jsx(Group, { grow: true, children: _jsx(VisualizerSelect, { data: presetOptions, label: t('visualizer.selectPreset'), onChange: (value) => {
                            updateProperty('currentPreset', value || undefined);
                        }, value: visualizer.butterchurn.currentPreset }) }), _jsxs(Group, { grow: true, children: [_jsx(VisualizerSlider, { defaultValue: visualizer.butterchurn.blendTime, label: t('visualizer.blendTime'), max: 10, min: 0, onChangeEnd: (e) => updateProperty('blendTime', e), step: 0.1 }), _jsx(VisualizerSlider, { defaultValue: visualizer.butterchurn.maxFPS, label: t('visualizer.maxFPS'), max: 144, min: 0, onChangeEnd: (e) => updateProperty('maxFPS', e), step: 1 }), _jsx(VisualizerSlider, { defaultValue: visualizer.butterchurn.opacity, label: t('visualizer.opacity'), max: 1, min: 0, onChangeEnd: (e) => updateProperty('opacity', e), step: 0.01 })] })] }) }));
};
const ButterChurnCycleSettings = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateButterchurn();
    const presetOptions = useButterchurnPresetOptions();
    return (_jsx(Fieldset, { legend: t('visualizer.cyclePresets'), children: _jsxs(Stack, { children: [_jsxs(Group, { grow: true, children: [_jsx(VisualizerToggle, { label: t('visualizer.cyclePresets'), onChange: (checked) => updateProperty('cyclePresets', checked), value: visualizer.butterchurn.cyclePresets }), _jsx(VisualizerToggle, { disabled: !visualizer.butterchurn.cyclePresets, label: t('visualizer.includeAllPresets'), onChange: (checked) => updateProperty('includeAllPresets', checked), value: visualizer.butterchurn.includeAllPresets }), _jsx(VisualizerToggle, { disabled: !visualizer.butterchurn.cyclePresets, label: t('visualizer.randomizeNextPreset'), onChange: (checked) => updateProperty('randomizeNextPreset', checked), value: visualizer.butterchurn.randomizeNextPreset })] }), _jsx(MultiSelect, { data: presetOptions, disabled: !visualizer.butterchurn.cyclePresets ||
                        visualizer.butterchurn.includeAllPresets, label: t('visualizer.selectedPresets'), onChange: (values) => updateProperty('selectedPresets', values), value: visualizer.butterchurn.selectedPresets }), _jsx(MultiSelect, { data: presetOptions, disabled: !visualizer.butterchurn.cyclePresets, label: t('visualizer.ignoredPresets'), onChange: (values) => updateProperty('ignoredPresets', values), value: visualizer.butterchurn.ignoredPresets }), _jsx(Group, { grow: true, children: _jsx(VisualizerSlider, { defaultValue: visualizer.butterchurn.cycleTime, disabled: !visualizer.butterchurn.cyclePresets, label: t('visualizer.cycleTime'), max: 300, min: 1, onChangeEnd: (e) => updateProperty('cycleTime', e), step: 1 }) })] }) }));
};
export const ButterchurnSettings = () => (_jsxs(_Fragment, { children: [_jsx(ButterchurnGeneralSettings, {}), _jsx(ButterChurnCycleSettings, {})] }));
