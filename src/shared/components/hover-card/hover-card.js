import { jsx as _jsx } from "react/jsx-runtime";
import { HoverCard as MantineHoverCard, } from '@mantine/core';
import styles from './hover-card.module.css';
export const HoverCard = ({ children, classNames, ...props }) => {
    return (_jsx(MantineHoverCard, { classNames: {
            dropdown: styles.dropdown,
            ...classNames,
        }, ...props, children: children }));
};
HoverCard.Target = MantineHoverCard.Target;
HoverCard.Dropdown = MantineHoverCard.Dropdown;
