import { Table as MantineTable } from '@mantine/core';
import styles from './table.module.css';
export const Table = ({ classNames, ...props }) => {
    return (<MantineTable classNames={{
            td: styles.td,
            th: styles.th,
            ...classNames,
        }} {...props}/>);
};
Table.Thead = MantineTable.Thead;
Table.Tr = MantineTable.Tr;
Table.Td = MantineTable.Td;
Table.Th = MantineTable.Th;
Table.Tbody = MantineTable.Tbody;
