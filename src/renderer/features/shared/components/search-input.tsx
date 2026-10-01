import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shallow } from 'zustand/shallow';

import styles from './search-input.module.css';

import { useSettingsStore } from '/@/renderer/store';
import { ActionIcon, ActionIconProps } from '/@/shared/components/action-icon/action-icon';
import { Icon } from '/@/shared/components/icon/icon';
import { TextInput, TextInputProps } from '/@/shared/components/text-input/text-input';
import { useHotkeys } from '/@/shared/hooks/use-hotkeys';

interface SearchInputProps extends TextInputProps {
    buttonProps?: Partial<ActionIconProps>;
    enableHotkey?: boolean;
    fillContainer?: boolean;
    inputProps?: Partial<TextInputProps>;
    value?: string;
}

export const SearchInput = ({
    buttonProps,
    defaultValue,
    enableHotkey = true,
    fillContainer = false,
    inputProps,
    onChange,
    value,
    ...props
}: SearchInputProps) => {
    const { t } = useTranslation();
    const ref = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const binding = useSettingsStore((state) => state.hotkeys.bindings.localSearch, shallow);
    const [isInputMode, setIsInputMode] = useState(false);
    const [localValue, setLocalValue] = useState(String(defaultValue ?? ''));
    const searchValue = value ?? localValue;
    const expanded = isInputMode || Boolean(searchValue);
    const searchLabel = t('common.search', { postProcess: 'sentenceCase' });

    useEffect(() => {
        if (isInputMode) ref.current?.focus();
    }, [isInputMode]);

    useEffect(() => {
        if (!defaultValue && value === undefined) setLocalValue('');
    }, [defaultValue, value]);

    useHotkeys([
        [
            binding.hotkey,
            () => {
                if (enableHotkey) {
                    setIsInputMode(true);
                    ref.current?.focus();
                    ref.current?.select();
                }
            },
        ],
    ]);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setLocalValue(event.target.value);
        onChange?.(event);
    };

    const clear = () => {
        setLocalValue('');
        onChange?.({ target: { value: '' } } as ChangeEvent<HTMLInputElement>);
    };

    const handleEscape = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            clear();
            setIsInputMode(false);
            buttonRef.current?.focus();
        }
    };

    return (
        <div
            className={styles.container}
            data-expanded={expanded || undefined}
            data-fill={fillContainer || undefined}
        >
            <div className={styles.inputContainer} hidden={!expanded}>
                <TextInput
                    aria-label={searchLabel}
                    classNames={{ input: styles.input }}
                    leftSection={<Icon icon="search" size="sm" />}
                    placeholder={searchLabel}
                    {...inputProps}
                    {...props}
                    onBlur={() => setIsInputMode(false)}
                    onChange={handleChange}
                    onFocus={() => setIsInputMode(true)}
                    onKeyDown={handleEscape}
                    ref={ref}
                    rightSection={
                        searchValue ? (
                            <ActionIcon
                                icon="x"
                                onClick={() => {
                                    clear();
                                    ref.current?.focus();
                                }}
                                size="compact-xs"
                                tooltip={{
                                    label: t('common.clear', { postProcess: 'sentenceCase' }),
                                }}
                                variant="transparent"
                            />
                        ) : null
                    }
                    size="sm"
                    value={searchValue}
                />
            </div>
            <ActionIcon
                {...buttonProps}
                aria-hidden={expanded}
                className={styles.trigger}
                data-hidden={expanded || undefined}
                icon="search"
                iconProps={{ size: 'lg' }}
                onClick={() => setIsInputMode(true)}
                ref={buttonRef}
                tabIndex={expanded ? -1 : 0}
                tooltip={{ label: searchLabel }}
                variant="toolbar"
            />
        </div>
    );
};
