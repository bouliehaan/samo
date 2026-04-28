import formatDuration from 'format-duration';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './audiobook-chapter-list-button.module.css';

import { usePlayer } from '/@/renderer/features/player/context/player-context';
import {
    getOrderedAudiobookChapters,
    useAudiobookActions,
    useAudiobookChapters,
    useAudiobookDuration,
    useAudiobookPosition,
} from '/@/renderer/store/audiobook.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Popover } from '/@/shared/components/popover/popover';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';

const formatChapterTime = (seconds: number) => formatDuration(Math.max(0, seconds) * 1000 || 0);

export const AudiobookChapterListButton = () => {
    const { t } = useTranslation();
    const [opened, setOpened] = useState(false);
    const source = usePlaybackSource();
    const audiobookChapters = useAudiobookChapters();
    const audiobookDuration = useAudiobookDuration();
    const audiobookPosition = useAudiobookPosition();
    const audiobookActions = useAudiobookActions();
    const { mediaSeekToTimestamp } = usePlayer();

    const chapters = useMemo(
        () => getOrderedAudiobookChapters(audiobookChapters, audiobookDuration),
        [audiobookChapters, audiobookDuration],
    );

    if (source !== 'audiobook' || chapters.length <= 1) {
        return null;
    }

    const activeChapterIndex = chapters.findIndex((chapter, index) => {
        const isLastChapter = index === chapters.length - 1;
        return (
            audiobookPosition >= chapter.start &&
            (audiobookPosition < chapter.end ||
                (isLastChapter && audiobookPosition <= audiobookDuration))
        );
    });

    const handleChapterSelect = (start: number) => {
        audiobookActions.seekTo(start);
        mediaSeekToTimestamp(start);
        setOpened(false);
    };

    return (
        <Popover onChange={setOpened} opened={opened} position="top-end" width={360}>
            <Popover.Target>
                <ActionIcon
                    icon="metadata"
                    iconProps={{
                        color: opened ? 'primary' : undefined,
                        size: 'lg',
                    }}
                    onClick={(event) => {
                        event.stopPropagation();
                        setOpened((prev) => !prev);
                    }}
                    size="sm"
                    tooltip={{
                        label: t('player.chapters', {
                            defaultValue: 'Chapters',
                            postProcess: 'titleCase',
                        }),
                        openDelay: 0,
                    }}
                    variant="subtle"
                />
            </Popover.Target>
            <Popover.Dropdown
                onClick={(event) => {
                    event.stopPropagation();
                }}
                p="xs"
            >
                <div className={styles.header}>
                    {t('player.chapters', {
                        defaultValue: 'Chapters',
                        postProcess: 'titleCase',
                    })}
                </div>
                <ScrollArea className={styles.chapterList}>
                    {chapters.map((chapter, index) => {
                        const isActive = index === activeChapterIndex;
                        const title = chapter.chapter.title?.trim() || `Chapter ${index + 1}`;

                        return (
                            <button
                                aria-current={isActive ? 'true' : undefined}
                                className={styles.chapterRow}
                                key={`${chapter.originalIndex}-${chapter.start}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleChapterSelect(chapter.start);
                                }}
                                type="button"
                            >
                                <span className={styles.chapterIndicator} />
                                <span className={styles.chapterText}>
                                    <span className={styles.chapterTitle}>{title}</span>
                                    <span className={styles.chapterMeta}>
                                        {formatChapterTime(chapter.start)}
                                        <span aria-hidden> · </span>
                                        {formatChapterTime(chapter.duration)}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </ScrollArea>
            </Popover.Dropdown>
        </Popover>
    );
};
