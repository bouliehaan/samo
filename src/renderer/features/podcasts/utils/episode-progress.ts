import { LongFormPodcastEpisode } from '/@/shared/api/long-form-types';

/** Progress below this fraction reads as noise on a 3px bar, so it is not drawn. */
const MINIMUM_VISIBLE_FRACTION = 0.02;

/**
 * How far through an episode the listener is, as 0–1, or undefined when there
 * is nothing meaningful to draw.
 *
 * A completed episode is always 1 regardless of the stored position: servers
 * routinely mark an episode finished a few seconds short of its duration, and a
 * bar that stops just shy of full on a "Played" row looks like a bug.
 */
export const getEpisodeProgressFraction = (episode: LongFormPodcastEpisode): number | undefined => {
    if (episode.completed) {
        return 1;
    }

    const duration = episode.duration ?? episode.audioFile?.duration;
    const position = episode.progressSeconds;

    if (!duration || !position || position <= 0) {
        return undefined;
    }

    const fraction = position / duration;
    if (fraction <= MINIMUM_VISIBLE_FRACTION) {
        return undefined;
    }

    return Math.min(1, fraction);
};
