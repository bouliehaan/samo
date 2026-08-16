import { memo, useMemo } from 'react';

import {
    GridCarousel,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import {
    getFeedEntryProgressFraction,
    PodcastFeedCard,
    usePodcastFeed,
} from '/@/renderer/features/home/components/home-podcast-feed';
import {
    LongFormShelf,
    type LongFormShelfEntry,
} from '/@/renderer/features/long-form/components/long-form-shelf';
import { useRecentItems } from '/@/renderer/store';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

const SHELF_LIMIT = 12;

const showTitle = (item: LongFormLibraryItem) =>
    item.media?.metadata?.title || item.name || 'Untitled';

interface PodcastSectionsProps {
    items: LongFormLibraryItem[];
    onOpen: (item: LongFormLibraryItem) => void;
    server: ServerListItemWithCredential;
}

/**
 * The shelves above the Podcasts grid.
 *
 * Three different questions, which is why it is three shelves rather than one:
 * what am I part-way through (episodes), what is new since I last looked
 * (episodes), and which shows do I actually come back to (shows). The grid
 * below is a show browser only — episodes live up here.
 */
export const PodcastSections = memo(({ items, onOpen, server }: PodcastSectionsProps) => {
    const containerQuery = useGridCarouselContainerQuery();
    const recentItems = useRecentItems();
    const { entries, playEntry } = usePodcastFeed();

    // Started but not finished. A completed episode reports a fraction of 1, so
    // it is filtered out by value rather than needing its own flag.
    const continueEntries = useMemo(
        () =>
            entries
                .filter((entry) => {
                    const fraction = getFeedEntryProgressFraction(entry);
                    return fraction !== undefined && fraction < 1;
                })
                .slice(0, SHELF_LIMIT),
        [entries],
    );

    const recentShows = useMemo<LongFormShelfEntry[]>(() => {
        const byId = new Map(items.map((item) => [item.id, item]));

        return recentItems
            .filter((recent) => recent.mediaType === 'podcast' && recent.serverId === server.id)
            .sort((left, right) => right.selectedAt - left.selectedAt)
            .map((recent) => byId.get(recent.itemId))
            .filter((item): item is LongFormLibraryItem => Boolean(item))
            .slice(0, SHELF_LIMIT)
            .map((item) => ({
                item,
                subtitle: item.numEpisodes
                    ? `${item.numEpisodes} episode${item.numEpisodes === 1 ? '' : 's'}`
                    : undefined,
                title: showTitle(item),
            }));
    }, [items, recentItems, server.id]);

    const continueCards = useMemo(
        () =>
            continueEntries.map((entry) => ({
                content: <PodcastFeedCard entry={entry} onPlay={() => void playEntry(entry)} />,
                id: entry.episode.id,
            })),
        [continueEntries, playEntry],
    );

    const newCards = useMemo(
        () =>
            entries.map((entry) => ({
                content: <PodcastFeedCard entry={entry} onPlay={() => void playEntry(entry)} />,
                id: entry.episode.id,
            })),
        [entries, playEntry],
    );

    if (continueCards.length === 0 && newCards.length === 0 && recentShows.length === 0) {
        return null;
    }

    return (
        <div ref={containerQuery.ref}>
            {continueCards.length > 0 ? (
                <GridCarousel
                    cards={continueCards}
                    containerQuery={containerQuery}
                    hasNextPage={false}
                    onNextPage={() => {}}
                    onPrevPage={() => {}}
                    rowCount={1}
                    title={
                        <TextTitle fw={700} isNoSelect order={2}>
                            Continue Listening
                        </TextTitle>
                    }
                />
            ) : null}
            {newCards.length > 0 ? (
                <GridCarousel
                    cards={newCards}
                    containerQuery={containerQuery}
                    hasNextPage={false}
                    onNextPage={() => {}}
                    onPrevPage={() => {}}
                    rowCount={1}
                    title={
                        <TextTitle fw={700} isNoSelect order={2}>
                            New Episodes
                        </TextTitle>
                    }
                />
            ) : null}
            <LongFormShelf
                containerQuery={containerQuery}
                entries={recentShows}
                kind="podcast"
                onOpen={onOpen}
                server={server}
                title="Recently Played"
            />
        </div>
    );
});

PodcastSections.displayName = 'PodcastSections';
