import { describe, expect, it } from 'vitest';

import { type DownloadEntry, type DownloadStatus } from '../services/download-manager';

import {
    buildSafFileKeySet,
    decideEntry,
    isResurrectableSidecarEntry,
    isSidecarRecoverable,
    safUriMatches,
    sameRegistryById,
} from './download-reconcile';

const entry = (
    over: Partial<DownloadEntry> & Pick<DownloadEntry, 'id'>,
): DownloadEntry => ({
    collection: {
        id: 'col',
        sourceId: 'samo:https://host',
        title: 'Collection',
        type: 'podcast',
    },
    enqueuedAt: 1,
    sourceUrl: 'https://host/stream',
    status: 'completed' as DownloadStatus,
    title: over.title ?? 'Track',
    trackId: over.trackId ?? over.id,
    ...over,
});

describe('sameRegistryById', () => {
    it('is order-insensitive on ids', () => {
        const a = [entry({ id: 'a' }), entry({ id: 'b' })];
        const b = [entry({ id: 'b' }), entry({ id: 'a' })];
        expect(sameRegistryById(a, b)).toBe(true);
    });

    it('detects added / removed ids', () => {
        expect(sameRegistryById([entry({ id: 'a' })], [])).toBe(false);
        expect(
            sameRegistryById([entry({ id: 'a' })], [entry({ id: 'z' })]),
        ).toBe(false);
    });
});

describe('safUriMatches', () => {
    it('matches by full uri, decoded form, and trailing document id', () => {
        const keys = buildSafFileKeySet([
            'content://com.android.externalstorage/tree/ABCD/document/ABCD%3AMusic%2Ftrack.audio',
        ]);
        // exact
        expect(
            safUriMatches(
                keys,
                'content://com.android.externalstorage/tree/ABCD/document/ABCD%3AMusic%2Ftrack.audio',
            ),
        ).toBe(true);
        // same document id, differently expressed by the entry
        expect(safUriMatches(keys, 'ABCD:Music/track.audio')).toBe(true);
        // unrelated file
        expect(safUriMatches(keys, 'ABCD:Music/other.audio')).toBe(false);
    });
});

// A SAF document URI as Android hands them back for a file in the chosen tree —
// the same shape both the entry's localUri and the tree listing carry.
const treeDoc = (name: string): string =>
    'content://com.android.externalstorage.documents/tree/6886-6631%3AMusic' +
    `/document/6886-6631%3AMusic%2F${name}.audio`;

describe('sidecar eligibility', () => {
    // The round-2 bug: "Doomsday (instrumental)" + 2 Johnny Dollar episodes sat
    // in a failed/canceled state, Remove worked, but they came back on the next
    // mount because discovery recovered them from the sidecar. Only completed
    // rows may be recovered, and only completed+file rows may be written.
    it('never resurrects non-completed sidecar rows', () => {
        for (const status of [
            'queued',
            'downloading',
            'failed',
            'canceled',
        ] as DownloadStatus[]) {
            expect(
                isResurrectableSidecarEntry(
                    entry({ id: status, status, localUri: 'content://x/doc/1.audio' }),
                ),
            ).toBe(false);
        }
        expect(
            isResurrectableSidecarEntry(
                entry({ id: 'c', status: 'completed', localUri: 'content://x/doc/1.audio' }),
            ),
        ).toBe(true);
    });

    it('writes only completed rows that have a file into the manifest', () => {
        const rows = [
            entry({ id: 'done', status: 'completed', localUri: 'content://x/doc/1.audio' }),
            entry({ id: 'done-nofile', status: 'completed', localUri: undefined }),
            entry({ id: 'failed', status: 'failed' as DownloadStatus }),
            entry({ id: 'canceled', status: 'canceled' as DownloadStatus }),
            entry({ id: 'queued', status: 'queued' as DownloadStatus }),
        ];
        expect(rows.filter(isSidecarRecoverable).map((e) => e.id)).toEqual(['done']);
    });
});

describe('decideEntry', () => {
    const presentTree = buildSafFileKeySet([treeDoc('here')]);

    it('always keeps rows that have no file yet', () => {
        for (const status of [
            'queued',
            'downloading',
            'failed',
            'canceled',
        ] as DownloadStatus[]) {
            expect(
                decideEntry(entry({ id: status, status }), new Set()).kind,
            ).toBe('keep');
        }
    });

    it('prunes a completed row with no localUri', () => {
        expect(decideEntry(entry({ id: 'x' }), presentTree).kind).toBe('prune');
    });

    it('keeps a content:// row whose file is in the tree', () => {
        expect(
            decideEntry(
                entry({ id: 'x', localUri: treeDoc('here') }),
                presentTree,
            ).kind,
        ).toBe('keep');
    });

    it('prunes a content:// row whose file is gone from the tree', () => {
        expect(
            decideEntry(
                entry({ id: 'x', localUri: treeDoc('here') }),
                buildSafFileKeySet([]),
            ).kind,
        ).toBe('prune');
    });

    it('keeps content:// rows when the tree could not be listed (no false prune)', () => {
        expect(
            decideEntry(
                entry({ id: 'x', localUri: 'content://whatever/doc/1.audio' }),
                null,
            ).kind,
        ).toBe('keep');
    });

    it('defers file:// rows to an on-disk stat', () => {
        const decision = decideEntry(
            entry({ id: 'x', localUri: 'file:///data/x.audio' }),
            presentTree,
        );
        expect(decision).toEqual({ kind: 'stat-file', uri: 'file:///data/x.audio' });
    });

    // The exact bug: a batch of completed downloads on the SD card whose files
    // were deleted (empty tree listing) must all prune, while a still-queued
    // sibling survives. Before the fix these phantoms came back on every mount.
    it('prunes a whole batch of deleted SD-card downloads but spares pending ones', () => {
        const emptyTree = buildSafFileKeySet([]);
        const phantoms = Array.from({ length: 6 }, (_, i) =>
            entry({ id: `jd-${i}`, localUri: treeDoc(`JohnnyDollar_ep${i}`) }),
        );
        const pending = entry({ id: 'pending', status: 'queued' as DownloadStatus });
        const decisions = [...phantoms, pending].map((e) => decideEntry(e, emptyTree));
        expect(decisions.slice(0, 6).every((d) => d.kind === 'prune')).toBe(true);
        expect(decisions[6]!.kind).toBe('keep');
    });
});
