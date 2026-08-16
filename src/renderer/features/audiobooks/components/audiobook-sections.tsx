import { memo, useMemo } from 'react';

import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { audiobookProgressFraction } from '/@/renderer/features/audiobooks/utils/audiobook-progress';
import {
    LongFormShelf,
    type LongFormShelfEntry,
} from '/@/renderer/features/long-form/components/long-form-shelf';
import { useAudiobookResumePositions, useRecentItems } from '/@/renderer/store';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

const SHELF_LIMIT = 12;

const audiobookTitle = (item: LongFormLibraryItem) =>
    item.media?.metadata?.title || item.name || 'Untitled';

const audiobookAuthor = (item: LongFormLibraryItem) => {
    const metadata = item.media?.metadata;
    return metadata?.author || metadata?.authors?.map((author) => author.name).join(', ') || '';
};

interface AudiobookSectionsProps {
    items: LongFormLibraryItem[];
    onOpen: (item: LongFormLibraryItem) => void;
    server: ServerListItemWithCredential;
}

/**
 * The shelves above the Audiobooks grid: what you are part-way through, then
 * what you came back to most recently. Both are drawn from the same library
 * listing the grid below uses, so neither costs an extra request.
 */
export const AudiobookSections = memo(({ items, onOpen, server }: AudiobookSectionsProps) => {
    const containerQuery = useGridCarouselContainerQuery();
    const recentItems = useRecentItems();
    const resumePositions = useAudiobookResumePositions();

    const continueEntries = useMemo<LongFormShelfEntry[]>(() => {
        // Most recently opened first. The saved playhead carries no timestamp,
        // so recency comes from the play history — a book you have never opened
        // on this machine sorts last rather than being dropped, because it can
        // still have a position from the detail route.
        const recencyById = new Map(
            recentItems
                .filter((recent) => recent.mediaType === 'audiobook')
                .map((recent) => [recent.itemId, recent.selectedAt]),
        );

        return items
            .map((item) => ({
                item,
                progress: audiobookProgressFraction(item, resumePositions[item.id]),
            }))
            .filter((entry) => entry.progress !== undefined)
            .sort(
                (left, right) =>
                    (recencyById.get(right.item.id) ?? 0) - (recencyById.get(left.item.id) ?? 0),
            )
            .slice(0, SHELF_LIMIT)
            .map((entry) => ({
                item: entry.item,
                progress: entry.progress,
                subtitle: audiobookAuthor(entry.item),
                title: audiobookTitle(entry.item),
            }));
    }, [items, recentItems, resumePositions]);

    const recentEntries = useMemo<LongFormShelfEntry[]>(() => {
        const byId = new Map(items.map((item) => [item.id, item]));
        const continueIds = new Set(continueEntries.map((entry) => entry.item.id));

        return (
            recentItems
                .filter(
                    (recent) => recent.mediaType === 'audiobook' && recent.serverId === server.id,
                )
                .sort((left, right) => right.selectedAt - left.selectedAt)
                .map((recent) => byId.get(recent.itemId))
                .filter((item): item is LongFormLibraryItem => Boolean(item))
                // Whatever is already in Continue Listening does not need a second
                // tile eight inches to the right of the first one.
                .filter((item) => !continueIds.has(item.id))
                .slice(0, SHELF_LIMIT)
                .map((item) => ({
                    item,
                    subtitle: audiobookAuthor(item),
                    title: audiobookTitle(item),
                }))
        );
    }, [continueEntries, items, recentItems, server.id]);

    if (continueEntries.length === 0 && recentEntries.length === 0) {
        return null;
    }

    return (
        <div ref={containerQuery.ref}>
            <LongFormShelf
                containerQuery={containerQuery}
                entries={continueEntries}
                kind="audiobook"
                onOpen={onOpen}
                server={server}
                title="Continue Listening"
            />
            <LongFormShelf
                containerQuery={containerQuery}
                entries={recentEntries}
                kind="audiobook"
                onOpen={onOpen}
                server={server}
                title="Recently Played"
            />
        </div>
    );
});

AudiobookSections.displayName = 'AudiobookSections';
