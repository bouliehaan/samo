import { PlayerType } from '/@/shared/types/types';
export type AudioDeviceOption = {
    label: string;
    value: string;
};
export declare const useAudioDevices: (playbackType?: PlayerType) => AudioDeviceOption[];
export declare const AudioSettings: import("react").MemoExoticComponent<() => import("react/jsx-runtime").JSX.Element>;
