import formatDuration from 'format-duration';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './audiobook-chapter-list.module.css';

import {
    getCurrentChapterIndex,
    getOrderedAudiobookChapters,
} from '/@/renderer/store/audiobook.store';
import { LongFormChapter } from '/@/shared/api/long-form-types';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

const formatChapterTime = (seconds: number) => formatDuration(Math.max(0, seconds) * 1000 || 0);

interface AudiobookChapterListProps {
    /**
     * Playhead of the *currently playing* book, or undefined when this page is
     * not the active audiobook — so an unplayed book highlights nothing.
     */
    activePosition?: number;
    chapters: LongFormChapter[];
    duration: number;
    onSelect: (startSeconds: number) => void;
}

/**
 * Chapters are a plain list rather than a virtualized one on purpose: the row
 * count is bounded by how many chapters a book has (tens, occasionally a few
 * hundred) and each row is text only. The costs virtualization exists to avoid
 * here — cover decode and image upload — do not apply. The episode list and the
 * library grids, which are unbounded and image-bearing, are virtualized.
 */
export const AudiobookChapterList = ({
    activePosition,
    chapters,
    duration,
    onSelect,
}: AudiobookChapterListProps) => {
    const { t } = useTranslation();

    const orderedChapters = useMemo(
        () => getOrderedAudiobookChapters(chapters, duration),
        [chapters, duration],
    );

    const activeIndex = useMemo(() => {
        if (activePosition === undefined) return -1;
        return getCurrentChapterIndex(
            orderedChapters.map((entry) => entry.chapter),
            activePosition,
            duration,
        );
    }, [activePosition, duration, orderedChapters]);

    if (orderedChapters.length <= 1) {
        return null;
    }

    return (
        <Stack gap="sm">
            <Text fw={600} size="md">
                {t('entity.chapterWithCount', {
                    count: orderedChapters.length,
                    postProcess: 'sentenceCase',
                })}
            </Text>
            <div className={styles.chapterList}>
                {orderedChapters.map((entry, index) => {
                    const isActive = index === activeIndex;
                    const title =
                        entry.chapter.title?.trim() ||
                        t('entity.chapterNumber', {
                            number: index + 1,
                            postProcess: 'sentenceCase',
                        });

                    return (
                        <button
                            aria-current={isActive ? 'true' : undefined}
                            className={styles.chapterRow}
                            key={`${entry.originalIndex}-${entry.start}`}
                            onClick={() => onSelect(entry.start)}
                            type="button"
                        >
                            <span className={styles.chapterIndex}>
                                {isActive ? (
                                    <Icon icon="mediaPlay" size="sm" />
                                ) : (
                                    <span className={styles.chapterNumber}>{index + 1}</span>
                                )}
                            </span>
                            <span className={styles.chapterTitle}>{title}</span>
                            <span className={styles.chapterMeta}>
                                {formatChapterTime(entry.start)}
                            </span>
                            <span className={styles.chapterMeta}>
                                {formatChapterTime(entry.duration)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </Stack>
    );
};
