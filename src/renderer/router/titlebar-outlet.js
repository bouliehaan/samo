import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router';
import styles from './titlebar-outlet.module.css';
import { Titlebar } from '/@/renderer/features/titlebar/components/titlebar';
import { useWindowBarStyle } from '/@/renderer/store/settings.store';
import { Platform } from '/@/shared/types/types';
export const TitlebarOutlet = () => {
    const windowBarStyle = useWindowBarStyle();
    return (_jsxs(_Fragment, { children: [windowBarStyle === Platform.WEB && (_jsx("header", { className: styles.container, children: _jsx(Titlebar, {}) })), _jsx(Outlet, {})] }));
};
