import { describe, expect, it } from 'vitest';

import { type SamoHomeHero } from '../server/server-samo-heroes';
import { homeAnnouncementKey, isFreshHomeAnnouncement } from './mobile-home-announcements';

const now = Date.parse('2026-09-25T12:00:00Z');
const update = {
    freshAt: '2026-09-25T10:00:00Z',
    kind: 'explore' as const,
    target: { id: 'explo', type: 'playlist' as const },
};

describe('phone announcements', () => {
    it.each(['resume', 'library', 'rediscover', 'season', 'playlist'] as SamoHomeHero['kind'][])(
        'does not promote ordinary %s recommendations',
        (kind) => {
            expect(isFreshHomeAnnouncement({ ...update, kind }, now)).toBe(false);
        },
    );

    it.each([undefined, 'invalid', '2026-09-26T00:00:00Z', '2026-09-01T00:00:00Z'])(
        'rejects missing, invalid, future, and stale update times: %s',
        (freshAt) => {
            expect(isFreshHomeAnnouncement({ ...update, freshAt }, now)).toBe(false);
        },
    );

    it('accepts recent releases and a server-provided wrapped event', () => {
        for (const kind of ['explore', 'episode', 'wrapped'] as const)
            expect(isFreshHomeAnnouncement({ ...update, kind }, now)).toBe(true);
    });

    it('distinguishes a new Explo drop but never reannounces the same episode', () => {
        const next = { ...update, freshAt: '2026-09-25T11:00:00Z' };
        expect(homeAnnouncementKey(update)).not.toBe(homeAnnouncementKey(next));
        expect(homeAnnouncementKey({ ...update, kind: 'episode' })).toBe(
            homeAnnouncementKey({ ...next, kind: 'episode' }),
        );
    });

    it('does not treat timestamp formatting as a new drop', () => {
        expect(homeAnnouncementKey(update)).toBe(
            homeAnnouncementKey({ ...update, freshAt: '2026-09-25T10:00:00.000Z' }),
        );
    });
});
