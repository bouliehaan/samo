import { jsx as _jsx } from "react/jsx-runtime";
import { useLocation } from 'react-router';
import { SearchInput } from '/@/renderer/features/shared/components/search-input';
import { useSearchTermFilter } from '/@/renderer/features/shared/hooks/use-search-term-filter';
function navigationIdFromState(state) {
    if (state && typeof state === 'object' && 'navigationId' in state) {
        const id = state.navigationId;
        return typeof id === 'string' ? id : undefined;
    }
    return undefined;
}
export const ListSearchInput = () => {
    const { searchTerm, setSearchTerm } = useSearchTermFilter();
    const { state } = useLocation();
    const navigationId = navigationIdFromState(state);
    return (_jsx(SearchInput, { defaultValue: searchTerm, onChange: (e) => setSearchTerm(e.target.value || null) }, navigationId ?? 'list-search-input'));
};
