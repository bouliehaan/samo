import i18n from '/@/i18n/i18n';

export const modeOptions: { label: string; value: string }[] = [
    { label: i18n.t('visualizer.options.mode.0') as string, value: '0' },
    { label: i18n.t('visualizer.options.mode.1') as string, value: '1' },
    { label: i18n.t('visualizer.options.mode.2') as string, value: '2' },
    { label: i18n.t('visualizer.options.mode.3') as string, value: '3' },
    { label: i18n.t('visualizer.options.mode.4') as string, value: '4' },
    { label: i18n.t('visualizer.options.mode.5') as string, value: '5' },
    { label: i18n.t('visualizer.options.mode.6') as string, value: '6' },
    { label: i18n.t('visualizer.options.mode.7') as string, value: '7' },
    { label: i18n.t('visualizer.options.mode.8') as string, value: '8' },
    { label: i18n.t('visualizer.options.mode.10') as string, value: '10' },
];

export const colorModeOptions: { label: string; value: string }[] = [
    { label: i18n.t('visualizer.options.colorMode.gradient') as string, value: 'gradient' },
    { label: i18n.t('visualizer.options.colorMode.barIndex') as string, value: 'bar-index' },
    { label: i18n.t('visualizer.options.colorMode.barLevel') as string, value: 'bar-level' },
];

export const gradientOptions: { label: string; value: string }[] = [
    { label: i18n.t('visualizer.options.gradient.classic') as string, value: 'classic' },
    { label: i18n.t('visualizer.options.gradient.prism') as string, value: 'prism' },
    { label: i18n.t('visualizer.options.gradient.rainbow') as string, value: 'rainbow' },
    { label: i18n.t('visualizer.options.gradient.steelblue') as string, value: 'steelblue' },
    { label: i18n.t('visualizer.options.gradient.orangered') as string, value: 'orangered' },
];

export const channelLayoutOptions: { label: string; value: string }[] = [
    { label: i18n.t('visualizer.options.channelLayout.single') as string, value: 'single' },
    {
        label: i18n.t('visualizer.options.channelLayout.dualCombined') as string,
        value: 'dual-combined',
    },
    {
        label: i18n.t('visualizer.options.channelLayout.dualHorizontal') as string,
        value: 'dual-horizontal',
    },
    {
        label: i18n.t('visualizer.options.channelLayout.dualVertical') as string,
        value: 'dual-vertical',
    },
];

export const fftSizeOptions: { label: string; value: string }[] = [
    { label: '1024', value: '1024' },
    { label: '2048', value: '2048' },
    { label: '4096', value: '4096' },
    { label: '8192', value: '8192' },
    { label: '16384', value: '16384' },
    { label: '32768', value: '32768' },
];

export const frequencyScaleOptions: { label: string; value: string }[] = [
    { label: i18n.t('visualizer.options.frequencyScale.bark') as string, value: 'bark' },
    { label: i18n.t('visualizer.options.frequencyScale.linear') as string, value: 'linear' },
    { label: i18n.t('visualizer.options.frequencyScale.log') as string, value: 'log' },
    { label: i18n.t('visualizer.options.frequencyScale.mel') as string, value: 'mel' },
];

export const weightingFilterOptions = [
    { label: i18n.t('visualizer.options.weightingFilter.none') as string, value: '' },
    { label: i18n.t('visualizer.options.weightingFilter.a') as string, value: 'A' },
    { label: i18n.t('visualizer.options.weightingFilter.b') as string, value: 'B' },
    { label: i18n.t('visualizer.options.weightingFilter.C') as string, value: 'C' },
    { label: i18n.t('visualizer.options.weightingFilter.D') as string, value: 'D' },
    { label: i18n.t('visualizer.options.weightingFilter.z') as string, value: 'Z' },
];

export const minFreqOptions = [
    { label: '20', value: '20' },
    { label: '30', value: '30' },
    { label: '40', value: '40' },
    { label: '50', value: '50' },
];

export const maxFreqOptions = [
    { label: '8000', value: '8000' },
    { label: '10000', value: '10000' },
    { label: '15000', value: '15000' },
    { label: '20000', value: '20000' },
    { label: '22050', value: '22050' },
];

export const barSpaceOptions = [
    { label: '0', value: '0' },
    { label: '0.1', value: '0.1' },
    { label: '0.25', value: '0.2' },
    { label: '0.4', value: '0.4' },
    { label: '0.5', value: '0.5' },
    { label: '0.75', value: '0.7' },
    { label: '1.0', value: '1.0' },
];
