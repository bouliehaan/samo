export declare const getFastAverageColor: (args: {
    algorithm?: "dominant" | "simple" | "sqrt";
    src: string;
}) => Promise<string>;
export declare const useFastAverageColor: (args: {
    algorithm?: "dominant" | "simple" | "sqrt";
    default?: string;
    id?: string;
    src?: null | string;
    srcLoaded?: boolean;
}) => {
    background: string | undefined;
    colorId: string | undefined;
    isDark: boolean;
    isLight: boolean;
    isLoading: boolean;
};
export declare const useWaitForColorCalculation: (args: {
    hasImage: boolean;
    isLoading: boolean;
    routeId: string;
    showBlurredImage: boolean;
    timeoutMs?: number;
}) => {
    isReady: boolean;
};
