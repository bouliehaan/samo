import { loadMobileFullCollection, type MobileHomeItem } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { useEffect, useState } from 'react';

import { getPersistedServerAuthKey } from './persisted-server';

// The catalog mirror deliberately stores no listening progress, so
// mirror-derived audiobook items can never say "you're 40% in". The server's
// audiobooks listing DOES embed per-item progress — this module fetches that
// listing once and caches it, purely to power the Continue Listening shelf.
const CACHE_TTL_MS = 2 * 60 * 1000;

let cache: { authKey: string; items: MobileHomeItem[]; loadedAt: number } | null = null;
let inFlight: Promise<MobileHomeItem[]> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const loadServerAudiobookProgress = (
    authentication: ServerAuthenticationResult,
): Promise<MobileHomeItem[]> => {
    const authKey = getPersistedServerAuthKey(authentication);
    if (cache && cache.authKey === authKey && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
        return Promise.resolve(cache.items);
    }
    if (inFlight) {
        return inFlight;
    }
    inFlight = loadMobileFullCollection({ authentication, variant: 'audiobook' })
        .then((result) => {
            cache = { authKey, items: result.items, loadedAt: Date.now() };
            notify();
            return result.items;
        })
        .catch(() => cache?.items ?? [])
        .finally(() => {
            inFlight = null;
        });
    return inFlight;
};

/**
 * Server-truth audiobook items (with progressSeconds / completionState) for
 * the current connection. Returns the cached snapshot immediately and
 * refreshes it in the background when stale; re-renders when fresh data
 * lands. Empty until the first fetch resolves — shelf consumers just render
 * nothing extra in the meantime.
 */
export const useServerAudiobookProgress = (
    authentication: ServerAuthenticationResult | null,
    enabled: boolean,
): MobileHomeItem[] => {
    const [items, setItems] = useState<MobileHomeItem[]>(() => cache?.items ?? []);

    useEffect(() => {
        if (!enabled || !authentication) {
            return;
        }
        let isStale = false;
        const apply = () => {
            if (!isStale && cache) {
                setItems(cache.items);
            }
        };
        listeners.add(apply);
        void loadServerAudiobookProgress(authentication).then(() => apply());
        return () => {
            isStale = true;
            listeners.delete(apply);
        };
    }, [authentication, enabled]);

    return items;
};
