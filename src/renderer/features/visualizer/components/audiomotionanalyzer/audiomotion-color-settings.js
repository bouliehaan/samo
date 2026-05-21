import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomGradientsManager } from './custom-gradients-manager';
import { colorModeOptions, gradientOptions } from './visualizer-settings-options';
import { useUpdateAudioMotionAnalyzer, VisualizerSelect } from './visualizer-settings-controls';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
export const AudiomotionColorSettings = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateAudioMotionAnalyzer();
    const isGradientDisabled = visualizer.audiomotionanalyzer.channelLayout !== 'single';
    const isGradientLeftDisabled = visualizer.audiomotionanalyzer.channelLayout === 'single';
    const isGradientRightDisabled = visualizer.audiomotionanalyzer.channelLayout === 'single';
    const allGradientOptions = useMemo(() => [
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
    ], [t, visualizer.audiomotionanalyzer.customGradients]);
    return (_jsx(Fieldset, { legend: t('visualizer.colors'), children: _jsxs(Stack, { children: [_jsxs(Group, { grow: true, children: [_jsx(VisualizerSelect, { data: colorModeOptions, defaultValue: visualizer.audiomotionanalyzer.colorMode, label: t('visualizer.colorMode'), onChange: (e) => updateProperty('colorMode', (e || 'gradient')) }), _jsx(VisualizerSelect, { data: allGradientOptions, defaultValue: visualizer.audiomotionanalyzer.gradient, disabled: isGradientDisabled, label: t('visualizer.gradient'), onChange: (e) => updateProperty('gradient', (e || 'classic')) })] }), _jsxs(Group, { grow: true, children: [_jsx(VisualizerSelect, { data: allGradientOptions, defaultValue: visualizer.audiomotionanalyzer.gradientLeft, disabled: isGradientLeftDisabled, label: t('visualizer.gradientLeft'), onChange: (e) => updateProperty('gradientLeft', (e ||
                                'classic')) }), _jsx(VisualizerSelect, { data: allGradientOptions, defaultValue: visualizer.audiomotionanalyzer.gradientRight, disabled: isGradientRightDisabled, label: t('visualizer.gradientRight'), onChange: (e) => updateProperty('gradientRight', (e ||
                                'classic')) })] }), _jsx(CustomGradientsManager, {})] }) }));
};
