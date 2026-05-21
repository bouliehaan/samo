type ScrollState = {
    getOffset: (key: string) => number | undefined;
    offsets: Record<string, number>;
    setOffset: (key: string, offset: number) => void;
};
export declare const useScrollStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ScrollState>>;
export {};
