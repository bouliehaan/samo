import {
    applySamoAudiobookBookPosition,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    type ServerAuthenticationResult,
    ServerType,
} from '@samo/core/server';

export const isSamoAudiobookPlayback = (item: MobilePlayableAudio) =>
    item.source === 'audiobook' && item.id.startsWith(`${ServerType.SAMO}:`);

export const prepareSamoAudiobookPlaybackAtBookPosition = async (
    item: MobilePlayableAudio,
    bookStartSeconds: number,
    serverConnections: ServerAuthenticationResult[],
): Promise<MobilePlayableAudio> => {
    const authentication = findServerAuthenticationForSource(serverConnections, {
        id: item.contentSourceId,
    });

    if (!authentication || authentication.type !== ServerType.SAMO) {
        return item;
    }

    const streamToken = await ensureSamoStreamToken(authentication).catch(() => undefined);

    return applySamoAudiobookBookPosition(item, bookStartSeconds, authentication, streamToken);
};

export const getSamoBookPositionSeconds = (
    item: MobilePlayableAudio,
    filePositionMs: number | undefined,
) => (item.progressOffsetSeconds ?? 0) + (filePositionMs ?? 0) / 1000;

export const getSamoFilePositionMs = (
    item: MobilePlayableAudio,
    bookPositionSeconds: number,
) => Math.max(0, (bookPositionSeconds - (item.progressOffsetSeconds ?? 0)) * 1000);

/** Max native seek within the current Samo stream window (book-global remainder). */
export const getSamoMaxFilePositionMs = (
    item: MobilePlayableAudio,
    nativeDurationMs: number | undefined,
): number | undefined => {
    const bookDurationMs = (item.durationSeconds ?? 0) * 1000;
    const offsetMs = (item.progressOffsetSeconds ?? 0) * 1000;
    const remainingBookMs = Math.max(0, bookDurationMs - offsetMs);

    if (remainingBookMs <= 0) {
        return undefined;
    }

    if (
        nativeDurationMs &&
        nativeDurationMs > 0 &&
        nativeDurationMs < remainingBookMs - 1000
    ) {
        return nativeDurationMs;
    }

    return remainingBookMs;
};

/**
 * Samo opens the HTTP stream at `progressOffsetSeconds` (book time). Native position 0
 * is that offset — seeks before the stream origin or past the current file window
 * need a new stream URL.
 */
export const samoAudiobookSeekNeedsStreamRestart = (
    item: MobilePlayableAudio,
    targetFilePositionMs: number,
    maxFilePositionMs?: number,
) => {
    if (!isSamoAudiobookPlayback(item)) {
        return false;
    }

    const streamOrigin = item.progressOffsetSeconds ?? 0;
    const targetBookSeconds = streamOrigin + targetFilePositionMs / 1000;

    if (targetBookSeconds < streamOrigin - 0.25) {
        return true;
    }

    if (
        maxFilePositionMs !== undefined &&
        targetFilePositionMs > maxFilePositionMs + 500
    ) {
        return true;
    }

    return false;
};
