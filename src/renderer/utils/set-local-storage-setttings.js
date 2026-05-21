export const setLocalStorageSettings = (type, object) => {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    const newSettings = {
        ...settings,
        [type]: { ...object },
    };
    localStorage.setItem('settings', JSON.stringify(newSettings));
};
