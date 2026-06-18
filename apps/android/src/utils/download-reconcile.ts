import { type DownloadEntry } from '../services/download-manager';

// Pure helpers for reconciling the downloads registry against the files that
// actually exist on disk. Discovery used to trust any registry/sidecar row and
// hand it straight back to the native owner via replaceAll(); a `completed` row
// whose file had been deleted therefore reappeared in the Downloads list on
// every screen mount and survived "Delete all downloads" forever (the sidecar
// re-proposed it each time). These functions encode the keep/prune decision so
// the manager only resurrects rows whose bytes are genuinely present.
//
// All I/O (statting a file:// path, listing the SAF tree) is injected by the
// caller so this module stays unit-testable with no native-module dependency,
// matching the pure-logic test pattern used elsewhere in apps/android.

/** True when both lists hold exactly the same entry ids (order-insensitive). */
export const sameRegistryById = (
    a: DownloadEntry[],
    b: DownloadEntry[],
): boolean => {
    if (a.length !== b.length) return false;
    const ids = new Set(a.map((entry) => entry.id));
    return b.every((entry) => ids.has(entry.id));
};

/**
 * Index a SAF document URI under several keys so a stored `localUri` can be
 * matched tolerantly: the raw URI, its percent-decoded form, and the trailing
 * path segment (the document id) in both forms. The same `.audio` document
 * listed by the tree and stored on the entry can differ only in encoding, so
 * matching on any of these is safe and avoids false prunes.
 */
export const addSafUriKeys = (set: Set<string>, uri: string): void => {
    if (!uri) return;
    set.add(uri);
    try {
        set.add(decodeURIComponent(uri));
    } catch {
        // ignore malformed escapes
    }
    const tail = uri.split('/').pop();
    if (tail) {
        set.add(tail);
        try {
            set.add(decodeURIComponent(tail));
        } catch {
            // ignore
        }
    }
};

/** Build the lookup set for an enumerated SAF tree's `.audio` document URIs. */
export const buildSafFileKeySet = (uris: string[]): Set<string> => {
    const set = new Set<string>();
    for (const uri of uris) addSafUriKeys(set, uri);
    return set;
};

/** Whether a content:// `localUri` corresponds to a file present in the tree. */
export const safUriMatches = (keys: Set<string>, uri: string): boolean => {
    if (keys.has(uri)) return true;
    try {
        if (keys.has(decodeURIComponent(uri))) return true;
    } catch {
        // ignore
    }
    const tail = uri.split('/').pop();
    if (!tail) return false;
    if (keys.has(tail)) return true;
    try {
        return keys.has(decodeURIComponent(tail));
    } catch {
        return false;
    }
};

/**
 * Whether a sidecar row is eligible to be recovered back into the registry.
 * Only FINISHED downloads qualify: a queued / downloading / failed / canceled
 * row has no file to recover, so resurrecting it would just revive an entry the
 * user already removed (and it would slip past the file-existence prune, which
 * only judges `completed` rows). This is the guard that stops failed/canceled
 * "phantoms" from reappearing on every Downloads-screen mount.
 */
export const isResurrectableSidecarEntry = (entry: DownloadEntry): boolean =>
    entry.status === 'completed';

/**
 * Rows the sidecar manifest should persist: completed downloads that point at a
 * file. Keeping anything else out of the manifest means there's nothing for
 * discovery to wrongly recover in the first place.
 */
export const isSidecarRecoverable = (entry: DownloadEntry): boolean =>
    entry.status === 'completed' && !!entry.localUri;

export type ReconcileDecision =
    | { kind: 'keep' }
    | { kind: 'prune' }
    | { kind: 'stat-file'; uri: string };

/**
 * Decide what to do with one entry given the set of files known to exist in the
 * chosen SAF tree (or `null` when the tree couldn't be enumerated).
 *
 * - Non-`completed` rows (queued / downloading / failed / canceled) have no file
 *   yet and are always kept.
 * - A `completed` row with no `localUri` can never play → prune.
 * - A content:// row is kept iff its file is still in the tree. When the tree
 *   couldn't be listed (`safFileKeys === null`) it is kept, to avoid a false
 *   prune of real downloads on a transient SAF failure.
 * - A file:// (or bare-path) row needs an async stat the caller performs.
 */
export const decideEntry = (
    entry: DownloadEntry,
    safFileKeys: Set<string> | null,
): ReconcileDecision => {
    if (entry.status !== 'completed') return { kind: 'keep' };
    const uri = entry.localUri;
    if (!uri) return { kind: 'prune' };
    if (uri.startsWith('content://')) {
        if (safFileKeys === null) return { kind: 'keep' };
        return safUriMatches(safFileKeys, uri) ? { kind: 'keep' } : { kind: 'prune' };
    }
    return { kind: 'stat-file', uri };
};
