import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group } from '@mantine/core';
import { Link } from 'react-router';
import styles from './home-sections.module.css';
import { Button } from '/@/shared/components/button/button';
import { TextTitle } from '/@/shared/components/text-title/text-title';
export const HomeSectionTitle = ({ title, to }) => (_jsxs(Group, { className: styles.sectionTitle, gap: "xs", justify: "space-between", w: "100%", children: [_jsx(TextTitle, { fw: 700, isNoSelect: true, order: 3, children: title }), to ? (_jsx(Button, { component: Link, size: "compact-sm", to: to, variant: "subtle", children: "View all" })) : null] }));
