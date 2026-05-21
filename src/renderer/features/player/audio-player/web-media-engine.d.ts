export type WebMediaEngineMode = 'abs-resume' | 'radio';
export interface WebMediaEngineProps {
    contentUrl: string | null;
    errorMessage: string;
    isActive: boolean;
    mode: WebMediaEngineMode;
    onEnded: () => void;
    onError: () => void;
    onProgress?: (playedSeconds: number) => void;
    onSeekTransport?: (timestamp: number) => void;
    ownsPlayback: () => boolean;
    releaseOnError: () => void;
    resetResumeOnEnd?: () => void;
    resumePosition?: number;
    /** Radio drives status from `isPlaying` instead of universal transport. */
    statusFromRadio?: boolean;
    radioIsPlaying?: boolean;
    syncVolumeToEngineRef?: boolean;
}
export declare function WebMediaEngine({ contentUrl, errorMessage, isActive, mode, onEnded, onError, onProgress, onSeekTransport, ownsPlayback, releaseOnError, resetResumeOnEnd, resumePosition, statusFromRadio, radioIsPlaying, syncVolumeToEngineRef, }: WebMediaEngineProps): import("react/jsx-runtime").JSX.Element | null;
