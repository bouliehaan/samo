import { LongFormLibraryItem } from '/@/shared/api/long-form-types';

/**
 * How far into a book you are, or undefined when there is nothing to resume.
 *
 * A pure module with no store or React imports, for the same reason the phone's
 * samo-radio queue mapping is one: this is the logic worth testing, and a test
 * cannot reach it through a component that transitively pulls in every zustand
 * store in the app.
 *
 * The position comes from this machine's saved playhead, not from the library
 * listing: `GET /api/v1/audiobooks` returns each book's duration but overlays
 * no per-user progress (only the per-book detail route does), so `currentTime`
 * is always absent there. Reading it anyway is what left the Continue Listening
 * shelf silently empty — every book looked like one never opened.
 *
 * The server's value is still preferred when it exists, so this starts telling
 * the truth about other devices the moment the listing grows a position.
 *
 * A finished book is deliberately excluded rather than shown at 100%: this
 * shelf answers "what am I in the middle of", and a book you finished is not
 * that. So is a book barely touched — a stray two seconds from a mis-click
 * would otherwise pin it to the front of the shelf forever.
 */
export const audiobookProgressFraction = (
    item: LongFormLibraryItem,
    localPositionSeconds?: number,
): number | undefined => {
    const progress = item.mediaProgress;
    if (progress?.isFinished) {
        return undefined;
    }

    const duration = progress?.duration ?? item.media?.duration;
    const position = progress?.currentTime ?? localPositionSeconds;
    if (!duration || !position || position <= 0) {
        return undefined;
    }

    const fraction = position / duration;
    // Within a minute of the end is finished in every way that matters.
    if (fraction <= 0.02 || duration - position <= 60) {
        return undefined;
    }

    return Math.min(1, fraction);
};
