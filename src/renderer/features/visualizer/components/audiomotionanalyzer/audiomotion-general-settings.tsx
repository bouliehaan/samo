import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { barSpaceOptions, channelLayoutOptions, modeOptions } from './visualizer-settings-options';
import {
    useUpdateAudioMotionAnalyzer,
    VisualizerSelect,
    VisualizerSlider,
} from './visualizer-settings-controls';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';

export const AudiomotionGeneralSettings = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateAudioMotionAnalyzer();

    const isMode18Disabled = visualizer.audiomotionanalyzer.mode > 8;
    const isMode10Disabled = visualizer.audiomotionanalyzer.mode !== 10;

    const getChannelLayoutKey = (value: string) => {
        const layoutMap: Record<string, string> = {
            'dual-combined': 'dualCombined',
            'dual-horizontal': 'dualHorizontal',
            'dual-vertical': 'dualVertical',
            single: 'single',
        };
        return layoutMap[value] || 'single';
    };

    const translatedChannelLayoutOptions = useMemo(
        () =>
            channelLayoutOptions.map((option) => {
                const value = option.value || 'single';
                return {
                    label: t(`visualizer.options.channelLayout.${getChannelLayoutKey(value)}`),
                    value: value as string,
                };
            }),
        [t],
    );

    return (
        <Fieldset
            legend={
                <Group gap="xs">
                    {t('visualizer.general')}
                    <ActionIcon
                        component="a"
                        href="https://audiomotion.dev/#/?id=constructor-specific-options"
                        icon="externalLink"
                        iconProps={{ color: 'info' }}
                        size="xs"
                        target="_blank"
                        variant="transparent"
                    />
                </Group>
            }
        >
            <Stack>
                <Group grow>
                    <VisualizerSelect
                        data={modeOptions}
                        defaultValue={visualizer.audiomotionanalyzer.mode.toString()}
                        label={t('visualizer.mode')}
                        onChange={(e) => updateProperty('mode', Number(e))}
                    />
                </Group>
                <div
                    style={{
                        display: 'flex',
                        gap: 'var(--theme-spacing-md)',
                    }}
                >
                    <Fieldset legend={t('visualizer.mode1To8')} style={{ flex: 1, flexGrow: 1 }}>
                        <Group grow>
                            <VisualizerSelect
                                data={barSpaceOptions.map((option) => ({
                                    label: option.label,
                                    value: option.value,
                                }))}
                                defaultValue={visualizer.audiomotionanalyzer.barSpace.toString()}
                                disabled={isMode18Disabled}
                                label={t('visualizer.barSpace')}
                                onChange={(e) => updateProperty('barSpace', Number(e))}
                            />
                        </Group>
                    </Fieldset>
                    <Fieldset legend={t('visualizer.mode10')} style={{ flex: 1, flexGrow: 1 }}>
                        <Group grow>
                            <VisualizerSlider
                                defaultValue={visualizer.audiomotionanalyzer.lineWidth}
                                disabled={isMode10Disabled}
                                label={t('visualizer.lineWidth')}
                                max={4}
                                min={0}
                                onChangeEnd={(e) => updateProperty('lineWidth', e)}
                                step={0.1}
                            />
                            <VisualizerSlider
                                defaultValue={visualizer.audiomotionanalyzer.fillAlpha}
                                disabled={isMode10Disabled}
                                label={t('visualizer.fillAlpha')}
                                max={1}
                                min={0}
                                onChangeEnd={(e) => updateProperty('fillAlpha', e)}
                                step={0.1}
                            />
                        </Group>
                    </Fieldset>
                </div>

                <Group grow>
                    <VisualizerSelect
                        data={translatedChannelLayoutOptions}
                        defaultValue={visualizer.audiomotionanalyzer.channelLayout}
                        label={t('visualizer.channelLayout')}
                        onChange={(e) =>
                            updateProperty(
                                'channelLayout',
                                e as
                                    | 'dual-combined'
                                    | 'dual-horizontal'
                                    | 'dual-vertical'
                                    | 'single',
                            )
                        }
                    />
                    <VisualizerSlider
                        defaultValue={visualizer.audiomotionanalyzer.maxFPS}
                        label={t('visualizer.maxFPS')}
                        max={144}
                        min={0}
                        onChangeEnd={(e) => updateProperty('maxFPS', e)}
                    />
                    <VisualizerSlider
                        defaultValue={visualizer.audiomotionanalyzer.opacity}
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
