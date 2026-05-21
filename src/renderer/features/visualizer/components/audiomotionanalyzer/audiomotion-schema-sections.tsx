import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
    fftSizeOptions,
    frequencyScaleOptions,
    maxFreqOptions,
    minFreqOptions,
    weightingFilterOptions,
} from './visualizer-settings-options';
import {
    useUpdateAudioMotionAnalyzer,
    VisualizerSelect,
    VisualizerSlider,
    VisualizerToggle,
} from './visualizer-settings-controls';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';

type AudioMotionSettings = ReturnType<
    typeof useUpdateAudioMotionAnalyzer
>['visualizer']['audiomotionanalyzer'];

type UpdateProperty = <K extends keyof AudioMotionSettings>(
    property: K,
    value: AudioMotionSettings[K],
) => void;

type SelectField = {
    disabled?: (settings: AudioMotionSettings) => boolean;
    key: keyof AudioMotionSettings;
    kind: 'select';
    labelKey: string;
    options: { label: string; value: string }[];
    parse: (value: string) => AudioMotionSettings[keyof AudioMotionSettings];
};

type SliderField = {
    disabled?: (settings: AudioMotionSettings) => boolean;
    key: keyof AudioMotionSettings;
    kind: 'slider';
    labelKey: string;
    max: number;
    min: number;
    step?: number;
};

type ToggleField = {
    disabled?: (settings: AudioMotionSettings) => boolean;
    key: keyof AudioMotionSettings;
    kind: 'toggle';
    labelKey: string;
};

type ToggleRowField = {
    disabled?: (settings: AudioMotionSettings, toggleKey: string) => boolean;
    kind: 'toggle-row';
    toggles: { key: keyof AudioMotionSettings; labelKey: string }[];
};

type SchemaField = SelectField | SliderField | ToggleField | ToggleRowField;

type SchemaSection = {
    fields: SchemaField[];
    grow?: boolean;
    legendKey: string;
};

const fftSection: SchemaSection = {
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

const frequencySection: SchemaSection = {
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
            parse: (value) => value as AudioMotionSettings['frequencyScale'],
        },
    ],
};

const sensitivitySection: SchemaSection = {
    legendKey: 'visualizer.sensitivity',
    fields: [
        {
            kind: 'select',
            key: 'weightingFilter',
            labelKey: 'visualizer.weightingFilter',
            options: weightingFilterOptions,
            parse: (value) => value as AudioMotionSettings['weightingFilter'],
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

const linearAmplitudeSection: SchemaSection = {
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

const reflexMirrorSection: SchemaSection = {
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

const radialSection: SchemaSection = {
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

const peakSection: SchemaSection = {
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

const toggleSection: SchemaSection = {
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
                if (radialBlocked.includes(key) && settings.radial) return true;
                if (key === 'noteLabels') return !settings.showScaleX;
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

const SchemaSectionView = ({
    section,
    settings,
    updateProperty,
}: {
    section: SchemaSection;
    settings: AudioMotionSettings;
    updateProperty: UpdateProperty;
}) => {
    const { t } = useTranslation();

    const renderField = (field: SchemaField) => {
        if (field.kind === 'toggle-row') {
            return field.toggles.map((toggle) => (
                <VisualizerToggle
                    disabled={field.disabled?.(settings, String(toggle.key))}
                    key={String(toggle.key)}
                    label={t(toggle.labelKey)}
                    onChange={(value) => updateProperty(toggle.key, value)}
                    value={settings[toggle.key] as boolean}
                />
            ));
        }

        if (field.kind === 'toggle') {
            return (
                <VisualizerToggle
                    disabled={field.disabled?.(settings)}
                    key={String(field.key)}
                    label={t(field.labelKey)}
                    onChange={(value) => updateProperty(field.key, value)}
                    value={settings[field.key] as boolean}
                />
            );
        }

        if (field.kind === 'select') {
            return (
                <VisualizerSelect
                    data={field.options}
                    defaultValue={String(settings[field.key])}
                    disabled={field.disabled?.(settings)}
                    key={String(field.key)}
                    label={t(field.labelKey)}
                    onChange={(value) =>
                        updateProperty(field.key, field.parse(value ?? '') as AudioMotionSettings[typeof field.key])
                    }
                />
            );
        }

        return (
            <VisualizerSlider
                defaultValue={settings[field.key] as number}
                disabled={field.disabled?.(settings)}
                key={String(field.key)}
                label={t(field.labelKey)}
                max={field.max}
                min={field.min}
                onChangeEnd={(value) => updateProperty(field.key, value as AudioMotionSettings[typeof field.key])}
                step={field.step}
            />
        );
    };

    const toggleRows = section.fields.filter((f): f is ToggleRowField => f.kind === 'toggle-row');
    const otherFields = section.fields.filter((f) => f.kind !== 'toggle-row');

    return (
        <Fieldset legend={t(section.legendKey)}>
            {toggleRows.length > 0 && otherFields.length > 0 ? (
                <Stack>
                    {toggleRows.map((field, index) => (
                        <Group grow key={`toggle-row-${index}`}>
                            {renderField(field)}
                        </Group>
                    ))}
                    <Group grow>{otherFields.map(renderField)}</Group>
                </Stack>
            ) : toggleRows.length > 0 ? (
                <Group>{toggleRows.flatMap((field) => renderField(field))}</Group>
            ) : (
                <Group grow={section.grow !== false}>{otherFields.map(renderField)}</Group>
            )}
        </Fieldset>
    );
};

export const AudiomotionSchemaSections = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateAudioMotionAnalyzer();
    const settings = visualizer.audiomotionanalyzer;

    const translatedFrequencyScaleOptions = useMemo(
        () =>
            frequencyScaleOptions.map((option) => ({
                label: t(`visualizer.options.frequencyScale.${option.value}`),
                value: option.value,
            })),
        [t],
    );

    const translatedWeightingFilterOptions = useMemo(
        () =>
            weightingFilterOptions.map((option) => ({
                label: t(
                    `visualizer.options.weightingFilter.${option.value === '' ? 'none' : option.value.toLowerCase()}`,
                ),
                value: option.value,
            })),
        [t],
    );

    const sections = useMemo(
        () =>
            SCHEMA_SECTIONS.map((section) => {
                if (section.legendKey === 'visualizer.frequencyRangeAndScaling') {
                    return {
                        ...section,
                        fields: section.fields.map((field) =>
                            field.kind === 'select' && field.key === 'frequencyScale'
                                ? { ...field, options: translatedFrequencyScaleOptions }
                                : field,
                        ),
                    };
                }
                if (section.legendKey === 'visualizer.sensitivity') {
                    return {
                        ...section,
                        fields: section.fields.map((field) =>
                            field.kind === 'select' && field.key === 'weightingFilter'
                                ? { ...field, options: translatedWeightingFilterOptions }
                                : field,
                        ),
                    };
                }
                return section;
            }),
        [translatedFrequencyScaleOptions, translatedWeightingFilterOptions],
    );

    return (
        <>
            {sections.map((section) => (
                <SchemaSectionView
                    key={section.legendKey}
                    section={section}
                    settings={settings}
                    updateProperty={updateProperty}
                />
            ))}
        </>
    );
};
