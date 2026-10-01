import { describe, expect, it } from 'vitest';

import { reconcileHomeContent } from './home-content';
import { type MobileHomeContent } from '@samo/core/mobile';

const makeItem = (id: string) =>
    ({ id, source: { id: 'srv' }, title: `Item ${id}`, type: 'album' }) as never;

const makeContent = (
    sections: Array<{ id: string; itemIds: string[]; title?: string }>,
): MobileHomeContent =>
    ({
        errors: [],
        loadedAt: 1,
        sections: sections.map((section) => ({
            id: section.id,
            items: section.itemIds.map(makeItem),
            title: section.title ?? section.id,
        })),
        serverTitle: 'Server',
    }) as MobileHomeContent;

describe('reconcileHomeContent never-deload guard', () => {
    it('keeps a populated previous shelf that vanished from a non-authoritative (thin) read', () => {
        const previous = makeContent([
            { id: 'albums', itemIds: ['a1', 'a2'] },
            { id: 'podcasts', itemIds: ['p1'] },
        ]);
        // A mid-sync thin read drops the podcasts shelf entirely.
        const next = makeContent([{ id: 'albums', itemIds: ['a1', 'a2'] }]);

        const result = reconcileHomeContent(previous, next);

        // Default (non-authoritative): the populated shelf is merged back so the
        // page never blanks it.
        expect(result.sections.map((s) => s.id)).toContain('podcasts');
    });

    it('reinserts the merged-back shelf at its previous position', () => {
        const previous = makeContent([
            { id: 'recents', itemIds: ['r1'] },
            { id: 'podcasts', itemIds: ['p1'] },
            { id: 'albums', itemIds: ['a1'] },
        ]);
        const next = makeContent([
            { id: 'recents', itemIds: ['r1'] },
            { id: 'albums', itemIds: ['a1'] },
        ]);

        const result = reconcileHomeContent(previous, next);

        expect(result.sections.map((s) => s.id)).toEqual(['recents', 'podcasts', 'albums']);
    });

    it('DOES prune a vanished shelf on an authoritative (post-sync) derive', () => {
        const previous = makeContent([
            { id: 'albums', itemIds: ['a1'] },
            { id: 'podcasts', itemIds: ['p1'] },
        ]);
        const next = makeContent([{ id: 'albums', itemIds: ['a1'] }]);

        const result = reconcileHomeContent(previous, next, { prune: true });

        // Authoritative: a genuinely-deleted shelf is removed.
        expect(result.sections.map((s) => s.id)).toEqual(['albums']);
    });

    it('preserves item identity when content is unchanged', () => {
        const previous = makeContent([{ id: 'albums', itemIds: ['a1', 'a2'] }]);
        const next = makeContent([{ id: 'albums', itemIds: ['a1', 'a2'] }]);

        const result = reconcileHomeContent(previous, next);

        // Value-equal → previous references reused (no tile churn).
        expect(result).toBe(previous);
    });
});

describe('hero refreshes', () => {
    it('removes the last expired hero while preserving a thin mirror shelf', () => {
        const previous = makeContent([
            { id: 'heroes', itemIds: ['episode'] },
            { id: 'albums', itemIds: ['album'] },
        ]);
        const result = reconcileHomeContent(previous, makeContent([]));
        expect(result.sections.map((section) => section.id)).toEqual(['albums']);
    });

    it('applies the new ranking and removes played candidates', () => {
        const previous = makeContent([{ id: 'heroes', itemIds: ['explore', 'episode', 'played'] }]);
        const next = makeContent([{ id: 'heroes', itemIds: ['episode', 'explore'] }]);
        const result = reconcileHomeContent(previous, next);
        expect(result.sections[0]!.items.map((item) => item.id)).toEqual(['episode', 'explore']);
        expect(result.sections[0]!.items[0]).toBe(previous.sections[0]!.items[1]);
    });
});
