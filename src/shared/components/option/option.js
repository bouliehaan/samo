import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import styles from './option.module.css';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Text } from '/@/shared/components/text/text';
const defaultClassNames = { root: styles.root };
export const Option = ({ children, classNames, ...props }) => {
    const mergedClassNames = useMemo(() => (classNames ? { ...defaultClassNames, ...classNames } : defaultClassNames), [classNames]);
    return (_jsx(Group, { classNames: mergedClassNames, grow: true, ...props, children: children }));
};
Option.displayName = 'Option';
const Label = ({ children }) => {
    return _jsx(Text, { children: children });
};
const Control = ({ children }) => {
    return _jsx(Flex, { justify: "flex-end", children: children });
};
Option.Label = Label;
Option.Control = Control;
