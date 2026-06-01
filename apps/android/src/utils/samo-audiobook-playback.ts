import { type MobilePlayableAudio } from '@samo/core/mobile';
import { ServerType } from '@samo/core/server';

export const isSamoAudiobookPlayback = (item: MobilePlayableAudio) =>
    item.source === 'audiobook' && item.id.startsWith(`${ServerType.SAMO}:`);

/**
 * Book-global second for a position inside the current file. The native player
 * reports a file-local position; the file's book-global start lives on
 * `progressOffsetSeconds`, so book-time = fileOffset + filePosition.
 */
export const getSamoBookPositionSeconds = (
    item: MobilePlayableAudio,
    filePositionMs: number | undefined,
) => (item.progressOffsetSeconds ?? 0) + (filePositionMs ?? 0) / 1000;

/** Inverse of {@link getSamoBookPositionSeconds}: file-local ms for a book second. */
export const getSamoFilePositionMs = (item: MobilePlayableAudio, bookPositionSeconds: number) =>
    Math.max(0, (bookPositionSeconds - (item.progressOffsetSeconds ?? 0)) * 1000);

/**
 * The book file's own span on the book-global timeline: [start, end) in seconds.
 * `durationSeconds` on an audiobook queue item is the FILE duration (the native
 * stream length), so end = fileStart + fileDuration.
 */
export const getSamoFileBookSpanSeconds = (
    item: MobilePlayableAudio,
): { endSeconds: number; startSeconds: number } => {
    const startSeconds = item.progressOffsetSeconds ?? 0;
    const fileDuration = item.durationSeconds ?? 0;
    return { endSeconds: startSeconds + fileDuration, startSeconds };
};

export interface AudiobookSeekTarget {
    /** Index of the queue item (file) that contains the target book position. */
    queueIndex: number;
    /** Position within that file, in milliseconds. */
    filePositionMs: number;
    /** The resolved book-global position, in seconds (clamped). */
    bookPositionSeconds: number;
}

/**
 * Resolve a book-global seek to the (file, file-position) it lands in.
 *
 * With whole-file serving the player owns seeking: this maps a target book
 * second onto the queue item whose span contains it, plus the in-file offset.
 * The caller seeks locally when the target file is already playing, or steps the
 * queue (playing the target file from `filePositionMs`) when it crosses a file
 * boundary. No stream restarts, so backward seeks always work.
 */
export const resolveAudiobookSeekTarget = (
    queueItems: readonly MobilePlayableAudio[],
    targetBookSeconds: number,
): AudiobookSeekTarget => {
    const bookSeconds = Math.max(0, targetBookSeconds);
    if (queueItems.length === 0) {
        return { bookPositionSeconds: bookSeconds, filePositionMs: bookSeconds * 1000, queueIndex: 0 };
    }

    let queueIndex = 0;
    for (let i = 0; i < queueItems.length; i += 1) {
        if ((queueItems[i]?.progressOffsetSeconds ?? 0) <= bookSeconds) {
            queueIndex = i;
        } else {
            break;
        }
    }

    const item = queueItems[queueIndex]!;
    const { endSeconds, startSeconds } = getSamoFileBookSpanSeconds(item);
    // Clamp to the file's own span so a rounding overshoot can't request a
    // position past the end of the file (which would trip STATE_ENDED).
    const fileDuration = item.durationSeconds ?? 0;
    const clampedBook =
        fileDuration > 0 ? Math.min(bookSeconds, endSeconds - 0.05) : bookSeconds;
    const filePositionMs = Math.max(0, (clampedBook - startSeconds) * 1000);

    return { bookPositionSeconds: clampedBook, filePositionMs, queueIndex };
};
