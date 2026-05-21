import { createContext, useContext } from 'react';
export const ListContext = createContext({
    pageKey: '',
});
export const useListContext = () => {
    const ctxValue = useContext(ListContext);
    return ctxValue;
};
