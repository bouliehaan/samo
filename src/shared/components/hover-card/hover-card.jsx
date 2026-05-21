import { HoverCard as MantineHoverCard, } from '@mantine/core';
import styles from './hover-card.module.css';
export const HoverCard = ({ children, classNames, ...props }) => {
    return (<MantineHoverCard classNames={{
            dropdown: styles.dropdown,
            ...classNames,
        }} {...props}>
            {children}
        </MantineHoverCard>);
};
HoverCard.Target = MantineHoverCard.Target;
HoverCard.Dropdown = MantineHoverCard.Dropdown;
