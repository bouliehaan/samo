import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useState } from 'react';
import styles from './collapsible-command-group.module.css';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Paper } from '/@/shared/components/paper/paper';
export function CollapsibleCommandGroup({ children, defaultExpanded = true, expanded: controlledExpanded, heading, onToggle, subtitle, }) {
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
    const isControlled = controlledExpanded !== undefined && onToggle !== undefined;
    const expanded = isControlled ? controlledExpanded : internalExpanded;
    const toggle = useCallback(() => {
        if (isControlled) {
            onToggle?.();
        }
        else {
            setInternalExpanded((prev) => !prev);
        }
    }, [isControlled, onToggle]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
        }
    }, [toggle]);
    return (_jsxs("div", { className: styles.root, children: [_jsx(Paper, { p: "sm", radius: "sm", withBorder: true, children: _jsxs("div", { className: styles.heading, onClick: toggle, onKeyDown: handleKeyDown, role: "button", tabIndex: 0, children: [_jsx(Icon, { className: styles.chevron, icon: expanded ? 'dropdown' : 'arrowRightS' }), _jsxs(Group, { justify: "space-between", w: "100%", children: [_jsx("span", { children: heading }), subtitle && _jsx("span", { className: styles.subtitle, children: subtitle })] })] }) }), expanded && _jsx("div", { className: styles.items, children: children })] }));
}
