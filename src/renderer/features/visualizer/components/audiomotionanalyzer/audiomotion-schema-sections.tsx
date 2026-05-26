import { useTranslation } from 'react-i18next';

import {
    useUpdateAudioMotionAnalyzer,
    VisualizerSelect,
    VisualizerSlider,
    VisualizerToggle,
} from './visualizer-settings-controls';
import {
    fftSizeOptions,
    frequencyScaleOptions,
    maxFreqOptions,
    minFreqOptions,
    weightingFilterOptions,
} from './visualizer-settings-options';

import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';

type AudioMotionSettings = ReturnType<
    typeof useUpdateAudioMotionAnalyzer
>['visualizer']['audiomotionanalyzer'];

type SchemaField = SelectField | SliderField | ToggleField | ToggleRowField;

type SchemaSection = {
    fields: SchemaField[];
    grow?: boolean;
    legendKey: string;
};

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

type UpdateProperty = <K extends keyof AudioMotionSettings>(
    property: K,
    value: AudioMotionSettings[K],
) => void;

const fftSection: SchemaSection = {
    fields: [
        {
            key: 'fftSize',
            kind: 'select',
            labelKey: 'visualizer.fftSize',
            options: fftSizeOptions,
            parse: (value) => Number(value),
        },
        {
            key: 'smoothing',
            kind: 'slider',
            labelKey: 'visualizer.smoothing',
            max: 1,
            min: 0,
            step: 0.1,
        },
    ],
    legendKey: 'visualizer.fft',
};

const frequencySection: SchemaSection = {
    fields: [
        {
            key: 'minFreq',
            kind: 'select',
            labelKey: 'visualizer.minimumFrequency',
            options: minFreqOptions,
            parse: (value) => Number(value),
        },
        {
            key: 'maxFreq',
            kind: 'select',
            labelKey: 'visualizer.maximumFrequency',
            options: maxFreqOptions,
            parse: (value) => Number(value),
        },
        {
            key: 'frequencyScale',
            kind: 'select',
            labelKey: 'visualizer.frequencyScale',
            options: frequencyScaleOptions,
            parse: (value) => value as AudioMotionSettings['frequencyScale'],
        },
    ],
    legendKey: 'visualizer.frequencyRangeAndScaling',
};

const sensitivitySection: SchemaSection = {
    fields: [
        {
            key: 'weightingFilter',
            kind: 'select',
            labelKey: 'visualizer.weightingFilter',
            options: weightingFilterOptions,
            parse: (value) => value as AudioMotionSettings['weightingFilter'],
        },
        {
            key: 'minDecibels',
            kind: 'slider',
            labelKey: 'visualizer.minDecibels',
            max: 0,
            min: -120,
        },
        {
            key: 'maxDecibels',
            kind: 'slider',
            labelKey: 'visualizer.maxDecibels',
            max: 0,
            min: -120,
        },
    ],
    legendKey: 'visualizer.sensitivity',
};

const linearAmplitudeSection: SchemaSection = {
    fields: [
        {
            key: 'linearAmplitude',
            kind: 'toggle',
            labelKey: 'visualizer.linearAmplitude',
        },
        {
            disabled: (settings) => !settings.linearAmplitude,
            key: 'linearBoost',
            kind: 'slider',
            labelKey: 'visualizer.linearBoost',
            max: 4,
            min: 1,
            step: 0.1,
        },
    ],
    legendKey: 'visualizer.linearAmplitude',
};

const reflexMirrorSection: SchemaSection = {
    fields: [
        { key: 'reflexFit', kind: 'toggle', labelKey: 'visualizer.reflexFit' },
        {
            key: 'reflexRatio',
            kind: 'slider',
            labelKey: 'visualizer.reflexRatio',
            max: 1,
            min: 0,
            step: 0.1,
        },
        {
            key: 'reflexAlpha',
            kind: 'slider',
            labelKey: 'visualizer.reflexAlpha',
            max: 1,
            min: 0,
            step: 0.05,
        },
        {
            key: 'reflexBright',
            kind: 'slider',
            labelKey: 'visualizer.reflexBrightness',
            max: 2,
            min: 0,
            step: 0.1,
        },
        {
            key: 'mirror',
            kind: 'slider',
            labelKey: 'visualizer.mirror',
            max: 1,
            min: -1,
            step: 1,
        },
    ],
    legendKey: 'visualizer.reflexMirror',
};

const radialSection: SchemaSection = {
    fields: [
        { key: 'radial', kind: 'toggle', labelKey: 'visualizer.radial' },
        {
            disabled: (settings) => !settings.radial,
            key: 'radialInvert',
            kind: 'toggle',
            labelKey: 'visualizer.radialInvert',
        },
        {
            disabled: (settings) => !settings.radial,
            key: 'radius',
            kind: 'slider',
            labelKey: 'visualizer.radius',
            max: 1,
            min: 0,
            step: 0.05,
        },
        {
            disabled: (settings) => !settings.radial,
            key: 'spinSpeed',
            kind: 'slider',
            labelKey: 'visualizer.spinSpeed',
            max: 5,
            min: -5,
            step: 0.1,
        },
    ],
    legendKey: 'visualizer.radialSpectrum',
};

const peakSection: SchemaSection = {
    fields: [
        {
            disabled: (settings, key) => {
                if (key === 'fadePeaks' || key === 'peakLine') {
                    return !settings.showPeaks;
                }
                return false;
            },
            kind: 'toggle-row',
            toggles: [
                { key: 'showPeaks', labelKey: 'visualizer.showPeaks' },
                { key: 'fadePeaks', labelKey: 'visualizer.fadePeaks' },
                { key: 'peakLine', labelKey: 'visualizer.peakLine' },
            ],
        },
        {
            disabled: (settings) => !settings.showPeaks,
            key: 'gravity',
            kind: 'slider',
            labelKey: 'visualizer.gravity',
            max: 20,
            min: 0.1,
        },
        {
            disabled: (settings) => !settings.showPeaks || !settings.fadePeaks,
            key: 'peakFadeTime',
            kind: 'slider',
            labelKey: 'visualizer.peakFadeTime',
            max: 2000,
            min: 0,
            step: 1,
        },
        {
            disabled: (settings) => !settings.showPeaks,
            key: 'peakHoldTime',
            kind: 'slider',
            labelKey: 'visualizer.peakHoldTime',
            max: 1000,
            min: 0,
            step: 1,
        },
    ],
    legendKey: 'visualizer.peakBehavior',
};

const toggleSection: SchemaSection = {
    fields: [
        {
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
        },
    ],
    legendKey: 'visualizer.miscellaneousSettings',
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
                        updateProperty(
                            field.key,
                            field.parse(value ?? '') as AudioMotionSettings[typeof field.key],
                        )
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
                onChangeEnd={(value) =>
                    updateProperty(field.key, value as AudioMotionSettings[typeof field.key])
                }
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

    const translatedFrequencyScaleOptions = frequencyScaleOptions.map((option) => ({
        label: t(`visualizer.options.frequencyScale.${option.value}`),
        value: option.value,
    }));

    const translatedWeightingFilterOptions = weightingFilterOptions.map((option) => ({
        label: t(
            `visualizer.options.weightingFilter.${option.value === '' ? 'none' : option.value.toLowerCase()}`,
        ),
        value: option.value,
    }));

    const sections = SCHEMA_SECTIONS.map((section) => {
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
    });

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
