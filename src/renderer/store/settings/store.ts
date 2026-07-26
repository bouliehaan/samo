import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createWithEqualityFn } from 'zustand/traditional';

import type { SettingsSlice } from './schemas';

import { createSettingsActions } from './actions';
import { initialState, initialStateWithEnv } from './defaults';
import { createSettingsMigrate } from './migrate';

import { mergeOverridingColumns } from '/@/renderer/store/utils';

export const SETTINGS_STORE_VERSION = 37;

export const useSettingsStore = createWithEqualityFn<SettingsSlice>()(
    persist(
        devtools(
            subscribeWithSelector(
                immer((set) => ({
                    actions: createSettingsActions(set),
                    ...initialStateWithEnv,
                })),
            ),
            { name: 'store_settings' },
        ),
        {
            merge: mergeOverridingColumns,
            migrate: createSettingsMigrate(initialState),
            name: 'store_settings',
            version: SETTINGS_STORE_VERSION,
        },
    ),
);
