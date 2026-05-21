import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import styles from './titlebar.module.css';
import { WindowControls } from '/@/renderer/features/window-controls/components/window-controls';
import { Group } from '/@/shared/components/group/group';
export const Titlebar = ({ children }) => {
    return (_jsx(_Fragment, { children: _jsx("div", { className: styles.titlebarContainer, children: _jsxs("div", { className: styles.right, children: [children, _jsx(Group, { gap: "xs", children: _jsx(WindowControls, {}) })] }) }) }));
};
