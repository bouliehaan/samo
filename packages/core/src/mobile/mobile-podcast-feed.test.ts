import { describe, expect, it } from 'vitest';

import {
    buildMobilePodcastFeedEpisodes,
    isSamoPodcastEpisodeCatalogBackfill,
} from './mobile-home';
import type { SamoPodcastEpisode } from '../server/server-samo';

const episode = (
    overrides: Partial<SamoPodcastEpisode> & Pick<SamoPodcastEpisode, 'id' | 'podcastId'>,
): SamoPodcastEpisode => ({
    title: overrides.title ?? overrides.id,
    ...overrides,
});

describe('isSamoPodcastEpisodeCatalogBackfill', () => {
    const now = Date.parse('2026-05-28T12:00:00Z');

    it('flags bulk import of old episodes', () => {
        expect(
            isSamoPodcastEpisodeCatalogBackfill(
                episode({
                    addedAt: '2026-05-27T12:00:00Z',
                    id: 'ep-1',
                    podcastId: 'show-1',
                    publishedAt: '2018-01-01T12:00:00Z',
                }),
                now,
            ),
        ).toBe(true);
    });

    it('allows a genuinely new release', () => {
        expect(
            isSamoPodcastEpisodeCatalogBackfill(
                episode({
                    addedAt: '2026-05-27T12:00:00Z',
                    id: 'ep-2',
                    podcastId: 'show-1',
                    publishedAt: '2026-05-26T12:00:00Z',
                }),
                now,
            ),
        ).toBe(false);
    });
});

describe('buildMobilePodcastFeedEpisodes', () => {
    const now = Date.parse('2026-05-28T12:00:00Z');

    it('caps episodes per show and prefers recent publishes', () => {
        const hardcore = 'hardcore-history';
        const other = 'daily-news';
        const episodes: SamoPodcastEpisode[] = [
            ...Array.from({ length: 8 }, (_, index) =>
                episode({
                    addedAt: '2026-05-27T12:00:00Z',
                    id: `hh-${index}`,
                    podcastId: hardcore,
                    publishedAt: `2026-05-${String(20 - index).padStart(2, '0')}T12:00:00Z`,
                    title: `HH ${index}`,
                }),
            ),
            episode({
                addedAt: '2026-05-20T12:00:00Z',
                id: 'news-1',
                podcastId: other,
                publishedAt: '2026-05-27T08:00:00Z',
                title: 'Morning news',
            }),
            episode({
                addedAt: '2026-05-19T12:00:00Z',
                id: 'news-2',
                podcastId: other,
                publishedAt: '2026-05-25T08:00:00Z',
                title: 'Evening news',
            }),
        ];

        const feed = buildMobilePodcastFeedEpisodes(episodes, 6, now);
        const hardcoreCount = feed.filter((item) => item.podcastId === hardcore).length;

        expect(hardcoreCount).toBeLessThanOrEqual(2);
        expect(feed.some((item) => item.podcastId === other)).toBe(true);
        expect(feed[0]?.podcastId).toBe(other);
    });

    it('drops a bulk-imported back catalog even when publish dates are recent', () => {
        const feed = buildMobilePodcastFeedEpisodes(
            [
                episode({
                    addedAt: '2026-05-27T12:00:00Z',
                    id: 'old-1',
                    podcastId: 'show-1',
                    publishedAt: '2014-06-01T12:00:00Z',
                    title: 'Ancient episode',
                }),
                episode({
                    addedAt: '2026-05-10T12:00:00Z',
                    id: 'new-1',
                    podcastId: 'show-2',
                    publishedAt: '2026-05-09T12:00:00Z',
                    title: 'Fresh episode',
                }),
            ],
            12,
            now,
        );

        expect(feed.map((item) => item.id)).toEqual(['new-1']);
    });
});
