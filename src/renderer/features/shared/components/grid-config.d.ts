import { ItemListKey } from '/@/shared/types/types';
type GridConfigProps = {
    extraOptions?: {
        component: React.ReactNode;
        id: string;
        label: string;
    }[];
    gridRowsData: {
        label: string;
        value: string;
    }[];
    listKey: ItemListKey;
    optionsConfig?: {
        [key: string]: {
            disabled?: boolean;
            hidden?: boolean;
        };
    };
};
export declare const GridConfig: ({ extraOptions, gridRowsData, listKey, optionsConfig, }: GridConfigProps) => import("react/jsx-runtime").JSX.Element;
export {};
