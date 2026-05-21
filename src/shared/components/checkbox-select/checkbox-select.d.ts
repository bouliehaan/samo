interface CheckboxSelectProps {
    data: {
        label: string;
        value: string;
    }[];
    enableDrag?: boolean;
    onChange: (value: string[]) => void;
    value: string[];
}
export declare const CheckboxSelect: ({ data, enableDrag, onChange, value }: CheckboxSelectProps) => import("react/jsx-runtime").JSX.Element;
export {};
