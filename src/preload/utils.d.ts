import { IpcRendererEvent } from 'electron';
export declare const utils: {
    checkForUpdates: () => Promise<{
        updateAvailable: boolean;
        version?: string;
    }>;
    disableAutoUpdates: () => string | undefined;
    download: (url: string) => void;
    forceGarbageCollection: () => boolean;
    isLinux: () => boolean;
    isMacOS: () => boolean;
    isWindows: () => boolean;
    logger: (cb: (event: IpcRendererEvent, data: {
        message: string;
        type: "debug" | "error" | "info" | "verbose" | "warning";
    }) => void) => void;
    mainMessageListener: (cb: (event: IpcRendererEvent, data: {
        message: string;
        type: "error" | "info" | "success" | "warning";
    }) => void) => void;
    openApplicationDirectory: () => Promise<any>;
    openItem: (path: string) => Promise<any>;
    playerErrorListener: (cb: (event: IpcRendererEvent, data: {
        code: number;
    }) => void) => void;
    rendererOpenCommandPalette: (cb: (event: IpcRendererEvent) => void) => void;
    rendererOpenManageServers: (cb: (event: IpcRendererEvent) => void) => void;
    rendererOpenReleaseNotes: (cb: (event: IpcRendererEvent) => void) => void;
    rendererOpenSettings: (cb: (event: IpcRendererEvent) => void) => void;
    rendererTogglePrivateMode: (cb: (event: IpcRendererEvent) => void) => void;
    rendererToggleSidebar: (cb: (event: IpcRendererEvent) => void) => void;
};
export type Utils = typeof utils;
