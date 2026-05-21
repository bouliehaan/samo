export declare let resolveHtmlPath: (htmlFileName: string) => string;
export declare const disableAutoUpdates: () => string | undefined;
export declare const isMacOS: () => boolean;
export declare const isWindows: () => boolean;
export declare const isLinux: () => boolean;
export declare const hotkeyToElectronAccelerator: (hotkey: string) => string;
export declare const createLog: (data: {
    message: string;
    type: "debug" | "error" | "info" | "success" | "verbose" | "warning";
}) => void;
export declare const autoUpdaterLogInterface: {
    debug: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
};
