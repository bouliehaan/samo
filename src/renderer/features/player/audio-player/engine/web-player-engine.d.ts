import type { RefObject } from 'react';
import type ReactPlayer from 'react-player';
import { AudioPlayer, PlayerOnProgressProps } from '/@/renderer/features/player/audio-player/types';
import { PlayerStatus } from '/@/shared/types/types';
export interface WebPlayerEngineHandle extends AudioPlayer {
    player1(): {
        ref: null | ReactPlayer;
        setVolume: (volume: number) => void;
    };
    player2(): {
        ref: null | ReactPlayer;
        setVolume: (volume: number) => void;
    };
}
interface WebPlayerEngineProps {
    isMuted: boolean;
    isTransitioning: boolean;
    onEndedPlayer1: () => void;
    onEndedPlayer2: () => void;
    onErrorPause: () => void;
    onProgressPlayer1: (e: PlayerOnProgressProps) => void;
    onProgressPlayer2: (e: PlayerOnProgressProps) => void;
    onStartedPlayer1: (player: ReactPlayer) => void;
    onStartedPlayer2: (player: ReactPlayer) => void;
    playerNum: number;
    playerRef: RefObject<null | WebPlayerEngineHandle>;
    playerStatus: PlayerStatus;
    preservesPitch: boolean;
    speed?: number;
    src1: string | undefined;
    src2: string | undefined;
    volume: number;
}
export declare const WebPlayerEngine: {
    (props: WebPlayerEngineProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export {};
