import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useNavigate } from 'react-router';
import styles from './action-bar.module.css';
import { AppMenu } from '/@/renderer/features/titlebar/components/app-menu';
import { Button } from '/@/shared/components/button/button';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
export const ActionBar = () => {
    return (_jsx("div", { className: styles.container, children: _jsxs(Group, { gap: "sm", grow: true, px: "md", w: "100%", wrap: "nowrap", children: [_jsxs(DropdownMenu, { position: "bottom-start", children: [_jsx(DropdownMenu.Target, { children: _jsx(Button, { p: "0" }) }), _jsx(DropdownMenu.Dropdown, { children: _jsx(AppMenu, {}) })] }), _jsx(NavigateButtons, {})] }) }));
};
const NavigateButtons = () => {
    const navigate = useNavigate();
    return (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: () => navigate(-1), p: "0", children: _jsx(Icon, { icon: "arrowLeftS", size: "lg" }) }), _jsx(Button, { onClick: () => navigate(1), p: "0", children: _jsx(Icon, { icon: "arrowRightS", size: "lg" }) })] }));
};
