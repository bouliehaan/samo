import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
export const ActionRequiredContainer = ({ children, title }) => (_jsxs(Stack, { style: { cursor: 'default', maxWidth: '700px' }, children: [_jsx(Group, { children: _jsx(Text, { size: "xl", style: { textTransform: 'uppercase' }, children: title }) }), _jsx(Stack, { children: children })] }));
