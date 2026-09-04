import { SAMO_MOBILE_TABS, type SamoMobileTabId } from '@samo/core/navigation';

export const getTabTitle = (activeTab: SamoMobileTabId) => {
    return SAMO_MOBILE_TABS.find((tab) => tab.id === activeTab)?.label ?? 'samo';
};
