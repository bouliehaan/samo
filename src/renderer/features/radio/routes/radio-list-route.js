import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ListContext } from '/@/renderer/context/list-context';
import { RadioListContent } from '/@/renderer/features/radio/components/radio-list-content';
import { RadioListHeader } from '/@/renderer/features/radio/components/radio-list-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { ItemListKey } from '/@/shared/types/types';
const RadioListRoute = () => {
    const pageKey = ItemListKey.RADIO;
    const [itemCount, setItemCount] = useState(undefined);
    const providerValue = useMemo(() => {
        return {
            id: undefined,
            itemCount,
            pageKey,
            setItemCount,
        };
    }, [itemCount, pageKey, setItemCount]);
    return (_jsx(AnimatedPage, { children: _jsxs(ListContext.Provider, { value: providerValue, children: [_jsx(RadioListHeader, {}), _jsx(RadioListContent, {})] }) }));
};
const RadioListRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(RadioListRoute, {}) }));
};
export default RadioListRouteWithBoundary;
