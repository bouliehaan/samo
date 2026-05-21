interface UseDebouncedValueOptions {
    waitForInitial?: boolean;
}
export declare function useDebouncedValue<T>(value: T, delay: number, options?: UseDebouncedValueOptions): [T | undefined];
export {};
