import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUpdateAudioMotionAnalyzer, VisualizerSlider } from './visualizer-settings-controls';

import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { ColorInput } from '/@/shared/components/color-input/color-input';
import { Divider } from '/@/shared/components/divider/divider';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { Group } from '/@/shared/components/group/group';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { Textarea } from '/@/shared/components/textarea/textarea';
import { toast } from '/@/shared/components/toast/toast';

type CustomGradient = {
    colorStops: StoredColorStop[];
    dir?: string;
    name: string;
};

type StoredColorStop = {
    color: string;
    level?: number;
    levelEnabled?: boolean;
    pos?: number;
    positionEnabled?: boolean;
};

export const CustomGradientsManager = () => {
    const { t } = useTranslation();
    const { updateProperty, visualizer } = useUpdateAudioMotionAnalyzer();
    const [isAdding, setIsAdding] = useState(false);
    const [editingIndex, setEditingIndex] = useState<null | number>(null);
    const [isPasting, setIsPasting] = useState(false);
    const [pasteValue, setPasteValue] = useState('');
    const [newGradient, setNewGradient] = useState<CustomGradient>({
        colorStops: [{ color: '#ff0000', levelEnabled: false, positionEnabled: false }],
        dir: 'v',
        name: '',
    });

    const customGradients = visualizer.audiomotionanalyzer.customGradients || [];

    const generateDefaultName = () => {
        const existingNames = customGradients.map((g) => g.name);
        const pattern = /^Custom Gradient (\d+)$/i;
        const numbers = existingNames
            .map((name) => {
                const match = name.match(pattern);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter((num): num is number => num !== null);

        if (numbers.length === 0) {
            return 'Custom Gradient 1';
        }

        const maxNumber = Math.max(...numbers);
        return `Custom Gradient ${maxNumber + 1}`;
    };

    const handleStartAdding = () => {
        setNewGradient({
            colorStops: [{ color: '#ff0000', levelEnabled: false, positionEnabled: false }],
            dir: 'v',
            name: generateDefaultName(),
        });
        setIsAdding(true);
    };

    const handleAddGradient = () => {
        if (!newGradient.name.trim()) return;

        const updatedGradients = [...customGradients, newGradient];
        updateProperty('customGradients', updatedGradients);
        setNewGradient({
            colorStops: [
                {
                    color: '#ff0000',
                    level: 0,
                    levelEnabled: false,
                    pos: 0,
                    positionEnabled: false,
                },
            ],
            dir: 'v',
            name: '',
        });
        setIsAdding(false);
    };

    const handleDeleteGradient = (index: number) => {
        const updatedGradients = customGradients.filter((_, i) => i !== index);
        updateProperty('customGradients', updatedGradients);
    };

    const handleEditGradient = (index: number) => {
        const gradient = customGradients[index];
        setNewGradient(gradient);
        setEditingIndex(index);
        setIsAdding(true);
    };

    const handleSaveEdit = () => {
        if (!newGradient.name.trim() || editingIndex === null) return;

        const updatedGradients = [...customGradients];
        updatedGradients[editingIndex] = newGradient;
        updateProperty('customGradients', updatedGradients);
        setNewGradient({
            colorStops: [{ color: '#ff0000', levelEnabled: false, positionEnabled: false }],
            dir: 'v',
            name: '',
        });
        setEditingIndex(null);
        setIsAdding(false);
    };

    const handleCancel = () => {
        setNewGradient({
            colorStops: [{ color: '#ff0000', levelEnabled: false, positionEnabled: false }],
            dir: 'v',
            name: '',
        });
        setEditingIndex(null);
        setIsAdding(false);
    };

    const handleAddColorStop = () => {
        setNewGradient({
            ...newGradient,
            colorStops: [
                ...newGradient.colorStops,
                { color: '#00ff00', levelEnabled: false, positionEnabled: false },
            ],
        });
    };

    const handleRemoveColorStop = (index: number) => {
        if (newGradient.colorStops.length <= 1) return;
        setNewGradient({
            ...newGradient,
            colorStops: newGradient.colorStops.filter((_, i) => i !== index),
        });
    };

    const handleColorStopChange = (index: number, color: string) => {
        const updatedColorStops = [...newGradient.colorStops];
        const currentStop = updatedColorStops[index];

        updatedColorStops[index] = {
            ...currentStop,
            color,
        };

        setNewGradient({ ...newGradient, colorStops: updatedColorStops });
    };

    const handleColorStopPosChange = (index: number, pos: number | string) => {
        const updatedColorStops = [...newGradient.colorStops];
        const currentStop = updatedColorStops[index];
        const posValue = typeof pos === 'number' ? pos : parseFloat(pos) || undefined;

        updatedColorStops[index] = {
            ...currentStop,
            ...(currentStop.positionEnabled && posValue !== undefined ? { pos: posValue } : {}),
        };

        setNewGradient({ ...newGradient, colorStops: updatedColorStops });
    };

    const handleColorStopLevelChange = (index: number, level: number | string) => {
        const updatedColorStops = [...newGradient.colorStops];
        const currentStop = updatedColorStops[index];
        const levelValue = typeof level === 'number' ? level : parseFloat(level) || undefined;

        updatedColorStops[index] = {
            ...currentStop,
            ...(currentStop.levelEnabled && levelValue !== undefined ? { level: levelValue } : {}),
        };

        setNewGradient({ ...newGradient, colorStops: updatedColorStops });
    };

    const handleTogglePos = (index: number, enabled: boolean) => {
        const updatedColorStops = [...newGradient.colorStops];
        const currentStop = updatedColorStops[index];

        updatedColorStops[index] = {
            ...currentStop,
            positionEnabled: enabled,
            // Remove pos if disabling
            ...(enabled && currentStop.pos !== undefined ? { pos: currentStop.pos } : {}),
            ...(!enabled ? { pos: undefined } : {}),
        };

        setNewGradient({ ...newGradient, colorStops: updatedColorStops });
    };

    const handleToggleLevel = (index: number, enabled: boolean) => {
        const updatedColorStops = [...newGradient.colorStops];
        const currentStop = updatedColorStops[index];

        updatedColorStops[index] = {
            ...currentStop,
            levelEnabled: enabled,
            // Remove level if disabling
            ...(enabled && currentStop.level !== undefined ? { level: currentStop.level } : {}),
            ...(!enabled ? { level: undefined } : {}),
        };

        setNewGradient({ ...newGradient, colorStops: updatedColorStops });
    };

    const handleCopyGradient = async (gradient: CustomGradient) => {
        try {
            const gradientJson = JSON.stringify(gradient, null, 2);
            await navigator.clipboard.writeText(gradientJson);
            toast.success({
                message: t('visualizer.configCopied'),
            });
        } catch {
            toast.error({
                message: t('visualizer.configCopyFailed'),
            });
        }
    };

    const handlePasteGradient = () => {
        if (!pasteValue.trim()) return;

        try {
            const parsed = JSON.parse(pasteValue.trim());

            // Validate that it's a valid gradient object
            if (
                typeof parsed !== 'object' ||
                parsed === null ||
                Array.isArray(parsed) ||
                !parsed.colorStops ||
                !Array.isArray(parsed.colorStops) ||
                parsed.colorStops.length === 0
            ) {
                throw new Error('Invalid gradient format');
            }

            // Generate a unique name if the pasted gradient has a name that already exists
            let gradientName = parsed.name || generateDefaultName();
            const existingNames = customGradients.map((g) => g.name);
            if (existingNames.includes(gradientName)) {
                const pattern = /^(.+?)(\s+\((\d+)\))?$/;
                const match = gradientName.match(pattern);
                const baseName = match ? match[1] : gradientName;
                let counter = 1;
                while (existingNames.includes(`${baseName} (${counter})`)) {
                    counter++;
                }
                gradientName = `${baseName} (${counter})`;
            }

            const pastedGradient: CustomGradient = {
                colorStops: parsed.colorStops.map((stop: any) => ({
                    color: stop.color || '#ff0000',
                    level: stop.level,
                    levelEnabled: stop.levelEnabled || false,
                    pos: stop.pos,
                    positionEnabled: stop.positionEnabled || false,
                })),
                dir: parsed.dir || 'v',
                name: gradientName,
            };

            setNewGradient(pastedGradient);
            setPasteValue('');
            setIsPasting(false);
            setIsAdding(true);
            setEditingIndex(null);
        } catch {
            toast.error({
                message: t('visualizer.configPasteFailed'),
            });
        }
    };

    return (
        <Fieldset
            legend={
                <Group gap="xs">
                    {t('visualizer.customGradients')}
                    <ActionIcon
                        component="a"
                        href="https://audiomotion.dev/#/?id=registergradient-name-options-"
                        icon="externalLink"
                        iconProps={{ color: 'info' }}
                        size="xs"
                        target="_blank"
                        variant="transparent"
                    />
                </Group>
            }
        >
            <Stack gap="md">
                {customGradients.length > 0 && (
                    <Stack gap="sm">
                        {customGradients.map((gradient, index) => (
                            <Group grow key={index}>
                                <Group grow>
                                    <Text size="sm">{gradient.name}</Text>
                                </Group>
                                <Group justify="flex-end">
                                    <Button
                                        onClick={() => handleCopyGradient(gradient)}
                                        size="xs"
                                        variant="subtle"
                                    >
                                        {t('visualizer.copyConfiguration')}
                                    </Button>
                                    <Button
                                        onClick={() => handleEditGradient(index)}
                                        size="xs"
                                        variant="default"
                                    >
                                        {t('common.edit', { postProcess: 'titleCase' })}
                                    </Button>
                                    <Button
                                        onClick={() => handleDeleteGradient(index)}
                                        size="xs"
                                        variant="state-error"
                                    >
                                        {t('common.delete', { postProcess: 'titleCase' })}
                                    </Button>
                                </Group>
                            </Group>
                        ))}
                    </Stack>
                )}

                {!isAdding && !isPasting ? (
                    <Group>
                        <Button onClick={handleStartAdding} size="sm" variant="outline">
                            {t('visualizer.addCustomGradient')}
                        </Button>
                        <Button onClick={() => setIsPasting(true)} size="sm" variant="outline">
                            {t('visualizer.pasteGradient', { postProcess: 'titleCase' })}
                        </Button>
                    </Group>
                ) : isPasting ? (
                    <Stack>
                        <Textarea
                            autosize
                            label={t('visualizer.pasteGradient', { postProcess: 'titleCase' })}
                            maxRows={10}
                            minRows={5}
                            onChange={(e) => setPasteValue(e.currentTarget.value)}
                            placeholder={t('visualizer.pasteGradientPlaceholder')}
                            spellCheck={false}
                            value={pasteValue}
                        />
                        <Group>
                            <Button onClick={() => setIsPasting(false)} variant="subtle">
                                {t('common.cancel', { postProcess: 'titleCase' })}
                            </Button>
                            <Button
                                disabled={!pasteValue.trim()}
                                onClick={handlePasteGradient}
                                variant="filled"
                            >
                                {t('common.add', { postProcess: 'titleCase' })}
                            </Button>
                        </Group>
                    </Stack>
                ) : (
                    <>
                        <Divider />
                        <Stack gap="sm">
                            <TextInput
                                onChange={(e) =>
                                    setNewGradient({ ...newGradient, name: e.currentTarget.value })
                                }
                                placeholder={t('visualizer.gradientNamePlaceholder')}
                                size="sm"
                                value={newGradient.name}
                            />
                            <SegmentedControl
                                data={[
                                    { label: t('visualizer.vertical'), value: 'v' },
                                    { label: t('visualizer.horizontal'), value: 'h' },
                                ]}
                                onChange={(value) =>
                                    setNewGradient({
                                        ...newGradient,
                                        dir: value,
                                    })
                                }
                                size="sm"
                                value={newGradient.dir || 'v'}
                            />
                            <Stack gap="xl">
                                <Group justify="space-between">
                                    <Text>{t('visualizer.colorStops')}</Text>
                                    <Button
                                        onClick={handleAddColorStop}
                                        size="xs"
                                        variant="outline"
                                    >
                                        {t('visualizer.addColor')}
                                    </Button>
                                </Group>
                                {newGradient.colorStops.map((stop, index) => {
                                    return (
                                        <Group grow key={index}>
                                            <ColorInput
                                                format="hex"
                                                onChangeEnd={(color) =>
                                                    handleColorStopChange(index, color)
                                                }
                                                size="sm"
                                                value={stop.color}
                                            />
                                            <VisualizerSlider
                                                defaultValue={stop.pos}
                                                disabled={!stop.positionEnabled}
                                                label={
                                                    <Group
                                                        gap="xs"
                                                        style={{ alignItems: 'center' }}
                                                    >
                                                        <Checkbox
                                                            checked={stop.positionEnabled || false}
                                                            onChange={(e) =>
                                                                handleTogglePos(
                                                                    index,
                                                                    e.currentTarget.checked,
                                                                )
                                                            }
                                                            size="xs"
                                                        />
                                                        <Text fw={500} size="sm">
                                                            {t('visualizer.position')}
                                                        </Text>
                                                    </Group>
                                                }
                                                max={1}
                                                min={0}
                                                onChangeEnd={(e) =>
                                                    handleColorStopPosChange(index, e)
                                                }
                                                step={0.1}
                                            />
                                            <VisualizerSlider
                                                defaultValue={stop.level}
                                                disabled={!stop.levelEnabled}
                                                label={
                                                    <Group
                                                        gap="xs"
                                                        style={{ alignItems: 'center' }}
                                                    >
                                                        <Checkbox
                                                            checked={stop.levelEnabled || false}
                                                            onChange={(e) =>
                                                                handleToggleLevel(
                                                                    index,
                                                                    e.currentTarget.checked,
                                                                )
                                                            }
                                                            size="xs"
                                                        />
                                                        <Text fw={500} size="sm">
                                                            {t('visualizer.level')}
                                                        </Text>
                                                    </Group>
                                                }
                                                max={1}
                                                min={0}
                                                onChangeEnd={(e) =>
                                                    handleColorStopLevelChange(index, e)
                                                }
                                                step={0.1}
                                            />
                                            {newGradient.colorStops.length > 1 && (
                                                <Button
                                                    onClick={() => handleRemoveColorStop(index)}
                                                    size="xs"
                                                    variant="subtle"
                                                >
                                                    {t('visualizer.remove')}
                                                </Button>
                                            )}
                                        </Group>
                                    );
                                })}
                            </Stack>
                            <Group grow>
                                <Button onClick={handleCancel} size="sm" variant="subtle">
                                    {t('common.cancel', { postProcess: 'titleCase' })}
                                </Button>
                                <Button
                                    disabled={!newGradient.name.trim()}
                                    onClick={
                                        editingIndex !== null ? handleSaveEdit : handleAddGradient
                                    }
                                    size="sm"
                                    variant="filled"
                                >
                                    {editingIndex !== null
                                        ? t('common.save', { postProcess: 'titleCase' })
                                        : t('common.add', { postProcess: 'titleCase' })}
                                </Button>
                            </Group>
                        </Stack>
                    </>
                )}
            </Stack>
        </Fieldset>
    );
};
