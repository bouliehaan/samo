import { ReactNode } from 'react';
import { ActionIconProps } from '/@/shared/components/action-icon/action-icon';
import { ItemListKey, ListDisplayType } from '/@/shared/types/types';
export declare const SONG_DISPLAY_TYPES: ListConfigMenuDisplayTypeConfig[];
export declare const ListConfigBooleanControl: ({ onChange, value, }: {
    onChange: (value: boolean) => void;
    value: boolean;
}) => import("react/jsx-runtime").JSX.Element;
export interface ListConfigMenuDetailConfig {
    optionsConfig?: ListConfigMenuOptionsConfig['detail'];
    tableColumnsData: {
        label: string;
        value: string;
    }[];
    tableKey: 'detail';
}
export interface ListConfigMenuDisplayTypeConfig {
    disabled?: boolean;
    hidden?: boolean;
    value: ListDisplayType;
}
export interface ListConfigMenuOptionConfig {
    disabled?: boolean;
    hidden?: boolean;
}
export interface ListConfigMenuOptionsConfig {
    detail?: {
        [key: string]: ListConfigMenuOptionConfig;
    };
    grid?: {
        [key: string]: ListConfigMenuOptionConfig;
    };
    table?: {
        [key: string]: ListConfigMenuOptionConfig;
    };
}
interface ListConfigMenuProps {
    buttonProps?: ActionIconProps;
    detailConfig?: ListConfigMenuDetailConfig;
    displayTypes?: ListConfigMenuDisplayTypeConfig[];
    listKey: ItemListKey;
    optionsConfig?: ListConfigMenuOptionsConfig;
    tableColumnsData: {
        label: string;
        value: string;
    }[];
}
export declare const ListConfigMenu: (props: ListConfigMenuProps) => import("react/jsx-runtime").JSX.Element;
export declare const ListConfigTable: ({ options, }: {
    options: {
        component: ReactNode;
        id: string;
        isDivider?: boolean;
        label: ReactNode | string;
    }[];
}) => import("react/jsx-runtime").JSX.Element;
export {};
