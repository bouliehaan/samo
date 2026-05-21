import type { SettingsState } from './schemas';
export declare const createSettingsMigrate: (initialState: SettingsState) => (persistedState: unknown, version: number) => unknown;
