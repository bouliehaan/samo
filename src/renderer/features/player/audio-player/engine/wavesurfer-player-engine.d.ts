import type { RefObject } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import { AudioPlayer, PlayerOnProgressProps } from '/@/renderer/features/player/audio-player/types';
import { PlayerStatus } from '/@/shared/types/types';
export interface WaveSurferPlayerEngineHandle extends AudioPlayer {
    player1(): {
        ref: null | WaveSurfer;
        setVolume: (volume: number) => void;
    };
    player2(): {
        ref: null | WaveSurfer;
        setVolume: (volume: number) => void;
    };
}
interface WaveSurferPlayerEngineProps {
    isMuted: boolean;
    isTransitioning: boolean;
    onEndedPlayer1: () => void;
    onEndedPlayer2: () => void;
    onProgressPlayer1: (e: PlayerOnProgressProps) => void;
    onProgressPlayer2: (e: PlayerOnProgressProps) => void;
    playerNum: number;
    playerRef: RefObject<null | WaveSurferPlayerEngineHandle>;
    playerStatus: PlayerStatus;
    speed?: number;
    src1: string | undefined;
    src2: string | undefined;
    volume: number;
}
export declare const WaveSurferPlayerEngine: {
    (props: WaveSurferPlayerEngineProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export {};
