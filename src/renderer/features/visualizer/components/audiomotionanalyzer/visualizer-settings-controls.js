import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { getButterchurnPresetOptions } from '/@/renderer/features/visualizer/components/butternchurn/visualizer';
import { useSettingsStoreActions, useVisualizerSettings } from '/@/renderer/store/settings.store';
import { Button } from '/@/shared/components/button/button';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Select } from '/@/shared/components/select/select';
import { Slider } from '/@/shared/components/slider/slider';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
export const useUpdateAudioMotionAnalyzer = () => {
    const visualizer = useVisualizerSettings();
    const { setSettings } = useSettingsStoreActions();
    const updateProperty = (property, value) => {
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
    const updateProperty = (property, value) => {
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
let butterchurnPresetOptionsCache = null;
const loadButterchurnPresetOptions = async () => {
    if (butterchurnPresetOptionsCache)
        return butterchurnPresetOptionsCache;
    const mod = await import('butterchurn-presets');
    const presets = getButterchurnPresetOptions(mod.default ?? mod);
    butterchurnPresetOptionsCache = Object.keys(presets).map((presetName) => ({
        label: presetName,
        value: presetName,
    }));
    return butterchurnPresetOptionsCache;
};
export const useButterchurnPresetOptions = () => {
    const [options, setOptions] = useState(butterchurnPresetOptionsCache ?? []);
    useEffect(() => {
        if (butterchurnPresetOptionsCache)
            return;
        void loadButterchurnPresetOptions().then(setOptions);
    }, []);
    return options;
};
export const VisualizerSelect = (props) => {
    return (_jsx(Select, { searchable: true, styles: { label: { display: 'flex', justifyContent: 'center' } }, ...props }));
};
export const VisualizerSlider = (props) => {
    const { defaultValue, label, max, min, onChange, onChangeEnd, step, ...rest } = props;
    const sliderRef = useRef(null);
    const inputRef = useRef(null);
    const [value, setValue] = useState(defaultValue ?? 0);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(defaultValue ?? 0);
    useEffect(() => {
        if (defaultValue !== undefined) {
            setValue(defaultValue);
            setEditValue(defaultValue);
        }
    }, [defaultValue]);
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);
    const handleChange = (val) => {
        setValue(val);
        onChange?.(val);
    };
    const handleTextClick = () => {
        setEditValue(value);
        setIsEditing(true);
    };
    const handleInputChange = (val) => {
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
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyEditValue();
        }
        else if (e.key === 'Escape') {
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
    return (_jsxs(Stack, { gap: "sm", children: [label && (_jsx("div", { style: { display: 'flex', justifyContent: 'center' }, children: typeof label === 'string' ? (_jsx(Text, { fw: "500", size: "sm", ta: "center", children: label })) : (label) })), _jsx(Slider, { label: null, max: max, min: min, onChange: handleChange, onChangeEnd: onChangeEnd, ref: sliderRef, step: step, styles: {
                    root: { alignSelf: 'center', display: 'flex' },
                }, value: value, w: "100px", ...rest }), isEditing ? (_jsx(NumberInput, { max: max, min: min, onBlur: handleInputBlur, onChange: handleInputChange, onKeyDown: handleInputKeyDown, ref: inputRef, size: "xs", step: step, style: { alignSelf: 'center', width: '80px' }, styles: { input: { textAlign: 'center' } }, value: editValue })) : (_jsx(Text, { fw: "500", onClick: handleTextClick, size: "sm", style: { cursor: 'pointer', userSelect: 'none' }, ta: "center", children: value.toFixed(step && step < 1 ? 1 : 0) }))] }));
};
export const VisualizerToggle = (props) => {
    const { disabled, label, onChange, value } = props;
    return (_jsx(Button, { disabled: disabled, onClick: () => onChange(!value), variant: value ? 'filled' : 'default', children: label }));
};
