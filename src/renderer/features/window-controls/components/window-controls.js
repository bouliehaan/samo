import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import clsx from 'clsx';
import isElectron from 'is-electron';
import { useState } from 'react';
import { RiCheckboxBlankLine, RiCloseLine, RiSubtractLine } from 'react-icons/ri';
import styles from './window-controls.module.css';
const browser = isElectron() ? window.api.browser : null;
const close = () => browser?.exit();
const minimize = () => browser?.minimize();
const maximize = () => browser?.maximize();
const unmaximize = () => browser?.unmaximize();
export const WindowControls = () => {
    const [max, setMax] = useState(false);
    const handleMinimize = () => minimize();
    const handleMaximize = () => {
        if (max) {
            unmaximize();
        }
        else {
            maximize();
        }
        setMax(!max);
    };
    const handleClose = () => close();
    return (_jsx(_Fragment, { children: isElectron() && (_jsx(_Fragment, { children: _jsxs("div", { className: styles.windowsButtonGroup, children: [_jsx("div", { className: styles.windowsButton, onClick: handleMinimize, role: "button", children: _jsx(RiSubtractLine, { size: 19 }) }), _jsx("div", { className: styles.windowsButton, onClick: handleMaximize, role: "button", children: _jsx(RiCheckboxBlankLine, { size: 13 }) }), _jsx("div", { className: clsx(styles.windowsButton, styles.exitButton), onClick: handleClose, role: "button", children: _jsx(RiCloseLine, { size: 19 }) })] }) })) }));
};
