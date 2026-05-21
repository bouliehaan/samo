import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { SettingsOptions } from '/@/renderer/features/settings/components/settings-option';
import { useSettingSearchContext } from '/@/renderer/features/settings/context/search-context';
import { Stack } from '/@/shared/components/stack/stack';
import { TextTitle } from '/@/shared/components/text-title/text-title';
export const SettingsSection = ({ extra, options, title }) => {
    const keyword = useSettingSearchContext();
    const hasKeyword = keyword !== '';
    const values = options.filter((o) => !o.isHidden && (!hasKeyword || o.title.toLocaleLowerCase().includes(keyword)));
    return (_jsxs(_Fragment, { children: [title && (_jsx(TextTitle, { fw: 600, order: 4, children: title })), _jsxs(Stack, { gap: "xl", px: "xl", children: [values.map((option) => (_jsx(SettingsOptions, { ...option }, `option-${option.title}`))), extra] })] }));
};
