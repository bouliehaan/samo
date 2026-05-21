import { useTranslation } from 'react-i18next';

import {
    useButterchurnPresetOptions,
    useUpdateButterchurn,
    VisualizerSelect,
    VisualizerSlider,
    VisualizerToggle,
} from './visualizer-settings-controls';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { MultiSelect } from '/@/shared/components/multi-select/multi-select';
import { Stack } from '/@/shared/components/stack/stack';

const ButterchurnGeneralSettings = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateButterchurn();

    const presetOptions = useButterchurnPresetOptions();

    return (
        <Fieldset legend={t('visualizer.general')}>
            <Stack>
                <Group grow>
                    <VisualizerSelect
                        data={presetOptions}
                        label={t('visualizer.selectPreset')}
                        onChange={(value) => {
                            updateProperty('currentPreset', value || undefined);
                        }}
                        value={visualizer.butterchurn.currentPreset}
                    />
                </Group>
                <Group grow>
                    <VisualizerSlider
                        defaultValue={visualizer.butterchurn.blendTime}
                        label={t('visualizer.blendTime')}
                        max={10}
                        min={0}
                        onChangeEnd={(e) => updateProperty('blendTime', e)}
                        step={0.1}
                    />
                    <VisualizerSlider
                        defaultValue={visualizer.butterchurn.maxFPS}
                        label={t('visualizer.maxFPS')}
                        max={144}
                        min={0}
                        onChangeEnd={(e) => updateProperty('maxFPS', e)}
                        step={1}
                    />
                    <VisualizerSlider
                        defaultValue={visualizer.butterchurn.opacity}
                        label={t('visualizer.opacity')}
                        max={1}
                        min={0}
                        onChangeEnd={(e) => updateProperty('opacity', e)}
                        step={0.01}
                    />
                </Group>
            </Stack>
        </Fieldset>
    );
};

const ButterChurnCycleSettings = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateButterchurn();

    const presetOptions = useButterchurnPresetOptions();

    return (
        <Fieldset legend={t('visualizer.cyclePresets')}>
            <Stack>
                <Group grow>
                    <VisualizerToggle
                        label={t('visualizer.cyclePresets')}
                        onChange={(checked) => updateProperty('cyclePresets', checked)}
                        value={visualizer.butterchurn.cyclePresets}
                    />
                    <VisualizerToggle
                        disabled={!visualizer.butterchurn.cyclePresets}
                        label={t('visualizer.includeAllPresets')}
                        onChange={(checked) => updateProperty('includeAllPresets', checked)}
                        value={visualizer.butterchurn.includeAllPresets}
                    />
                    <VisualizerToggle
                        disabled={!visualizer.butterchurn.cyclePresets}
                        label={t('visualizer.randomizeNextPreset')}
                        onChange={(checked) => updateProperty('randomizeNextPreset', checked)}
                        value={visualizer.butterchurn.randomizeNextPreset}
                    />
                </Group>
                <MultiSelect
                    data={presetOptions}
                    disabled={
                        !visualizer.butterchurn.cyclePresets ||
                        visualizer.butterchurn.includeAllPresets
                    }
                    label={t('visualizer.selectedPresets')}
                    onChange={(values) => updateProperty('selectedPresets', values)}
                    value={visualizer.butterchurn.selectedPresets}
                />
                <MultiSelect
                    data={presetOptions}
                    disabled={!visualizer.butterchurn.cyclePresets}
                    label={t('visualizer.ignoredPresets')}
                    onChange={(values) => updateProperty('ignoredPresets', values)}
                    value={visualizer.butterchurn.ignoredPresets}
                />

                <Group grow>
                    <VisualizerSlider
                        defaultValue={visualizer.butterchurn.cycleTime}
                        disabled={!visualizer.butterchurn.cyclePresets}
                        label={t('visualizer.cycleTime')}
                        max={300}
                        min={1}
                        onChangeEnd={(e) => updateProperty('cycleTime', e)}
                        step={1}
                    />
                </Group>
            </Stack>
        </Fieldset>
    );
};

export const ButterchurnSettings = () => (
    <>
        <ButterchurnGeneralSettings />
        <ButterChurnCycleSettings />
    </>
);
