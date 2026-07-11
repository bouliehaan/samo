import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import {
    closeViewAll,
    getAppNavigation,
    popMediaDetail,
    setActiveUtilityScreen,
    setIsFullPlayerOpen,
    setIsSearchOverlayOpen,
    setSearchOverlayQuery,
} from '../state/app-navigation';

/**
 * Hardware back button routing. Registered once; reads navigation state at
 * press time from the module store, so it needs no subscriptions and never
 * re-registers.
 */
export const useAndroidBackHandling = (): void => {
    useEffect(() => {
        const handler = BackHandler.addEventListener('hardwareBackPress', () => {
            const state = getAppNavigation();

            if (state.isSearchOverlayOpen) {
                setIsSearchOverlayOpen(false);
                setSearchOverlayQuery('');
                return true;
            }

            if (state.isFullPlayerOpen) {
                setIsFullPlayerOpen(false);
                return true;
            }

            if (state.mediaDetailState.status !== 'idle') {
                popMediaDetail();
                return true;
            }

            if (
                state.activeUtilityScreen === 'add-server' ||
                state.activeUtilityScreen === 'downloads' ||
                state.activeUtilityScreen === 'manage-servers'
            ) {
                setActiveUtilityScreen('settings');
                return true;
            }

            if (state.activeUtilityScreen === 'view-all') {
                closeViewAll();
                return true;
            }

            if (state.activeUtilityScreen === 'settings') {
                setActiveUtilityScreen(null);
                return true;
            }

            return false;
        });

        return () => handler.remove();
    }, []);
};
