import { ItemListKey } from '/@/shared/types/types';
interface TableConfigProps {
    enablePinColumnButtons?: boolean;
    extraOptions?: {
        component: React.ReactNode;
        id: string;
        label: string;
    }[];
    listKey: ItemListKey;
    optionsConfig?: {
        [key: string]: {
            disabled?: boolean;
            hidden?: boolean;
        };
    };
    tableColumnsData: {
        label: string;
        value: string;
    }[];
    tableKey?: 'detail' | 'main';
}
export declare const TableConfig: ({ enablePinColumnButtons, extraOptions, listKey, optionsConfig, tableColumnsData, tableKey, }: TableConfigProps) => import("react/jsx-runtime").JSX.Element;
export {};
