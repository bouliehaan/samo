import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useListContext } from '/@/renderer/context/list-context';
import { RadioListHeaderFilters } from '/@/renderer/features/radio/components/radio-list-header-filters';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
export const RadioListHeader = ({ title }) => {
    const { t } = useTranslation();
    const { itemCount } = useListContext();
    const pageTitle = title || t('page.radioList.title', { postProcess: 'titleCase' });
    return (_jsxs(Stack, { gap: 0, children: [_jsxs(PageHeader, { children: [_jsxs(LibraryHeaderBar, { ignoreMaxWidth: true, children: [_jsx(LibraryHeaderBar.Title, { children: pageTitle }), _jsx(LibraryHeaderBar.Badge, { isLoading: itemCount === undefined, children: itemCount })] }), _jsx(Group, { children: _jsx(ListSearchInput, {}) })] }), _jsx(FilterBar, { children: _jsx(RadioListHeaderFilters, {}) })] }));
};
