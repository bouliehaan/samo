import { ReactNode } from 'react';
interface CollapsibleCommandGroupProps {
    children: ReactNode;
    defaultExpanded?: boolean;
    expanded?: boolean;
    heading: string;
    onToggle?: () => void;
    subtitle?: ReactNode;
}
export declare function CollapsibleCommandGroup({ children, defaultExpanded, expanded: controlledExpanded, heading, onToggle, subtitle, }: CollapsibleCommandGroupProps): import("react/jsx-runtime").JSX.Element;
export {};
