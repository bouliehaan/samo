import { type SamoHomeHero } from '../server/server-samo-heroes';

type Announcement = Pick<SamoHomeHero, 'kind' | 'target' | 'freshAt'>;

/** Versions belong to the event, not the recommendation copy or visit seed. */
export const homeAnnouncementKey = (hero: Announcement): string =>
    JSON.stringify([
        hero.kind,
        hero.target.type,
        hero.target.id,
        hero.kind === 'episode' ? null : Date.parse(hero.freshAt ?? ''),
    ]);

/** Home on a phone stays quiet unless there is a recent, concrete update. */
export const isFreshHomeAnnouncement = (hero: Announcement, now = Date.now()): boolean => {
    const days =
        hero.kind === 'episode'
            ? 3
            : hero.kind === 'explore'
              ? 7
              : hero.kind === 'wrapped'
                ? 30
                : 0;
    if (!days || !hero.freshAt) return false;
    const age = now - Date.parse(hero.freshAt);
    return Number.isFinite(age) && age >= 0 && age <= days * 86_400_000;
};
