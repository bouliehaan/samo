import { nanoid } from 'nanoid';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { VisualizerSelect } from './visualizer-settings-controls';
import { useSettingsStoreActions, useVisualizerSettings } from '/@/renderer/store/settings.store';
import { Button } from '/@/shared/components/button/button';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Textarea } from '/@/shared/components/textarea/textarea';
import { toast } from '/@/shared/components/toast/toast';

export const PresetSettings = () => {
    const { t } = useTranslation();
    const visualizer = useVisualizerSettings();
    const { setSettings } = useSettingsStoreActions();
    const [selectedPreset, setSelectedPreset] = useState<null | string>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [isPasting, setIsPasting] = useState(false);
    const [pasteValue, setPasteValue] = useState('');

    const applyPreset = (presetId: null | string) => {
        if (!presetId) return;

        const preset = visualizer.audiomotionanalyzer.presets.find((p) => p.id === presetId);

        if (!preset) return;

        const initialDefaults = {
            alphaBars: false,
            ansiBands: false,
            barSpace: 0.1,
            channelLayout: 'single' as const,
            colorMode: 'gradient' as const,
            customGradients: [],
            fadePeaks: false,
            fftSize: 8192,
            fillAlpha: 1,
            frequencyScale: 'log' as const,
            gradient: 'classic',
            gradientLeft: undefined,
            gradientRight: undefined,
            gravity: 3.8,
            ledBars: true,
            linearAmplitude: false,
            linearBoost: 1.0,
            lineWidth: 0,
            loRes: false,
            lumiBars: false,
            maxDecibels: -25,
            maxFPS: 0,
            maxFreq: 22000,
            minDecibels: -85,
            minFreq: 20,
            mirror: 0.0,
            mode: 0,
            noteLabels: false,
            opacity: 1,
            outlineBars: false,
            peakFadeTime: 750,
            peakHoldTime: 500,
            peakLine: false,
            radial: false,
            radialInvert: false,
            radius: 0.3,
            reflexAlpha: 0.15,
            reflexBright: 1.0,
            reflexFit: true,
            reflexRatio: 0,
            roundBars: false,
            showFPS: false,
            showPeaks: true,
            showScaleX: false,
            showScaleY: false,
            smoothing: 0.5,
            spinSpeed: 0.0,
            splitGradient: false,
            trueLeds: false,
            volume: 1.0,
            weightingFilter: '' as const,
        };

        // Merge preset values with initial defaults to ensure all properties are included
        const presetValue = {
            ...initialDefaults,
            ...preset.value,
        };

        setSettings({
            visualizer: {
                audiomotionanalyzer: {
                    ...presetValue,
                },
            },
        });
    };

    const handlePresetChange = (value: null | string) => {
        setSelectedPreset(value);
        if (value) {
            applyPreset(value);
        }
    };

    const handleSavePreset = () => {
        if (!newPresetName.trim()) return;

        // Check if preset name already exists
        const existingPreset = visualizer.audiomotionanalyzer.presets.find(
            (p) => p.name === newPresetName.trim(),
        );

        if (existingPreset) {
            // Update existing preset
            const updatedPresets = visualizer.audiomotionanalyzer.presets.map((p) =>
                p.id === existingPreset.id
                    ? {
                          ...p,
                          value: getCurrentSettingsAsPresetValue(),
                      }
                    : p,
            );

            setSettings({
                visualizer: {
                    audiomotionanalyzer: {
                        presets: updatedPresets,
                    },
                },
            });

            setSelectedPreset(existingPreset.id);
        } else {
            // Add new preset
            const newPreset = {
                id: nanoid(),
                name: newPresetName.trim(),
                value: getCurrentSettingsAsPresetValue(),
            };

            setSettings({
                visualizer: {
                    audiomotionanalyzer: {
                        presets: [...visualizer.audiomotionanalyzer.presets, newPreset],
                    },
                },
            });

            setSelectedPreset(newPreset.id);
        }

        setNewPresetName('');
        setIsSaving(false);
    };

    const getCurrentSettingsAsPresetValue = () => {
        return {
            alphaBars: visualizer.audiomotionanalyzer.alphaBars,
            ansiBands: visualizer.audiomotionanalyzer.ansiBands,
            barSpace: visualizer.audiomotionanalyzer.barSpace,
            channelLayout: visualizer.audiomotionanalyzer.channelLayout,
            colorMode: visualizer.audiomotionanalyzer.colorMode,
            customGradients: visualizer.audiomotionanalyzer.customGradients,
            fadePeaks: visualizer.audiomotionanalyzer.fadePeaks,
            fftSize: visualizer.audiomotionanalyzer.fftSize,
            fillAlpha: visualizer.audiomotionanalyzer.fillAlpha,
            frequencyScale: visualizer.audiomotionanalyzer.frequencyScale,
            gradient: visualizer.audiomotionanalyzer.gradient,
            gradientLeft: visualizer.audiomotionanalyzer.gradientLeft,
            gradientRight: visualizer.audiomotionanalyzer.gradientRight,
            gravity: visualizer.audiomotionanalyzer.gravity,
            ledBars: visualizer.audiomotionanalyzer.ledBars,
            linearAmplitude: visualizer.audiomotionanalyzer.linearAmplitude,
            linearBoost: visualizer.audiomotionanalyzer.linearBoost,
            lineWidth: visualizer.audiomotionanalyzer.lineWidth,
            loRes: visualizer.audiomotionanalyzer.loRes,
            lumiBars: visualizer.audiomotionanalyzer.lumiBars,
            maxDecibels: visualizer.audiomotionanalyzer.maxDecibels,
            maxFPS: visualizer.audiomotionanalyzer.maxFPS,
            maxFreq: visualizer.audiomotionanalyzer.maxFreq,
            minDecibels: visualizer.audiomotionanalyzer.minDecibels,
            minFreq: visualizer.audiomotionanalyzer.minFreq,
            mirror: visualizer.audiomotionanalyzer.mirror,
            mode: visualizer.audiomotionanalyzer.mode,
            noteLabels: visualizer.audiomotionanalyzer.noteLabels,
            opacity: visualizer.audiomotionanalyzer.opacity,
            outlineBars: visualizer.audiomotionanalyzer.outlineBars,
            peakFadeTime: visualizer.audiomotionanalyzer.peakFadeTime,
            peakHoldTime: visualizer.audiomotionanalyzer.peakHoldTime,
            peakLine: visualizer.audiomotionanalyzer.peakLine,
            radial: visualizer.audiomotionanalyzer.radial,
            radialInvert: visualizer.audiomotionanalyzer.radialInvert,
            radius: visualizer.audiomotionanalyzer.radius,
            reflexAlpha: visualizer.audiomotionanalyzer.reflexAlpha,
            reflexBright: visualizer.audiomotionanalyzer.reflexBright,
            reflexFit: visualizer.audiomotionanalyzer.reflexFit,
            reflexRatio: visualizer.audiomotionanalyzer.reflexRatio,
            roundBars: visualizer.audiomotionanalyzer.roundBars,
            showFPS: visualizer.audiomotionanalyzer.showFPS,
            showPeaks: visualizer.audiomotionanalyzer.showPeaks,
            showScaleX: visualizer.audiomotionanalyzer.showScaleX,
            showScaleY: visualizer.audiomotionanalyzer.showScaleY,
            smoothing: visualizer.audiomotionanalyzer.smoothing,
            spinSpeed: visualizer.audiomotionanalyzer.spinSpeed,
            splitGradient: visualizer.audiomotionanalyzer.splitGradient,
            trueLeds: visualizer.audiomotionanalyzer.trueLeds,
            volume: visualizer.audiomotionanalyzer.volume,
            weightingFilter: visualizer.audiomotionanalyzer.weightingFilter,
        };
    };

    const handleUpdatePreset = () => {
        if (!selectedPreset || !newPresetName.trim()) return;

        const selectedPresetObj = visualizer.audiomotionanalyzer.presets.find(
            (p) => p.id === selectedPreset,
        );
        if (!selectedPresetObj) return;

        let trimmedName = newPresetName.trim();
        const isRenaming = trimmedName !== selectedPresetObj.name;

        if (isRenaming) {
            const existingNames = visualizer.audiomotionanalyzer.presets
                .filter((p) => p.id !== selectedPreset)
                .map((p) => p.name);

            if (existingNames.includes(trimmedName)) {
                const pattern = /^(.+?)(\s+\((\d+)\))?$/;
                const match = trimmedName.match(pattern);
                const baseName = match ? match[1] : trimmedName;
                let counter = 1;
                while (existingNames.includes(`${baseName} (${counter})`)) {
                    counter++;
                }
                trimmedName = `${baseName} (${counter})`;
            }
        }

        const updatedPresets = visualizer.audiomotionanalyzer.presets.map((p) =>
            p.id === selectedPreset
                ? {
                      ...p,
                      name: trimmedName,
                      value: getCurrentSettingsAsPresetValue(),
                  }
                : p,
        );

        setSettings({
            visualizer: {
                ...visualizer,
                audiomotionanalyzer: {
                    ...visualizer.audiomotionanalyzer,
                    presets: updatedPresets,
                },
            },
        });

        setNewPresetName('');
        setIsRenaming(false);
    };

    const handleDeletePreset = () => {
        if (!selectedPreset) return;

        const updatedPresets = visualizer.audiomotionanalyzer.presets.filter(
            (p) => p.id !== selectedPreset,
        );

        setSettings({
            visualizer: {
                audiomotionanalyzer: {
                    presets: updatedPresets,
                },
            },
        });

        setSelectedPreset(null);
    };

    const handleCopyConfiguration = async () => {
        try {
            const config = getCurrentSettingsAsPresetValue();
            const configJson = JSON.stringify(config, null, 2);
            await navigator.clipboard.writeText(configJson);
            toast.success({
                message: t('visualizer.configCopied', { postProcess: 'sentenceCase' }),
            });
        } catch {
            toast.error({
                message: t('visualizer.configCopyFailed', { postProcess: 'sentenceCase' }),
            });
        }
    };

    const handlePasteConfiguration = () => {
        if (!pasteValue.trim()) return;

        try {
            const parsed = JSON.parse(pasteValue.trim());

            // Validate that it's an object with expected properties
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                throw new Error('Invalid configuration format');
            }

            // Merge with initial defaults to ensure all properties are set
            const initialDefaults = {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0.1,
                channelLayout: 'single' as const,
                colorMode: 'gradient' as const,
                customGradients: [],
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 1,
                frequencyScale: 'log' as const,
                gradient: 'classic',
                gradientLeft: undefined,
                gradientRight: undefined,
                gravity: 3.8,
                ledBars: true,
                linearAmplitude: false,
                linearBoost: 1.0,
                lineWidth: 0,
                loRes: false,
                lumiBars: false,
                maxDecibels: -25,
                maxFPS: 0,
                maxFreq: 22000,
                minDecibels: -85,
                minFreq: 20,
                mirror: 0.0,
                mode: 0,
                noteLabels: false,
                opacity: 1,
                outlineBars: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0.15,
                reflexBright: 1.0,
                reflexFit: true,
                reflexRatio: 0,
                roundBars: false,
                showFPS: false,
                showPeaks: true,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.5,
                spinSpeed: 0.0,
                splitGradient: false,
                trueLeds: false,
                volume: 1.0,
                weightingFilter: '' as const,
            };

            const pastedCustomGradients = Array.isArray(parsed.customGradients)
                ? parsed.customGradients
                : [];

            const parsedWithoutCustomGradients = { ...parsed };
            delete parsedWithoutCustomGradients.customGradients;

            // Determine the channel layout from the pasted config (or use default)
            const pastedChannelLayout = parsed.channelLayout || initialDefaults.channelLayout;

            // Get the gradient values that would be used based on channel layout
            const gradientNamesToCheck: (string | undefined)[] = [];
            if (pastedChannelLayout === 'single') {
                gradientNamesToCheck.push(parsed.gradient);
            } else {
                gradientNamesToCheck.push(parsed.gradientLeft, parsed.gradientRight);
            }

            // Check if any of the gradient names match custom gradients in the pasted config
            const pastedCustomGradientNames = pastedCustomGradients.map((g) => g.name);
            const isUsingCustomGradient = gradientNamesToCheck.some(
                (gradientName) => gradientName && pastedCustomGradientNames.includes(gradientName),
            );

            // Only append custom gradients if they're actually being used in the configuration
            const customGradientsToUse = isUsingCustomGradient
                ? [
                      ...(visualizer.audiomotionanalyzer.customGradients || []),
                      ...pastedCustomGradients,
                  ]
                : pastedCustomGradients;

            const configValue = {
                ...initialDefaults,
                ...parsedWithoutCustomGradients,
                customGradients: customGradientsToUse,
            };

            setSettings({
                visualizer: {
                    audiomotionanalyzer: {
                        ...configValue,
                    },
                },
            });

            toast.success({
                message: t('visualizer.configPasted', { postProcess: 'sentenceCase' }),
            });

            setPasteValue('');
            setIsPasting(false);
        } catch {
            toast.error({
                message: t('visualizer.configPasteFailed', { postProcess: 'sentenceCase' }),
            });
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setPasteValue(text);
            setIsPasting(true);
        } catch {
            toast.error({
                message: t('visualizer.configPasteReadFailed', { postProcess: 'sentenceCase' }),
            });
        }
    };

    const presetOptions = visualizer.audiomotionanalyzer.presets.map((preset) => ({
        label: preset.name,
        value: preset.id,
    }));

    return (
        <Fieldset legend={t('visualizer.presets')}>
            <Stack>
                <VisualizerSelect
                    data={presetOptions}
                    label={t('visualizer.selectPreset')}
                    onChange={handlePresetChange}
                    value={selectedPreset || undefined}
                />
                {isSaving ? (
                    <Group grow>
                        <TextInput
                            autoFocus
                            label={t('visualizer.presetName')}
                            onChange={(e) => setNewPresetName(e.currentTarget.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSavePreset();
                                } else if (e.key === 'Escape') {
                                    setIsSaving(false);
                                    setNewPresetName('');
                                }
                            }}
                            placeholder={t('visualizer.presetNamePlaceholder')}
                            value={newPresetName}
                        />
                        <Group style={{ alignSelf: 'flex-end' }}>
                            <Button onClick={() => setIsSaving(false)} variant="subtle">
                                {t('common.cancel', { postProcess: 'titleCase' })}
                            </Button>
                            <Button
                                disabled={!newPresetName.trim()}
                                onClick={handleSavePreset}
                                variant="filled"
                            >
                                {t('common.save', { postProcess: 'titleCase' })}
                            </Button>
                        </Group>
                    </Group>
                ) : isRenaming ? (
                    <Group grow>
                        <TextInput
                            autoFocus
                            label={t('visualizer.presetName')}
                            onChange={(e) => setNewPresetName(e.currentTarget.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleUpdatePreset();
                                } else if (e.key === 'Escape') {
                                    setIsRenaming(false);
                                    setNewPresetName('');
                                }
                            }}
                            placeholder={t('visualizer.presetNamePlaceholder')}
                            value={newPresetName}
                        />
                        <Group style={{ alignSelf: 'flex-end' }}>
                            <Button onClick={() => setIsRenaming(false)} variant="subtle">
                                {t('common.cancel', { postProcess: 'titleCase' })}
                            </Button>
                            <Button
                                disabled={!newPresetName.trim()}
                                onClick={handleUpdatePreset}
                                variant="filled"
                            >
                                {t('common.save', { postProcess: 'titleCase' })}
                            </Button>
                        </Group>
                    </Group>
                ) : isPasting ? (
                    <Stack>
                        <Textarea
                            autosize
                            label={t('visualizer.pasteConfiguration')}
                            maxRows={10}
                            minRows={5}
                            onChange={(e) => setPasteValue(e.currentTarget.value)}
                            placeholder={t('visualizer.pasteConfigurationPlaceholder')}
                            spellCheck={false}
                            value={pasteValue}
                        />
                        <Group>
                            <Button onClick={handlePasteFromClipboard} variant="subtle">
                                {t('visualizer.pasteFromClipboard')}
                            </Button>
                            <Button onClick={() => setIsPasting(false)} variant="subtle">
                                {t('common.cancel', { postProcess: 'titleCase' })}
                            </Button>
                            <Button
                                disabled={!pasteValue.trim()}
                                onClick={handlePasteConfiguration}
                                variant="filled"
                            >
                                {t('visualizer.applyConfiguration')}
                            </Button>
                        </Group>
                    </Stack>
                ) : (
                    <Group>
                        <Button onClick={() => setIsSaving(true)} variant="default">
                            {t('visualizer.saveAsPreset')}
                        </Button>
                        {selectedPreset && (
                            <>
                                <Button
                                    onClick={() => {
                                        const preset = visualizer.audiomotionanalyzer.presets.find(
                                            (p) => p.id === selectedPreset,
                                        );
                                        if (preset) {
                                            setNewPresetName(preset.name);
                                            setIsRenaming(true);
                                        }
                                    }}
                                    variant="default"
                                >
                                    {t('visualizer.updatePreset')}
                                </Button>
                                <Button onClick={handleDeletePreset} variant="subtle">
                                    {t('common.delete', { postProcess: 'titleCase' })}
                                </Button>
                            </>
                        )}
                        <Button onClick={handleCopyConfiguration} variant="default">
                            {t('visualizer.copyConfiguration')}
                        </Button>
                        <Button onClick={() => setIsPasting(true)} variant="default">
                            {t('visualizer.pasteConfiguration')}
                        </Button>
                    </Group>
                )}
            </Stack>
        </Fieldset>
    );
};
