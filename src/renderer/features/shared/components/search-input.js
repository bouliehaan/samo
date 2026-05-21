import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState, } from 'react';
import { shallow } from 'zustand/shallow';
import { useSettingsStore } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Box } from '/@/shared/components/box/box';
import { Icon } from '/@/shared/components/icon/icon';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { useHotkeys } from '/@/shared/hooks/use-hotkeys';
export const SearchInput = ({ buttonProps, enableHotkey = true, fillContainer = false, inputProps, onChange, ...props }) => {
    const ref = useRef(null);
    const binding = useSettingsStore((state) => state.hotkeys.bindings.localSearch, shallow);
    const [isInputMode, setIsInputMode] = useState(false);
    useHotkeys([
        [
            binding.hotkey,
            () => {
                if (enableHotkey) {
                    setIsInputMode(true);
                    ref?.current?.focus();
                    ref?.current?.select();
                }
            },
        ],
    ]);
    const handleEscape = (e) => {
        if (e.code === 'Escape') {
            onChange?.({ target: { value: '' } });
            if (ref.current) {
                ref.current.value = '';
                ref.current.blur();
            }
            setIsInputMode(false);
        }
    };
    const handleClear = () => {
        if (ref.current) {
            ref.current.value = '';
            ref.current.focus();
            onChange?.({ target: { value: '' } });
        }
    };
    const timeoutRef = useRef(null);
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    const handleButtonClick = () => {
        setIsInputMode(true);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            ref?.current?.focus();
            timeoutRef.current = null;
        }, 0);
    };
    const handleBlur = () => {
        const hasValue = props.value || ref.current?.value;
        if (!hasValue) {
            setIsInputMode(false);
        }
    };
    const hasValue = props.value || ref.current?.value;
    const shouldShowInput = isInputMode || hasValue;
    const shouldExpand = isInputMode || hasValue;
    const containerStyle = useMemo(() => ({
        display: 'inline-flex',
        overflow: 'hidden',
        position: 'relative',
        transition: 'width 0.3s ease-in-out',
        ...(fillContainer
            ? {
                flex: '1 1 0',
                minWidth: 0,
                width: shouldExpand ? '100%' : '36px',
            }
            : {
                width: shouldExpand ? '200px' : '36px',
            }),
    }), [fillContainer, shouldExpand]);
    const buttonStyle = useMemo(() => ({
        left: 0,
        opacity: shouldShowInput ? 0 : 1,
        pointerEvents: shouldShowInput ? 'none' : 'auto',
        position: 'absolute',
        top: 0,
        transition: 'opacity 0.2s ease-in-out',
        zIndex: 10,
    }), [shouldShowInput]);
    const inputStyle = useMemo(() => ({
        opacity: shouldShowInput ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
        width: '100%',
    }), [shouldShowInput]);
    return (_jsxs(Box, { style: containerStyle, children: [_jsx(TextInput, { leftSection: _jsx(Icon, { icon: "search" }), maw: fillContainer ? '100%' : '20dvw', ...inputProps, onBlur: handleBlur, onChange: onChange, onFocus: () => setIsInputMode(true), onKeyDown: handleEscape, ref: ref, size: "sm", style: inputStyle, ...props, rightSection: ref.current?.value ? (_jsx(ActionIcon, { icon: "x", onClick: handleClear, variant: "transparent" })) : null }), _jsx(ActionIcon, { ...buttonProps, icon: "search", iconProps: { size: 'lg' }, onClick: handleButtonClick, style: buttonStyle, tooltip: { label: 'Search' }, variant: "subtle" })] }));
};
