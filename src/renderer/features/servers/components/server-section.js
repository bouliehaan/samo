import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Fragment } from 'react';
import { Text } from '/@/shared/components/text/text';
export const ServerSection = ({ children, title }) => {
    return (_jsxs(Fragment, { children: [React.isValidElement(title) ? title : _jsx(Text, { children: title }), _jsx("div", { style: { padding: '1rem' }, children: children })] }));
};
