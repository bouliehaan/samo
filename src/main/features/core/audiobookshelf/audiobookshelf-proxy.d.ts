export declare const releaseProxySession: (proxySessionId: string) => void;
export declare const releaseProxySessionsForOwner: (ownerSessionId: string) => void;
export declare const createAudiobookshelfProxyUrl: (baseUrl: string, token: string, contentUrl: string, ownerSessionId: string, webContentsId: number) => Promise<string>;
export declare const getAudiobookshelfProxyHealthUrl: () => Promise<string>;
export declare const shutdownAudiobookshelfProxy: () => void;
