export declare const browser: {
    clearCache: () => Promise<void>;
    devtools: () => void;
    exit: () => void;
    maximize: () => void;
    minimize: () => void;
    quit: () => void;
    setIgnoreMouseEvents: (ignore: boolean) => void;
    unmaximize: () => void;
};
export type Browser = typeof browser;
