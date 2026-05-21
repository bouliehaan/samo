import type { DateInputProps as MantineDateInputProps, DateTimePickerProps as MantineDateTimeInputProps } from '@mantine/dates';
interface DateInputProps extends MantineDateInputProps {
    maxWidth?: number | string;
    width?: number | string;
}
export declare const DateInput: ({ classNames, maxWidth, size, style, width, ...props }: DateInputProps) => import("react/jsx-runtime").JSX.Element;
interface DateTimeInputProps extends MantineDateTimeInputProps {
    maxWidth?: number | string;
    width?: number | string;
}
export declare const DateTimeInput: ({ classNames, maxWidth, size, style, width, ...props }: DateTimeInputProps) => import("react/jsx-runtime").JSX.Element;
export {};
