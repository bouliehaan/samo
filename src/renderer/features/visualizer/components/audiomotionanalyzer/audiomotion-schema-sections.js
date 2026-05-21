import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fftSizeOptions, frequencyScaleOptions, maxFreqOptions, minFreqOptions, weightingFilterOptions, } from './visualizer-settings-options';
import { useUpdateAudioMotionAnalyzer, VisualizerSelect, VisualizerSlider, VisualizerToggle, } from './visualizer-settings-controls';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
const fftSection = {
    legendKey: 'visualizer.fft',
    fields: [
        {
            kind: 'select',
            key: 'fftSize',
            labelKey: 'visualizer.fftSize',
            options: fftSizeOptions,
            parse: (value) => Number(value),
        },
        {
            kind: 'slider',
            key: 'smoothing',
            labelKey: 'visualizer.smoothing',
            min: 0,
            max: 1,
            step: 0.1,
        },
    ],
};
const frequencySection = {
    legendKey: 'visualizer.frequencyRangeAndScaling',
    fields: [
        {
            kind: 'select',
            key: 'minFreq',
            labelKey: 'visualizer.minimumFrequency',
            options: minFreqOptions,
            parse: (value) => Number(value),
        },
        {
            kind: 'select',
            key: 'maxFreq',
            labelKey: 'visualizer.maximumFrequency',
            options: maxFreqOptions,
            parse: (value) => Number(value),
        },
        {
            kind: 'select',
            key: 'frequencyScale',
            labelKey: 'visualizer.frequencyScale',
            options: frequencyScaleOptions,
            parse: (value) => value,
        },
    ],
};
const sensitivitySection = {
    legendKey: 'visualizer.sensitivity',
    fields: [
        {
            kind: 'select',
            key: 'weightingFilter',
            labelKey: 'visualizer.weightingFilter',
            options: weightingFilterOptions,
            parse: (value) => value,
        },
        {
            kind: 'slider',
            key: 'minDecibels',
            labelKey: 'visualizer.minDecibels',
            min: -120,
            max: 0,
        },
        {
            kind: 'slider',
            key: 'maxDecibels',
            labelKey: 'visualizer.maxDecibels',
            min: -120,
            max: 0,
        },
    ],
};
const linearAmplitudeSection = {
    legendKey: 'visualizer.linearAmplitude',
    fields: [
        {
            kind: 'toggle',
            key: 'linearAmplitude',
            labelKey: 'visualizer.linearAmplitude',
        },
        {
            kind: 'slider',
            key: 'linearBoost',
            labelKey: 'visualizer.linearBoost',
            min: 1,
            max: 4,
            step: 0.1,
            disabled: (settings) => !settings.linearAmplitude,
        },
    ],
};
const reflexMirrorSection = {
    legendKey: 'visualizer.reflexMirror',
    fields: [
        { kind: 'toggle', key: 'reflexFit', labelKey: 'visualizer.reflexFit' },
        {
            kind: 'slider',
            key: 'reflexRatio',
            labelKey: 'visualizer.reflexRatio',
            min: 0,
            max: 1,
            step: 0.1,
        },
        {
            kind: 'slider',
            key: 'reflexAlpha',
            labelKey: 'visualizer.reflexAlpha',
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            kind: 'slider',
            key: 'reflexBright',
            labelKey: 'visualizer.reflexBrightness',
            min: 0,
            max: 2,
            step: 0.1,
        },
        {
            kind: 'slider',
            key: 'mirror',
            labelKey: 'visualizer.mirror',
            min: -1,
            max: 1,
            step: 1,
        },
    ],
};
const radialSection = {
    legendKey: 'visualizer.radialSpectrum',
    fields: [
        { kind: 'toggle', key: 'radial', labelKey: 'visualizer.radial' },
        {
            kind: 'toggle',
            key: 'radialInvert',
            labelKey: 'visualizer.radialInvert',
            disabled: (settings) => !settings.radial,
        },
        {
            kind: 'slider',
            key: 'radius',
            labelKey: 'visualizer.radius',
            min: 0,
            max: 1,
            step: 0.05,
            disabled: (settings) => !settings.radial,
        },
        {
            kind: 'slider',
            key: 'spinSpeed',
            labelKey: 'visualizer.spinSpeed',
            min: -5,
            max: 5,
            step: 0.1,
            disabled: (settings) => !settings.radial,
        },
    ],
};
const peakSection = {
    legendKey: 'visualizer.peakBehavior',
    fields: [
        {
            kind: 'toggle-row',
            toggles: [
                { key: 'showPeaks', labelKey: 'visualizer.showPeaks' },
                { key: 'fadePeaks', labelKey: 'visualizer.fadePeaks' },
                { key: 'peakLine', labelKey: 'visualizer.peakLine' },
            ],
            disabled: (settings, key) => {
                if (key === 'fadePeaks' || key === 'peakLine') {
                    return !settings.showPeaks;
                }
                return false;
            },
        },
        {
            kind: 'slider',
            key: 'gravity',
            labelKey: 'visualizer.gravity',
            min: 0.1,
            max: 20,
            disabled: (settings) => !settings.showPeaks,
        },
        {
            kind: 'slider',
            key: 'peakFadeTime',
            labelKey: 'visualizer.peakFadeTime',
            min: 0,
            max: 2000,
            step: 1,
            disabled: (settings) => !settings.showPeaks || !settings.fadePeaks,
        },
        {
            kind: 'slider',
            key: 'peakHoldTime',
            labelKey: 'visualizer.peakHoldTime',
            min: 0,
            max: 1000,
            step: 1,
            disabled: (settings) => !settings.showPeaks,
        },
    ],
};
const toggleSection = {
    legendKey: 'visualizer.miscellaneousSettings',
    fields: [
        {
            kind: 'toggle-row',
            toggles: [
                { key: 'alphaBars', labelKey: 'visualizer.alphaBars' },
                { key: 'ansiBands', labelKey: 'visualizer.ansiBands' },
                { key: 'ledBars', labelKey: 'visualizer.ledBars' },
                { key: 'trueLeds', labelKey: 'visualizer.trueLeds' },
                { key: 'lumiBars', labelKey: 'visualizer.lumiBars' },
                { key: 'outlineBars', labelKey: 'visualizer.outlineBars' },
                { key: 'roundBars', labelKey: 'visualizer.roundBars' },
                { key: 'loRes', labelKey: 'visualizer.lowResolution' },
                { key: 'splitGradient', labelKey: 'visualizer.splitGradient' },
                { key: 'showFPS', labelKey: 'visualizer.showFPS' },
                { key: 'showScaleX', labelKey: 'visualizer.showScaleX' },
                { key: 'noteLabels', labelKey: 'visualizer.noteLabels' },
                { key: 'showScaleY', labelKey: 'visualizer.showScaleY' },
            ],
            disabled: (settings, key) => {
                const radialBlocked = [
                    'ledBars',
                    'trueLeds',
                    'lumiBars',
                    'outlineBars',
                    'roundBars',
                    'loRes',
                    'splitGradient',
                    'showFPS',
                ];
                if (radialBlocked.includes(key) && settings.radial)
                    return true;
                if (key === 'noteLabels')
                    return !settings.showScaleX;
                return false;
            },
        },
    ],
};
const SCHEMA_SECTIONS = [
    fftSection,
    frequencySection,
    sensitivitySection,
    linearAmplitudeSection,
    peakSection,
    radialSection,
    reflexMirrorSection,
    toggleSection,
];
const SchemaSectionView = ({ section, settings, updateProperty, }) => {
    const { t } = useTranslation();
    const renderField = (field) => {
        if (field.kind === 'toggle-row') {
            return field.toggles.map((toggle) => (_jsx(VisualizerToggle, { disabled: field.disabled?.(settings, String(toggle.key)), label: t(toggle.labelKey), onChange: (value) => updateProperty(toggle.key, value), value: settings[toggle.key] }, String(toggle.key))));
        }
        if (field.kind === 'toggle') {
            return (_jsx(VisualizerToggle, { disabled: field.disabled?.(settings), label: t(field.labelKey), onChange: (value) => updateProperty(field.key, value), value: settings[field.key] }, String(field.key)));
        }
        if (field.kind === 'select') {
            return (_jsx(VisualizerSelect, { data: field.options, defaultValue: String(settings[field.key]), disabled: field.disabled?.(settings), label: t(field.labelKey), onChange: (value) => updateProperty(field.key, field.parse(value ?? '')) }, String(field.key)));
        }
        return (_jsx(VisualizerSlider, { defaultValue: settings[field.key], disabled: field.disabled?.(settings), label: t(field.labelKey), max: field.max, min: field.min, onChangeEnd: (value) => updateProperty(field.key, value), step: field.step }, String(field.key)));
    };
    const toggleRows = section.fields.filter((f) => f.kind === 'toggle-row');
    const otherFields = section.fields.filter((f) => f.kind !== 'toggle-row');
    return (_jsx(Fieldset, { legend: t(section.legendKey), children: toggleRows.length > 0 && otherFields.length > 0 ? (_jsxs(Stack, { children: [toggleRows.map((field, index) => (_jsx(Group, { grow: true, children: renderField(field) }, `toggle-row-${index}`))), _jsx(Group, { grow: true, children: otherFields.map(renderField) })] })) : toggleRows.length > 0 ? (_jsx(Group, { children: toggleRows.flatMap((field) => renderField(field)) })) : (_jsx(Group, { grow: section.grow !== false, children: otherFields.map(renderField) })) }));
};
export const AudiomotionSchemaSections = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateAudioMotionAnalyzer();
    const settings = visualizer.audiomotionanalyzer;
    const translatedFrequencyScaleOptions = useMemo(() => frequencyScaleOptions.map((option) => ({
        label: t(`visualizer.options.frequencyScale.${option.value}`),
        value: option.value,
    })), [t]);
    const translatedWeightingFilterOptions = useMemo(() => weightingFilterOptions.map((option) => ({
        label: t(`visualizer.options.weightingFilter.${option.value === '' ? 'none' : option.value.toLowerCase()}`),
        value: option.value,
    })), [t]);
    const sections = useMemo(() => SCHEMA_SECTIONS.map((section) => {
        if (section.legendKey === 'visualizer.frequencyRangeAndScaling') {
            return {
                ...section,
                fields: section.fields.map((field) => field.kind === 'select' && field.key === 'frequencyScale'
                    ? { ...field, options: translatedFrequencyScaleOptions }
                    : field),
            };
        }
        if (section.legendKey === 'visualizer.sensitivity') {
            return {
                ...section,
                fields: section.fields.map((field) => field.kind === 'select' && field.key === 'weightingFilter'
                    ? { ...field, options: translatedWeightingFilterOptions }
                    : field),
            };
        }
        return section;
    }), [translatedFrequencyScaleOptions, translatedWeightingFilterOptions]);
    return (_jsx(_Fragment, { children: sections.map((section) => (_jsx(SchemaSectionView, { section: section, settings: settings, updateProperty: updateProperty }, section.legendKey))) }));
};
