import { RowComponentProps } from 'react-window-v2';
export type VirtualMultiSelectOption<T> = T & {
    label: string;
    value: string;
};
interface VirtualMultiSelectProps<T> {
    disabled?: boolean;
    displayCountType?: 'album' | 'song';
    height: number;
    isLoading?: boolean;
    label?: React.ReactNode | string;
    onChange: (value: null | string[]) => void;
    options: VirtualMultiSelectOption<T>[];
    RowComponent: (props: RowComponentProps<{
        disabled?: boolean;
        displayCountType?: 'album' | 'song';
        focusedIndex: null | number;
        onToggle: (value: string) => void;
        options: VirtualMultiSelectOption<T>[];
        value: string[];
    }>) => React.ReactElement;
    singleSelect?: boolean;
    value: string[];
}
export declare function VirtualMultiSelect<T>({ disabled, displayCountType, height, isLoading, label, onChange, options, RowComponent, singleSelect, value, }: VirtualMultiSelectProps<T>): import("react/jsx-runtime").JSX.Element;
export {};
