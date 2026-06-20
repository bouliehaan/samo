// Identity-preserving reconcile for the Home DISPLAY transform — split out from
// home-display.ts (which transitively pulls native modules) so the pure logic
// stays unit-testable, and because it's the load-bearing fix for the cold-boot
// "deload everything then reload everything" flash.

import { type HomeDisplaySection } from '../types/home';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { canonicalArtworkKey } from './artwork-canonical';

/**
 * Value-equality for two display items that treats a rotated cover-art token as
 * "no change". Samo rotates the `stream_token` in every resolved artwork URL
 * (~25 min, and on every re-auth), so the SAME tile gets a brand-new
 * `artworkUrl` string each time `serverConnection` refreshes. Comparing those
 * strings literally makes every tile look "changed" → a fresh object → a full
 * remount of the memoized `HomeMediaTile` → the cold-boot "deload everything
 * then reload everything" flash. Canonicalizing the URL (token stripped) makes
 * the comparison stable across rotations. `url`/`castUrl` get the same treatment
 * for any token-bearing playable that sneaks into a display item.
 */
export const valueEqualIgnoringArtworkToken = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) {
        return true;
    }
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
            return false;
        }
        for (let index = 0; index < a.length; index += 1) {
            if (!valueEqualIgnoringArtworkToken(a[index], b[index])) {
                return false;
            }
        }
        return true;
    }
    const aObject = a as Record<string, unknown>;
    const bObject = b as Record<string, unknown>;
    const aKeys = Object.keys(aObject);
    const bKeys = Object.keys(bObject);
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    for (const key of aKeys) {
        if (!Object.prototype.hasOwnProperty.call(bObject, key)) {
            return false;
        }
        const aValue = aObject[key];
        const bValue = bObject[key];
        if (
            (key === 'artworkUrl' || key === 'url' || key === 'castUrl') &&
            typeof aValue === 'string' &&
            typeof bValue === 'string'
        ) {
            if (canonicalArtworkKey(aValue) !== canonicalArtworkKey(bValue)) {
                return false;
            }
            continue;
        }
        if (!valueEqualIgnoringArtworkToken(aValue, bValue)) {
            return false;
        }
    }
    return true;
};

/**
 * Re-emit `next` display sections but REUSE the previous object reference for
 * every item and section that is value-equal (ignoring token churn) to its
 * prior counterpart. `HomeMediaTile` and `HomeDisplayRow` are memoized by item
 * / section identity, so preserving identity across recomputes (triggered by a
 * `serverConnection` re-auth or the async `recentItems` fill on cold boot) stops
 * the whole page from unmounting and remounting. Same discipline as
 * `reconcileHomeContent`, applied one layer down at the display transform — the
 * layer the content reconciler can't reach.
 */
export const reconcileHomeDisplaySections = (
    previous: HomeDisplaySection[] | undefined,
    next: HomeDisplaySection[],
): HomeDisplaySection[] => {
    if (!previous || previous.length === 0) {
        return next;
    }

    const previousItemsByKey = new Map<string, AndroidRecentContentSourceItem>();
    for (const section of previous) {
        for (const item of section.items) {
            previousItemsByKey.set(getRecentContentItemKey(item), item);
        }
    }
    const previousSectionsByKey = new Map(previous.map((section) => [section.key, section]));

    return next.map((section) => {
        const items = section.items.map((item) => {
            const previousItem = previousItemsByKey.get(getRecentContentItemKey(item));
            return previousItem && valueEqualIgnoringArtworkToken(previousItem, item)
                ? previousItem
                : item;
        });
        const previousSection = previousSectionsByKey.get(section.key);
        if (
            previousSection &&
            previousSection.title === section.title &&
            previousSection.variant === section.variant &&
            previousSection.rowCount === section.rowCount &&
            previousSection.pending === section.pending &&
            previousSection.skeletonCount === section.skeletonCount &&
            previousSection.items.length === items.length &&
            items.every((item, index) => item === previousSection.items[index])
        ) {
            return previousSection;
        }
        return { ...section, items };
    });
};
