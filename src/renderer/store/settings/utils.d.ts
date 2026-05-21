export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export declare const deepMergeIntoState: <T extends Record<string, unknown>>(state: T, updates: DeepPartial<T>) => void;
