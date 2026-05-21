export interface AudioElementRegistration {
    mediaKey: null | string;
    playerId: string;
    registeredAt: number;
    sessionId: null | string;
    source: null | string;
    updatedAt: number;
}
type RegisterAudioElementOptions = Partial<Pick<AudioElementRegistration, 'mediaKey' | 'playerId' | 'sessionId' | 'source'>>;
export declare const warnIfMultipleAudiblePlaybackElements: () => void;
export declare const registerAudioElement: (audio: HTMLAudioElement, options?: RegisterAudioElementOptions) => void;
export declare const stopAudioElement: (audio: HTMLAudioElement) => void;
export declare const unregisterAudioElement: (audio: HTMLAudioElement) => void;
export declare const stopAllAudioElements: () => void;
export {};
