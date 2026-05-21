import { Accordion as MantineAccordion, } from '@mantine/core';
import styles from './accordion.module.css';
import { Icon } from '/@/shared/components/icon/icon';
export const Accordion = ({ children, classNames, ...props }) => {
    return (<MantineAccordion chevron={<Icon icon="arrowUpS" size="lg"/>} classNames={{
            chevron: styles.chevron,
            control: styles.control,
            panel: styles.panel,
            ...classNames,
        }} {...props}>
            {children}
        </MantineAccordion>);
};
Accordion.Control = MantineAccordion.Control;
Accordion.Item = MantineAccordion.Item;
Accordion.Panel = MantineAccordion.Panel;
