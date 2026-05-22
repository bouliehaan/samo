import isElectron from 'is-electron';
import React, { useCallback, useEffect } from 'react';

import { usePlayerStatus, useSettingsStore, useWindowSettings } from '/@/renderer/store';
import { PlayerStatus } from '/@/shared/types/types';
import { logFn } from '/@/shared/utils/logger';

const ipc = isElectron() ? window.api.ipc : null;

export const usePowerSaveBlocker = () => {
    const status = usePlayerStatus();
    const { preventSleepOnPlayback } = useWindowSettings();

    const startPowerSaveBlocker = useCallback(async () => {
        if (!ipc) return;

        try {
            await ipc.invoke('power-save-blocker-start');
        } catch (error) {
            logFn.error('Failed to start power save blocker', { meta: { error: error } });
        }
    }, []);

    const stopPowerSaveBlocker = useCallback(async () => {
        if (!ipc) return;

        try {
            await ipc.invoke('power-save-blocker-stop');
        } catch (error) {
            logFn.error('Failed to stop power save blocker', { meta: { error: error } });
        }
    }, []);

    useEffect(() => {
        if (!preventSleepOnPlayback) return;

        if (status === PlayerStatus.PLAYING) {
            startPowerSaveBlocker();
        } else {
            stopPowerSaveBlocker();
        }
    }, [status, preventSleepOnPlayback, startPowerSaveBlocker, stopPowerSaveBlocker]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            stopPowerSaveBlocker();
        };
    }, [stopPowerSaveBlocker]);
};

const PowerSaveBlockerHookInner = () => {
    usePowerSaveBlocker();
    return null;
};

export const PowerSaveBlockerHook = () => {
    const isElectronEnv = isElectron();
    const preventSleepOnPlayback = useSettingsStore((state) => state.window.preventSleepOnPlayback);

    if (!isElectronEnv || !preventSleepOnPlayback) {
        return null;
    }

    return React.createElement(PowerSaveBlockerHookInner);
};
