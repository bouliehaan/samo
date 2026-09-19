import { type MobilePlayableAudio } from '@samo/core/mobile';

export const isSamoAudiobookPlayback = (item: MobilePlayableAudio) =>
    item.source === 'audiobook';

/**
 * Book id of an audiobook queue item, for "same book" tests. Matches the
 * segment after `:audiobook:` whatever follows it: the streamed per-file form
 * ends `:file:<mediaFileId>`, the downloaded form `:offline:<ino>`, and core's
 * parseSamoAudiobookIdFromPlaybackId — anchored to the streamed forms only —
 * returns nothing for the second. Non-audiobook items have no book.
 */
export const getAudiobookQueueItemBookId = (
    item: Pick<MobilePlayableAudio, 'id' | 'source'>,
): string | undefined =>
    item.source === 'audiobook' ? (item.id.match(/:audiobook:([^:]+)/)?.[1] ?? item.id) : undefined;

/**
 * The contiguous run of queue items that belong to the same book as the item
 * at `index`, as [start, end). The queue is not the book: since Play Next /
 * Play Last a book's files can sit between songs, podcast episodes or another
 * book, and anything that walks "the book's files" must walk only these.
 * Yields [index, index + 1) for a non-audiobook item and an empty run for an
 * out-of-range index.
 */
export const getAudiobookQueueRun = (
    queueItems: readonly Pick<MobilePlayableAudio, 'id' | 'source'>[],
    index: number,
): { end: number; start: number } => {
    if (!Number.isInteger(index) || index < 0 || index >= queueItems.length) {
        return { end: 0, start: 0 };
    }
    const bookId = getAudiobookQueueItemBookId(queueItems[index]!);
    if (bookId === undefined) {
        return { end: index + 1, start: index };
    }
    let start = index;
    while (start > 0 && getAudiobookQueueItemBookId(queueItems[start - 1]!) === bookId) {
        start -= 1;
    }
    let end = index + 1;
    while (end < queueItems.length && getAudiobookQueueItemBookId(queueItems[end]!) === bookId) {
        end += 1;
    }
    return { end, start };
};

/** True when the playable is an MP3 (by reported MIME type). */
export const isMp3PlayableAudio = (item: MobilePlayableAudio): boolean => {
    const mime = item.mimeType?.toLowerCase() ?? '';
    return mime.includes('mpeg') || mime.includes('mp3');
};

/**
 * A samo audiobook served as VBR MP3 cannot be seeked accurately by the player:
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
    currentIndex = 0,
): AudiobookSeekTarget => {
    const bookSeconds = Math.max(0, targetBookSeconds);
    if (queueItems.length === 0) {
        return { bookPositionSeconds: bookSeconds, filePositionMs: bookSeconds * 1000, queueIndex: 0 };
    }

    // Only the playing book's own contiguous files are candidates. Scanning
    // the whole queue by offset put a scrub onto whatever followed the book —
    // a song carries no offset, reads as "starts at 0", and so "contains" every
    // book second — the moment a queue held anything after the book.
    const run = getAudiobookQueueRun(queueItems, currentIndex);
    const scanStart = run.end > run.start ? run.start : 0;
    const scanEnd = run.end > run.start ? run.end : queueItems.length;
    let queueIndex = scanStart;
    for (let i = scanStart; i < scanEnd; i += 1) {
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
