import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router';
import styles from './auth-layout.module.css';
import { Titlebar } from '/@/renderer/features/titlebar/components/titlebar';
export const AuthLayout = () => {
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.windowTitlebarContainer, children: _jsx(Titlebar, {}) }), _jsx("div", { className: styles.contentContainer, children: _jsx(Outlet, {}) })] }));
};
