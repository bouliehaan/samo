import React from 'react';
export type RadioCurrentStationArt = {
    id: string;
    imageId?: null | string;
    imageUrl?: null | string;
    serverId: string;
};
export interface RadioMetadata {
    artist: null | string;
    title: null | string;
}
interface RadioStore {
    actions: {
        pause: () => void;
        play: (streamUrl?: string, stationName?: string, stationArt?: null | RadioCurrentStationArt) => void;
        setCurrentStreamUrl: (currentStreamUrl: null | string) => void;
        setIsPlaying: (isPlaying: boolean) => void;
        setMetadata: (metadata: null | RadioMetadata) => void;
        setStationName: (stationName: null | string) => void;
        stop: () => void;
    };
    currentStationArt: null | RadioCurrentStationArt;
    currentStreamUrl: null | string;
    isPlaying: boolean;
    metadata: null | RadioMetadata;
    stationName: null | string;
}
export declare const useRadioStore: import("zustand/traditional").UseBoundStoreWithEqualityFn<import("zustand").StoreApi<RadioStore>>;
export declare const useIsPlayingRadio: () => boolean;
export declare const useIsRadioActive: () => boolean;
export declare const useRadioPlayer: () => {
    currentStationArt: RadioCurrentStationArt | null;
    currentStreamUrl: string | null;
    isPlaying: boolean;
    metadata: RadioMetadata | null;
    stationName: string | null;
};
export declare const useRadioControls: () => {
    pause: () => void;
    play: (streamUrl?: string, stationName?: string, stationArt?: null | RadioCurrentStationArt) => void;
    stop: () => void;
};
export declare const useRadioAudioInstance: () => void;
export declare const useRadioMetadata: () => void;
export declare const RadioAudioInstanceHook: () => React.FunctionComponentElement<{}> | null;
export declare const RadioMetadataHook: () => React.FunctionComponentElement<{}> | null;
export {};
