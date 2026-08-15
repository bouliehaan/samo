import { describe, expect, it } from 'vitest';

import { getEpisodeProgressFraction } from './episode-progress';

import { LongFormPodcastEpisode } from '/@/shared/api/long-form-types';

const episode = (overrides: Partial<LongFormPodcastEpisode> = {}): LongFormPodcastEpisode => ({
    id: 'episode-1',
    title: 'An episode',
    ...overrides,
});

describe('getEpisodeProgressFraction', () => {
    it('reports a completed episode as fully played even when the position falls short', () => {
        // Servers commonly mark "finished" a few seconds before the true end.
        expect(
            getEpisodeProgressFraction(
                episode({ completed: true, duration: 1000, progressSeconds: 940 }),
            ),
        ).toBe(1);
    });

    it('returns the played fraction for an episode in progress', () => {
        expect(getEpisodeProgressFraction(episode({ duration: 1000, progressSeconds: 250 }))).toBe(
            0.25,
        );
    });

    it('draws nothing for an unstarted episode', () => {
        expect(getEpisodeProgressFraction(episode({ duration: 1000 }))).toBeUndefined();
        expect(
            getEpisodeProgressFraction(episode({ duration: 1000, progressSeconds: 0 })),
        ).toBeUndefined();
    });

    it('draws nothing for a sliver of progress that would read as noise', () => {
        expect(
            getEpisodeProgressFraction(episode({ duration: 1000, progressSeconds: 15 })),
        ).toBeUndefined();
    });

    it('draws progress once it passes the visibility floor', () => {
        expect(getEpisodeProgressFraction(episode({ duration: 1000, progressSeconds: 30 }))).toBe(
            0.03,
        );
    });

    it('falls back to the audio file duration when the episode has none', () => {
        expect(
            getEpisodeProgressFraction(
                episode({ audioFile: { duration: 400 }, progressSeconds: 200 }),
            ),
        ).toBe(0.5);
    });

    it('never exceeds 1 when the stored position overruns the duration', () => {
        expect(getEpisodeProgressFraction(episode({ duration: 100, progressSeconds: 250 }))).toBe(
            1,
        );
    });

    it('draws nothing when the duration is unknown', () => {
        expect(getEpisodeProgressFraction(episode({ progressSeconds: 120 }))).toBeUndefined();
    });
});
