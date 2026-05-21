import { jsx as _jsx } from "react/jsx-runtime";
import { useIsDark, useToggleDark } from '/@/remote/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Icon } from '/@/shared/components/icon/icon';
export const ThemeButton = () => {
    const isDark = useIsDark();
    const toggleDark = useToggleDark();
    const handleToggleTheme = () => {
        toggleDark();
    };
    return (_jsx(ActionIcon, { onClick: handleToggleTheme, tooltip: {
            label: 'Toggle Theme',
        }, variant: "default", children: isDark ? _jsx(Icon, { icon: "themeLight", size: 30 }) : _jsx(Icon, { icon: "themeDark", size: 30 }) }));
};
