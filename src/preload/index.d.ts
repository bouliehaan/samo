declare const api: {
    audiobookshelf: {
        closePlaybackSession: (payload: {
            body: import('../shared/api/long-form-types').AudiobookshelfPlaybackSessionSyncRequest;
            sessionId: string;
            token: string;
            url: string;
        }) => Promise<void>;
        getItem: (payload: {
            itemId: string;
            token: string;
            url: string;
        }) => Promise<
            import('../shared/api/long-form-types').LongFormLibraryItem
        >;
        getItemCoverDataUrl: (payload: {
            itemId: string;
            token: string;
            url: string;
        }) => Promise<null | string>;
        getLibraries: (payload: {
            token: string;
            url: string;
        }) => Promise<
            import('../shared/api/long-form-types').AudiobookshelfLibrariesResponse
        >;
        getLibraryItems: (payload: {
            libraryId: string;
            token: string;
            url: string;
        }) => Promise<
            import('../shared/api/long-form-types').LongFormLibraryItemsResponse
        >;
        login: (payload: {
            password: string;
            url: string;
            username: string;
        }) => Promise<
            import('../shared/api/long-form-types').AudiobookshelfLoginResponse
        >;
        playItem: (payload: {
            episodeId?: string;
            itemId: string;
            token: string;
            url: string;
        }) => Promise<
            import('../shared/api/long-form-types').AudiobookshelfPlaybackSessionResponse
        >;
        syncPlaybackSession: (payload: {
            body: import('../shared/api/long-form-types').AudiobookshelfPlaybackSessionSyncRequest;
            sessionId: string;
            token: string;
            url: string;
        }) => Promise<void>;
    };
    autodiscover: {
        discover: (
            onReply: (server: import('../shared/types/types').DiscoveredServerItem) => void,
        ) => Promise<void>;
    };
    browser: {
        clearCache: () => Promise<void>;
        devtools: () => void;
        exit: () => void;
        isMaximized: () => Promise<boolean>;
        maximize: () => void;
        minimize: () => void;
        onMaximizeStateChanged: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent, maximized: boolean) => void,
        ) => () => void;
        quit: () => void;
        setIgnoreMouseEvents: (ignore: boolean) => void;
        unmaximize: () => void;
    };
    discordRpc: {
        clearActivity: () => void;
        initialize: (clientId: string) => Promise<any>;
        isConnected: () => Promise<any>;
        quit: () => void;
        setActivity: (activity: import('@xhayper/discord-rpc').SetActivity) => void;
    };
    localSettings: {
        disableMediaKeys: () => void;
        enableMediaKeys: () => void;
        env: {
            LEGACY_AUTHENTICATION: boolean;
            REMOTE_URL: string;
            SERVER_LOCK: boolean;
            SERVER_NAME: string;
            SERVER_TYPE: null | string;
            SERVER_URL: string;
        };
        fontError: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent, file: string) => void,
        ) => void;
        get: (property: string) => Promise<any>;
        openFileSelector: (
            options?: Electron.CrossProcessExports.OpenDialogOptions,
        ) => Promise<any>;
        passwordGet: (server: string) => Promise<null | string>;
        passwordRemove: (server: string) => void;
        passwordSet: (password: string, server: string) => Promise<boolean>;
        restart: () => void;
        set: (
            property: string,
            value: boolean | Record<string, unknown> | string | string[] | undefined,
        ) => void;
        setZoomFactor: (zoomFactor: number) => void;
        themeSet: (theme: import('../shared/types/types').TitleTheme) => void;
    };
    lyrics: {
        clearCacheForSong: (song: import('../shared/types/domain-types').Song) => Promise<any>;
        getRemoteLyricsByRemoteId: (
            id: import('../main/features/core/lyrics').LyricGetQuery,
        ) => Promise<any>;
        getRemoteLyricsBySong: (
            song: import('../shared/types/domain-types').QueueSong,
        ) => Promise<any>;
        searchRemoteLyrics: (
            params: import('../main/features/core/lyrics').LyricSearchQuery,
        ) => Promise<
            Record<
                import('../main/features/core/lyrics').LyricSource,
                import('../main/features/core/lyrics').InternetProviderLyricSearchResponse[]
            >
        >;
    };
    mpris: {
        requestPosition: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    position: number;
                },
            ) => void,
        ) => void;
        requestSeek: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    offset: number;
                },
            ) => void,
        ) => void;
        requestToggleRepeat: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    repeat: import('@samo/core').PlayerRepeat;
                },
            ) => void,
        ) => void;
        requestToggleShuffle: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    shuffle: boolean;
                },
            ) => void,
        ) => void;
        requestVolume: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    volume: number;
                },
            ) => void,
        ) => void;
        updatePosition: (timeSec: number) => void;
        updateRepeat: (repeat: import('@samo/core').PlayerRepeat) => void;
        updateSeek: (timeSec: number) => void;
        updateShuffle: (shuffle: boolean) => void;
        updateSong: (
            song: import('../shared/types/domain-types').QueueSong | undefined,
            imageUrl?: null | string,
        ) => void;
        updateStatus: (status: import('@samo/core').PlayerStatus) => void;
        updateVolume: (volume: number) => void;
    };
    mpvPlayer: {
        autoNext: (url?: string) => void;
        cleanup: () => Promise<any>;
        currentTime: () => void;
        getAudioDevices: () => Promise<any>;
        getCurrentTime: () => Promise<any>;
        getMetadata: () => Promise<any>;
        getStreamMetadata: (streamUrl?: string) => Promise<any>;
        initialize: (data: {
            extraParameters?: string[];
            properties?: Record<string, any>;
        }) => Promise<any>;
        isRunning: () => Promise<any>;
        mute: (mute: boolean) => void;
        next: () => void;
        pause: () => void;
        play: () => void;
        previous: () => void;
        quit: () => void;
        refreshAudioDevices: () => Promise<any>;
        restart: (data: {
            binaryPath?: string;
            extraParameters?: string[];
            properties?: Record<string, any>;
        }) => Promise<any>;
        seek: (seconds: number) => void;
        seekTo: (seconds: number) => void;
        setProperties: (data: Record<string, any>) => void;
        setQueue: (current?: string, next?: string, pause?: boolean) => void;
        setQueueNext: (url?: string) => void;
        stop: () => void;
        updateMetadata: (data: import('../shared/types/domain-types').PlayerData) => void;
        volume: (value: number) => void;
    };
    mpvPlayerListener: {
        rendererAutoNext: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererCurrentTime: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent, data: number) => void,
        ) => void;
        rendererError: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent, data: string) => void,
        ) => void;
        rendererNext: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererPause: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererPlay: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererPlayerFallback: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent, data: boolean) => void,
        ) => void;
        rendererPlayPause: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererPrevious: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererQuit: (cb: (event: Electron.CrossProcessExports.IpcRendererEvent) => void) => void;
        rendererSkipBackward: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererSkipForward: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererStop: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererToggleRepeat: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererToggleShuffle: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererVolumeDown: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererVolumeMute: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
        rendererVolumeUp: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: import('../shared/types/domain-types').PlayerData,
            ) => void,
        ) => void;
    };
    remote: {
        requestFavorite: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    favorite: boolean;
                    id: string;
                    serverId: string;
                },
            ) => void,
        ) => void;
        requestPosition: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    position: number;
                },
            ) => void,
        ) => void;
        requestRating: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    id: string;
                    rating: number;
                    serverId: string;
                },
            ) => void,
        ) => void;
        requestSeek: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    offset: number;
                },
            ) => void,
        ) => void;
        requestVolume: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    volume: number;
                },
            ) => void,
        ) => void;
        setRemoteEnabled: (enabled: boolean) => Promise<null | string>;
        setRemotePort: (port: number) => Promise<null | string>;
        updateFavorite: (favorite: boolean, serverId: string, ids: string[]) => void;
        updatePassword: (password: string) => void;
        updatePlayback: (playback: import('@samo/core').PlayerStatus) => void;
        updatePosition: (timeSec: number) => void;
        updateRating: (rating: number, serverId: string, ids: string[]) => void;
        updateRepeat: (repeat: string) => void;
        updateSetting: (
            enabled: boolean,
            port: number,
            username: string,
            password: string,
        ) => Promise<null | string>;
        updateShuffle: (shuffle: boolean) => void;
        updateSong: (
            song: import('../shared/types/domain-types').QueueSong | undefined,
            imageUrl?: null | string,
        ) => void;
        updateUsername: (username: string) => void;
        updateVolume: (volume: number) => void;
    };
    utils: {
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
        mainMessageListener: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    message: string;
                    type: 'error' | 'info' | 'success' | 'warning';
                },
            ) => void,
        ) => void;
        onUpdateAvailable: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent, version: string) => void,
        ) => () => void;
        openApplicationDirectory: () => Promise<any>;
        openItem: (path: string) => Promise<any>;
        playerErrorListener: (
            cb: (
                event: Electron.CrossProcessExports.IpcRendererEvent,
                data: {
                    code: number;
                },
            ) => void,
        ) => void;
        rendererOpenCommandPalette: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent) => void,
        ) => void;
        rendererOpenManageServers: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent) => void,
        ) => void;
        rendererOpenReleaseNotes: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent) => void,
        ) => void;
        rendererOpenSettings: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent) => void,
        ) => void;
        rendererTogglePrivateMode: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent) => void,
        ) => void;
        rendererToggleSidebar: (
            cb: (event: Electron.CrossProcessExports.IpcRendererEvent) => void,
        ) => void;
    };
};
export type PreloadApi = typeof api;
export {};
