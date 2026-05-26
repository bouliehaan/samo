import { useTranslation } from 'react-i18next';

import { CustomGradientsManager } from './custom-gradients-manager';
import { useUpdateAudioMotionAnalyzer, VisualizerSelect } from './visualizer-settings-controls';
import { colorModeOptions, gradientOptions } from './visualizer-settings-options';

import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';

export const AudiomotionColorSettings = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateAudioMotionAnalyzer();

    const isGradientDisabled = visualizer.audiomotionanalyzer.channelLayout !== 'single';
    const isGradientLeftDisabled = visualizer.audiomotionanalyzer.channelLayout === 'single';
    const isGradientRightDisabled = visualizer.audiomotionanalyzer.channelLayout === 'single';

    const allGradientOptions = [
        {
            group: t('visualizer.custom'),
            items: (visualizer.audiomotionanalyzer.customGradients || []).map((gradient) => ({
                label: gradient.name,
                value: gradient.name,
            })),
        },
        {
            group: t('visualizer.builtIn'),
            items: gradientOptions,
        },
    ];

    return (
        <Fieldset legend={t('visualizer.colors')}>
            <Stack>
                <Group grow>
                    <VisualizerSelect
                        data={colorModeOptions}
                        defaultValue={visualizer.audiomotionanalyzer.colorMode}
                        label={t('visualizer.colorMode')}
                        onChange={(e) =>
                            updateProperty(
                                'colorMode',
                                (e || 'gradient') as 'bar-index' | 'bar-level' | 'gradient',
                            )
                        }
                    />
                    <VisualizerSelect
                        data={allGradientOptions}
                        defaultValue={visualizer.audiomotionanalyzer.gradient}
                        disabled={isGradientDisabled}
                        label={t('visualizer.gradient')}
                        onChange={(e) =>
                            updateProperty(
                                'gradient',
                                (e || 'classic') as typeof visualizer.audiomotionanalyzer.gradient,
                            )
                        }
                    />
                </Group>
                <Group grow>
                    <VisualizerSelect
                        data={allGradientOptions}
                        defaultValue={visualizer.audiomotionanalyzer.gradientLeft}
                        disabled={isGradientLeftDisabled}
                        label={t('visualizer.gradientLeft')}
                        onChange={(e) =>
                            updateProperty(
                                'gradientLeft',
                                (e ||
                                    'classic') as typeof visualizer.audiomotionanalyzer.gradientLeft,
                            )
                        }
                    />
                    <VisualizerSelect
                        data={allGradientOptions}
                        defaultValue={visualizer.audiomotionanalyzer.gradientRight}
                        disabled={isGradientRightDisabled}
                        label={t('visualizer.gradientRight')}
                        onChange={(e) =>
                            updateProperty(
                                'gradientRight',
                                (e ||
                                    'classic') as typeof visualizer.audiomotionanalyzer.gradientRight,
                            )
                        }
                    />
                </Group>
                <CustomGradientsManager />
            </Stack>
        </Fieldset>
    );
};
