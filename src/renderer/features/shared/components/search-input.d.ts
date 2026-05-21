import { ActionIconProps } from '/@/shared/components/action-icon/action-icon';
import { TextInputProps } from '/@/shared/components/text-input/text-input';
interface SearchInputProps extends TextInputProps {
    buttonProps?: Partial<ActionIconProps>;
    enableHotkey?: boolean;
    fillContainer?: boolean;
    inputProps?: Partial<TextInputProps>;
    value?: string;
}
export declare const SearchInput: ({ buttonProps, enableHotkey, fillContainer, inputProps, onChange, ...props }: SearchInputProps) => import("react/jsx-runtime").JSX.Element;
export {};
