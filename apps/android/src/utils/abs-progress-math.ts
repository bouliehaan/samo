import { type MobilePlayableAudio } from '@samo/core/mobile';

import { type AbsProgressContext } from '../services/abs-progress';
import { clamp } from './math';

export const getAbsProgressSeconds = (
    context: AbsProgressContext,
    positionMs: number | undefined,
    item: MobilePlayableAudio | undefined,
): number => {
    const offsetSeconds = item?.progressOffsetSeconds ?? 0;
    const positionSeconds = Math.max(0, (positionMs ?? 0) / 1000);
    const absoluteSeconds = offsetSeconds + positionSeconds;

    return context.durationSeconds > 0
        ? clamp(absoluteSeconds, 0, context.durationSeconds)
        : absoluteSeconds;
};

export const getPlayerPositionMsForAbsProgress = (
    absoluteSeconds: number,
    item: MobilePlayableAudio | undefined,
): number => Math.max(0, (absoluteSeconds - (item?.progressOffsetSeconds ?? 0)) * 1000);
