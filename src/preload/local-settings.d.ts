import { IpcRendererEvent, OpenDialogOptions } from 'electron';
import { TitleTheme } from '/@/shared/types/types';
export declare const toServerType: (value?: string) => null | string;
export declare const localSettings: {
    disableMediaKeys: () => void;
    enableMediaKeys: () => void;
    env: {
        LEGACY_AUTHENTICATION: boolean;
        REMOTE_URL: string;
        SERVER_LOCK: boolean;
        SERVER_NAME: string;
        SERVER_TYPE: string | null;
        SERVER_URL: string;
        START_MAXIMIZED: boolean | undefined;
    };
    fontError: (cb: (event: IpcRendererEvent, file: string) => void) => void;
    get: (property: string) => Promise<any>;
    openFileSelector: (options?: OpenDialogOptions) => Promise<any>;
    passwordGet: (server: string) => Promise<null | string>;
    passwordRemove: (server: string) => void;
    passwordSet: (password: string, server: string) => Promise<boolean>;
    restart: () => void;
    set: (property: string, value: boolean | Record<string, unknown> | string | string[] | undefined) => void;
    setZoomFactor: (zoomFactor: number) => void;
    themeSet: (theme: TitleTheme) => void;
};
export type LocalSettings = typeof localSettings;
