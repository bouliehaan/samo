import { TableProps as MantineTableProps } from '@mantine/core';
export interface TableProps extends MantineTableProps {
}
export declare const Table: {
    ({ classNames, ...props }: TableProps): import("react/jsx-runtime").JSX.Element;
    Thead: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").TableTheadProps;
        ref: HTMLTableSectionElement;
        stylesNames: "thead";
        compound: true;
    }>;
    Tr: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").TableTrProps;
        ref: HTMLTableRowElement;
        stylesNames: "tr";
        compound: true;
    }>;
    Td: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").TableTdProps;
        ref: HTMLTableCellElement;
        stylesNames: "td";
        compound: true;
    }>;
    Th: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").TableThProps;
        ref: HTMLTableCellElement;
        stylesNames: "th";
        compound: true;
    }>;
    Tbody: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").TableTbodyProps;
        ref: HTMLTableSectionElement;
        stylesNames: "tbody";
        compound: true;
    }>;
};
