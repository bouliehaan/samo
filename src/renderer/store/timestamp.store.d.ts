interface TimestampState {
    setTimestamp: (timestamp: number) => void;
    timestamp: number;
}
export declare const useTimestampStoreBase: import("zustand/traditional").UseBoundStoreWithEqualityFn<Omit<import("zustand").StoreApi<TimestampState>, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: TimestampState, previousSelectedState: TimestampState) => void): () => void;
        <U>(selector: (state: TimestampState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}>;
export declare const subscribePlayerProgress: (onChange: (properties: {
    timestamp: number;
}, prev: {
    timestamp: number;
}) => void) => () => void;
export declare const usePlayerProgress: () => number;
export declare const usePlayerTimestamp: () => number;
export declare const setTimestamp: (timestamp: number) => void;
export {};
