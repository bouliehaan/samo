import type { StoreApi, UseBoundStore } from 'zustand';
type WithSelectors<S> = S extends {
    getState: () => infer T;
} ? S & {
    use: {
        [K in keyof T]: () => T[K];
    };
} : never;
export declare const createSelectors: <S extends UseBoundStore<StoreApi<object>>>(_store: S) => WithSelectors<S>;
export {};
