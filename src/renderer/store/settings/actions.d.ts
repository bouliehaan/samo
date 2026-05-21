import type { SettingsSlice } from './schemas';
type SettingsSetter = (fn: (state: SettingsSlice) => void, replace?: false, action?: string) => void;
export declare const createSettingsActions: (set: SettingsSetter) => SettingsSlice["actions"];
export {};
