import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Tabs as MantineTabs } from '@mantine/core';
import { Suspense } from 'react';
import styles from './tabs.module.css';
export const Tabs = ({ children, ...props }) => {
    return (_jsx(MantineTabs, { classNames: {
            list: styles.list,
            panel: styles.panel,
            root: styles.root,
            tab: styles.tab,
        }, ...props, children: children }));
};
const Panel = ({ children, ...props }) => {
    return (_jsx(MantineTabs.Panel, { ...props, children: _jsx(Suspense, { fallback: _jsx(_Fragment, {}), children: children }) }));
};
Tabs.List = MantineTabs.List;
Tabs.Panel = Panel;
Tabs.Tab = MantineTabs.Tab;
