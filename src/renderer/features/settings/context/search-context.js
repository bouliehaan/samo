import { createContext, useContext } from 'react';
export const SettingSearchContext = createContext('');
export const useSettingSearchContext = () => {
    const ctxValue = useContext(SettingSearchContext);
    return ctxValue;
};
