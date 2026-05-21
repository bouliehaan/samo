import { TabsProps as MantineTabsProps, TabsPanelProps } from '@mantine/core';
type TabsProps = MantineTabsProps;
export declare const Tabs: {
    ({ children, ...props }: TabsProps): import("react/jsx-runtime").JSX.Element;
    List: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").TabsListProps;
        ref: HTMLDivElement;
        stylesNames: import("@mantine/core").TabsListStylesNames;
        compound: true;
    }>;
    Panel: ({ children, ...props }: TabsPanelProps) => import("react/jsx-runtime").JSX.Element;
    Tab: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").TabsTabProps;
        ref: HTMLButtonElement;
        stylesNames: import("@mantine/core").TabsTabStylesNames;
        compound: true;
    }>;
};
export {};
