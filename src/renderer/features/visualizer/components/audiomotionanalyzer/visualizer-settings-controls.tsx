import { useEffect, useRef, useState } from 'react';

import { getButterchurnPresetOptions } from '/@/renderer/features/visualizer/components/butternchurn/visualizer';
import { useSettingsStoreActions, useVisualizerSettings } from '/@/renderer/store/settings.store';
import { Button } from '/@/shared/components/button/button';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Select, SelectProps } from '/@/shared/components/select/select';
import { Slider, SliderProps } from '/@/shared/components/slider/slider';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

export const useUpdateAudioMotionAnalyzer = () => {
    const visualizer = useVisualizerSettings();
    const { setSettings } = useSettingsStoreActions();

    const updateProperty = <K extends keyof typeof visualizer.audiomotionanalyzer>(
        property: K,
        value: (typeof visualizer.audiomotionanalyzer)[K],
    ) => {
        setSettings({
            visualizer: {
                audiomotionanalyzer: {
                    [property]: value,
                },
            },
        });
    };

    return { updateProperty, visualizer };
};

export const useUpdateButterchurn = () => {
    const visualizer = useVisualizerSettings();
    const { setSettings } = useSettingsStoreActions();

    const updateProperty = <K extends keyof typeof visualizer.butterchurn>(
        property: K,
        value: (typeof visualizer.butterchurn)[K],
    ) => {
        setSettings({
            visualizer: {
                butterchurn: {
                    [property]: value,
                },
            },
        });
    };

    return { updateProperty, visualizer };
};

type ButterchurnPresetOption = { label: string; value: string };

let butterchurnPresetOptionsCache: ButterchurnPresetOption[] | null = null;

const loadButterchurnPresetOptions = async (): Promise<ButterchurnPresetOption[]> => {
    if (butterchurnPresetOptionsCache) return butterchurnPresetOptionsCache;

    const mod = await import('butterchurn-presets');
    const presets = getButterchurnPresetOptions(
        (mod as { default?: Record<string, string> }).default ?? (mod as Record<string, string>),
    );
    butterchurnPresetOptionsCache = Object.keys(presets).map((presetName) => ({
        label: presetName,
        value: presetName,
    }));

    return butterchurnPresetOptionsCache;
};

export const useButterchurnPresetOptions = () => {
    const [options, setOptions] = useState<ButterchurnPresetOption[]>(
        butterchurnPresetOptionsCache ?? [],
    );

    useEffect(() => {
        if (butterchurnPresetOptionsCache) return;
        void loadButterchurnPresetOptions().then(setOptions);
    }, []);

    return options;
};

export const VisualizerSelect = (props: SelectProps) => {
    return (
        <Select
            searchable
            styles={{ label: { display: 'flex', justifyContent: 'center' } }}
            {...props}
        />
    );
};

export const VisualizerSlider = (props: SliderProps & { label?: React.ReactNode }) => {
    const { defaultValue, label, max, min, onChange, onChangeEnd, step, ...rest } = props;

    const sliderRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState<number>((defaultValue as number) ?? 0);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState<number>((defaultValue as number) ?? 0);

    useEffect(() => {
        if (defaultValue !== undefined) {
            setValue(defaultValue as number);
            setEditValue(defaultValue as number);
        }
    }, [defaultValue]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleChange = (val: number) => {
        setValue(val);
        onChange?.(val);
    };

    const handleTextClick = () => {
        setEditValue(value);
        setIsEditing(true);
    };

    const handleInputChange = (val: number | string) => {
        const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
        setEditValue(numVal);

        let clampedValue = numVal;
        if (min !== undefined && clampedValue < min) {
            clampedValue = min;
        }
        if (max !== undefined && clampedValue > max) {
            clampedValue = max;
        }
        setValue(clampedValue);
        onChange?.(clampedValue);
    };

    const handleInputBlur = () => {
        applyEditValue();
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyEditValue();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(value);
        }
    };

    const applyEditValue = () => {
        let finalValue = editValue;

        if (min !== undefined && finalValue < min) {
            finalValue = min;
        }
        if (max !== undefined && finalValue > max) {
            finalValue = max;
        }

        setValue(finalValue);
        setEditValue(finalValue);
        setIsEditing(false);

        onChange?.(finalValue);
        onChangeEnd?.(finalValue);
    };

    return (
        <Stack gap="sm">
            {label && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {typeof label === 'string' ? (
                        <Text fw="500" size="sm" ta="center">
                            {label}
                        </Text>
                    ) : (
                        label
                    )}
                </div>
            )}
            <Slider
                label={null}
                max={max}
                min={min}
                onChange={handleChange}
                onChangeEnd={onChangeEnd}
                ref={sliderRef}
                step={step}
                styles={{
                    root: { alignSelf: 'center', display: 'flex' },
                }}
                value={value}
                w="100px"
                {...rest}
            />
            {isEditing ? (
                <NumberInput
                    max={max}
                    min={min}
                    onBlur={handleInputBlur}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    ref={inputRef}
                    size="xs"
                    step={step}
                    style={{ alignSelf: 'center', width: '80px' }}
                    styles={{ input: { textAlign: 'center' } }}
                    value={editValue}
                />
            ) : (
                <Text
                    fw="500"
                    onClick={handleTextClick}
                    size="sm"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    ta="center"
                >
                    {value.toFixed(step && step < 1 ? 1 : 0)}
                </Text>
            )}
        </Stack>
    );
};

export const VisualizerToggle = (props: {
    disabled?: boolean;
    label: string;
    onChange: (value: boolean) => void;
    value: boolean;
}) => {
    const { disabled, label, onChange, value } = props;

    return (
        <Button
            disabled={disabled}
            onClick={() => onChange(!value)}
            variant={value ? 'filled' : 'default'}
        >
            {label}
        </Button>
    );
};
