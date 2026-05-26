/// <reference types="vite/client" />

/** Google Cast sender APIs (loaded at runtime in Electron). */
declare namespace chrome.cast {
    class Image {
        constructor(url: string);
    }
    namespace media {
        enum StreamType {
            BUFFERED = 'BUFFERED',
        }
        class LoadRequest {
            autoplay: boolean;
            currentTime: number;
            constructor(mediaInfo: MediaInfo);
        }
        class MediaInfo {
            metadata: MusicTrackMediaMetadata;
            streamType: StreamType;
            constructor(contentId: string, contentType: string);
        }
        class MusicTrackMediaMetadata {
            albumName?: string;
            artist?: string;
            images?: Image[];
            title?: string;
        }
        class SeekRequest {
            currentTime: number;
        }
    }
}

declare namespace cast.framework {
    enum AutoJoinPolicy {
        ORIGIN_SCOPED = 'origin_scoped',
    }
    enum CastContextEventType {
        CAST_STATE_CHANGED = 'caststatechanged',
        SESSION_STATE_CHANGED = 'sessionstatechanged',
    }
    enum CastState {
        CONNECTED = 'CONNECTED',
        CONNECTING = 'CONNECTING',
        NOT_CONNECTED = 'NOT_CONNECTED',
    }
    class CastContext {
        static getInstance(): CastContext;
        addEventListener(type: CastContextEventType, handler: () => void): void;
        getCastState(): CastState;
        getCurrentSession(): CastSession | null;
        requestSession(): Promise<void>;
        setOptions(options: CastOptions): void;
    }
    class CastOptions {
        autoJoinPolicy: AutoJoinPolicy;
        receiverApplicationId: string;
    }
    class CastSession {
        endSession(stopCasting: boolean): Promise<void>;
        getCastDevice(): null | { friendlyName?: string };
        getMediaClient(): null | RemoteMediaClient;
        getSessionId(): string;
    }
    class RemoteMediaClient {
        loadMedia(
            loadRequest: chrome.cast.media.LoadRequest,
            onSuccess: () => void,
            onError: (error: unknown) => void,
        ): void;
        pause(request: null, onSuccess: () => void, onError: (error: unknown) => void): void;
        play(request: null, onSuccess: () => void, onError: (error: unknown) => void): void;
        seek(
            request: chrome.cast.media.SeekRequest,
            onSuccess: () => void,
            onError: (error: unknown) => void,
        ): void;
    }
}

interface Window {
    cast?: {
        framework: typeof cast.framework;
    };
}
