import type { DateTimePickerProps as MantineDateTimePickerProps } from '@mantine/dates';
interface DateTimePickerProps extends MantineDateTimePickerProps {
    maxWidth?: number | string;
    width?: number | string;
}
export declare const DateTimePicker: ({ classNames, maxWidth, popoverProps, size, style, width, ...props }: DateTimePickerProps) => import("react/jsx-runtime").JSX.Element;
export {};
