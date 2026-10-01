import {
    homeAnnouncementKey,
    loadMobileHomeHeroesForServers,
    type MobileHomeItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { fsGetItem, fsSetItem } from './fs-storage';

interface HeroVisit {
    history: string[];
    seen: string[];
    session: string;
}

const visits = new Map<string, Promise<HeroVisit>>();

export const homeHeroAccountKey = (auth: ServerAuthenticationResult): string =>
    `${auth.serverId ?? auth.connectionKey ?? auth.url}:${auth.userId ?? auth.username}`;

/** A cold launch or a return after being away starts a new recommendation visit. */
export const beginHomeHeroVisit = (): void => visits.clear();

const getVisit = (key: string): Promise<HeroVisit> => {
    let pending = visits.get(key);
    if (!pending) {
        pending = (async () => {
            let seen: string[] = [];
            try {
                const raw = await fsGetItem(`home-announcements-v1:${key}`);
                const parsed: unknown = raw ? JSON.parse(raw) : [];
                if (Array.isArray(parsed)) {
                    seen = parsed
                        .filter((value): value is string => typeof value === 'string')
                        .slice(0, 256);
                }
            } catch {
                // History is a preference, never a prerequisite for Home.
            }
            return {
                history: seen,
                seen,
                session: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
            };
        })();
        visits.set(key, pending);
    }
    return pending;
};

export const loadHomeHeroRecommendation = async (
    authentication: ServerAuthenticationResult,
): Promise<MobileHomeItem[]> => {
    const key = homeHeroAccountKey(authentication);
    const pending = getVisit(key);
    const visit = await pending;
    const items = await loadMobileHomeHeroesForServers({
        authentication,
        session: visit.session,
        announcements: { seen: visit.seen },
    });
    // A request from a previous foreground visit cannot select the next visit's hero.
    if (visits.get(key) !== pending) throw new Error('Hero visit changed');
    return items.slice(0, 1);
};

/** Called when a selected card is actually mounted, not merely fetched. */
export const recordHomeHeroShown = async (
    authentication: ServerAuthenticationResult,
    item: MobileHomeItem,
): Promise<void> => {
    const target = item.hero?.target;
    if (!target) return;
    const key = homeHeroAccountKey(authentication);
    const pending = getVisit(key);
    const visit = await pending;
    if (visits.get(key) !== pending) return;
    const targetKey = homeAnnouncementKey(item.hero!);
    if (visit.history[0] === targetKey) return;
    visit.history = [targetKey, ...visit.history.filter((id) => id !== targetKey)].slice(0, 256);
    await fsSetItem(`home-announcements-v1:${key}`, JSON.stringify(visit.history));
};
