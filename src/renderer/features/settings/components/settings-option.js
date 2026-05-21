import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { memo } from 'react';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
export const SettingsOptions = memo(({ control, description, note, title }) => {
    return (_jsx(_Fragment, { children: _jsxs(Group, { justify: "space-between", style: { alignItems: 'center' }, wrap: "nowrap", children: [_jsxs(Stack, { gap: "xs", style: {
                        alignSelf: 'flex-start',
                        display: 'flex',
                        maxWidth: '50%',
                    }, children: [_jsxs(Group, { children: [_jsx(Text, { isNoSelect: true, size: "md", children: title }), note && (_jsx(Tooltip, { label: note, openDelay: 0, children: _jsx(Icon, { icon: "info" }) }))] }), React.isValidElement(description) ? (description) : (_jsx(Text, { isMuted: true, isNoSelect: true, size: "sm", children: description }))] }), _jsx(Group, { justify: "flex-end", children: control })] }) }));
});
