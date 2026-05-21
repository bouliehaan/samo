import { useMemo } from 'react';
import styles from './option.module.css';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Text } from '/@/shared/components/text/text';
const defaultClassNames = { root: styles.root };
export const Option = ({ children, classNames, ...props }) => {
    const mergedClassNames = useMemo(() => (classNames ? { ...defaultClassNames, ...classNames } : defaultClassNames), [classNames]);
    return (<Group classNames={mergedClassNames} grow {...props}>
            {children}
        </Group>);
};
Option.displayName = 'Option';
const Label = ({ children }) => {
    return <Text>{children}</Text>;
};
const Control = ({ children }) => {
    return <Flex justify="flex-end">{children}</Flex>;
};
Option.Label = Label;
Option.Control = Control;
