import { AccordionProps as MantineAccordionProps } from '@mantine/core';
export interface AccordionProps extends Omit<MantineAccordionProps, 'defaultValue' | 'multiple' | 'onChange'> {
    defaultValue?: string | string[];
    multiple?: boolean;
    onChange?: (value: null | string | string[]) => void;
}
export declare const Accordion: {
    ({ children, classNames, ...props }: AccordionProps): import("react/jsx-runtime").JSX.Element;
    Control: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").AccordionControlProps;
        ref: HTMLButtonElement;
        stylesNames: import("node_modules/@mantine/core/lib/components/Accordion/AccordionControl/AccordionControl").AccordionControlStylesNames;
        compound: true;
    }>;
    Item: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").AccordionItemProps;
        ref: HTMLDivElement;
        stylesNames: import("node_modules/@mantine/core/lib/components/Accordion/AccordionItem/AccordionItem").AccordionItemStylesNames;
        compound: true;
    }>;
    Panel: import("@mantine/core").MantineComponent<{
        props: import("@mantine/core").AccordionPanelProps;
        ref: HTMLDivElement;
        stylesNames: import("node_modules/@mantine/core/lib/components/Accordion/AccordionPanel/AccordionPanel").AccordionPanelStylesNames;
        compound: true;
    }>;
};
