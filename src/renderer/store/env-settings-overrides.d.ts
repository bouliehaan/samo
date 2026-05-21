import type { SettingsState } from './settings.store';
export type EnvSettingsOverrides = DeepPartial<Pick<SettingsState, 'autoDJ' | 'css' | 'discord' | 'font' | 'general' | 'lyrics' | 'playback'>>;
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export declare function getEnvSettingsOverrides(): EnvSettingsOverrides;
export {};
