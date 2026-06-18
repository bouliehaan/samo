import { type MobilePlayableAudio } from '@samo/core/mobile';
import { ServerType } from '@samo/core/server';

export const isSamoAudiobookPlayback = (item: MobilePlayableAudio) =>
    item.source === 'audiobook' && item.id.startsWith(`${ServerType.SAMO}:`);

/** True when the playable is an MP3 (by reported MIME type). */
export const isMp3PlayableAudio = (item: MobilePlayableAudio): boolean => {
    const mime = item.mimeType?.toLowerCase() ?? '';
    return mime.includes('mpeg') || mime.includes('mp3');
};

/**
 * A Samo audiobook served as VBR MP3 cannot be seeked accurately by the player:
 * its Xing seek table only resolves to ~1% of the file (minutes on a long book),
 * so seeks land mid-sentence. Such a seek must instead reload the file
 * pre-positioned at the exact second via the server's frame-accurate
 * `progressSeconds` seek, which yields `book = progressOffsetSeconds + nativePos`
 * — the identical position shape a correct native seek would, single- or
 * multi-file. Exact containers (M4B/AAC) seek correctly in the player and are
 * left untouched.
 *
 * The MP3 gate must match the server's: only files the server will actually
 * frame-seek may skip the player's native seek, or position desyncs.
 */
export const shouldServerSeekAudiobookMp3 = (item: MobilePlayableAudio): boolean =>
    isSamoAudiobookPlayback(item) && isMp3PlayableAudio(item);

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
