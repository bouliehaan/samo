import clsx from 'clsx';
import { memo, type ReactNode, useMemo } from 'react';

import { type LongFormMediaKind } from './long-form-card';
import styles from './long-form-shelf.module.css';

import {
    GridCarousel,
    type useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import itemCardControlsStyles from '/@/renderer/components/item-card/item-card-controls.module.css';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { LongFormCoverImage } from '/@/renderer/features/player/components/long-form-cover-image';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { useImageRes } from '/@/renderer/store';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

/**
 * One horizontal shelf of books or shows.
 *
 * The audiobook and podcast pages are both "a few shelves, then the whole
 * catalog", and every shelf is the same tile with a different list behind it —
 * so the tile lives here once rather than being copied per shelf per page.
 */

export interface LongFormShelfEntry {
    item: LongFormLibraryItem;
    /** 0–1. Draws the progress bar; omit for an item with nothing to resume. */
    progress?: number;
    subtitle?: string;
    title: string;
}

interface LongFormShelfProps {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    entries: LongFormShelfEntry[];
    kind: LongFormMediaKind;
    onOpen: (item: LongFormLibraryItem) => void;
    server: ServerListItemWithCredential;
    title: ReactNode;
}

const FALLBACK_ICON: Record<LongFormMediaKind, 'metadata' | 'microphone'> = {
    audiobook: 'metadata',
    podcast: 'microphone',
};

export const LongFormShelf = memo(
    ({ containerQuery, entries, kind, onOpen, server, title }: LongFormShelfProps) => {
        const imageRes = useImageRes();
        const cards = useMemo(
            () =>
                entries.map((entry) => ({
                    content: (
                        <div
                            aria-label={entry.title}
                            className={styles.card}
                            onClick={() => onOpen(entry.item)}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                ContextMenuController.call({
                                    cmd: { items: [entry.item], server, type: kind },
                                    event,
                                });
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onOpen(entry.item);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            <div className={styles.art}>
                                <LongFormCoverImage
                                    alt={entry.title}
                                    fallbackIcon={FALLBACK_ICON[kind]}
                                    imageUrl={entry.item.media?.metadata?.imageUrl}
                                    itemId={entry.item.id}
                                    width={imageRes.itemCard}
                                />
                                <div
                                    className={clsx(
                                        itemCardControlsStyles.overlayControls,
                                        styles.overlay,
                                    )}
                                >
                                    <PlayButton
                                        classNames={clsx(itemCardControlsStyles.overlayPlay)}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            onOpen(entry.item);
                                        }}
                                    />
                                </div>
                            </div>
                            <Text className={styles.title} fw={650} lineClamp={2} size="sm">
                                {entry.title}
                            </Text>
                            {entry.subtitle ? (
                                <Text className={styles.subtitle} lineClamp={1} size="sm">
                                    {entry.subtitle}
                                </Text>
                            ) : null}
                            {entry.progress !== undefined ? (
                                <span className={styles.progressTrack}>
                                    <span
                                        className={styles.progressBar}
                                        style={{
                                            width: `${Math.min(100, Math.max(0, entry.progress * 100))}%`,
                                        }}
                                    />
                                </span>
                            ) : null}
                        </div>
                    ),
                    id: entry.item.id,
                })),
            [entries, imageRes.itemCard, kind, onOpen, server],
        );

        if (entries.length === 0) {
            return null;
        }

        return (
            <GridCarousel
                cards={cards}
                containerQuery={containerQuery}
                hasNextPage={false}
                onNextPage={() => {}}
                onPrevPage={() => {}}
                rowCount={1}
                title={
                    <TextTitle fw={700} isNoSelect order={2}>
                        {title}
                    </TextTitle>
                }
            />
        );
    },
);

LongFormShelf.displayName = 'LongFormShelf';
