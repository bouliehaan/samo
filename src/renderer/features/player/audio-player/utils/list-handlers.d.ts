import type { Dispatch } from 'react';
import { CrossfadeStyle } from '/@/shared/types/types';
export declare const gaplessHandler: (args: {
    currentTime: number;
    duration: number;
    isFlac: boolean;
    isTransitioning: boolean;
    nextPlayerRef: any;
    setIsTransitioning: Dispatch<boolean>;
}) => any;
export declare const crossfadeHandler: (args: {
    currentPlayer: 1 | 2;
    currentPlayerRef: any;
    currentTime: number;
    duration: number;
    fadeDuration: number;
    fadeType: CrossfadeStyle;
    isTransitioning: boolean;
    nextPlayerRef: any;
    player: 1 | 2;
    setIsTransitioning: Dispatch<boolean>;
    volume: number;
}) => any;
