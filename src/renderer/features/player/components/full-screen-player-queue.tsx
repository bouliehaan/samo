import clsx from 'clsx';
import formatDuration from 'format-duration';
import { motion } from 'motion/react';
import { CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './full-screen-player-queue.module.css';

import { Lyrics } from '/@/renderer/features/lyrics/lyrics';
import { PlayQueue } from '/@/renderer/features/now-playing/components/play-queue';
import { FullScreenSimilarSongs } from '/@/renderer/features/player/components/full-screen-similar-songs';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useIsVisualizerAvailable } from '/@/renderer/features/player/hooks/use-is-visualizer-available';
import { VisualizerSurface } from '/@/renderer/features/visualizer/components/visualizer-surface';
import {
    getOrderedAudiobookChapters,
    useAudiobookActions,
    useAudiobookChapters,
    useAudiobookDuration,
    useAudiobookPosition,
} from '/@/renderer/store/audiobook.store';
import {
    useFullScreenPlayerStore,
    useFullScreenPlayerStoreActions,
} from '/@/renderer/store/full-screen-player.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { ItemListKey } from '/@/shared/types/types';

const formatChapterTime = (seconds: number) => formatDuration(Math.max(0, seconds) * 1000 || 0);

const FullScreenVisualizerPane = ({ isAvailable }: { isAvailable: boolean }) => {
    if (!isAvailable) return null;

    return <VisualizerSurface />;
};

const FullScreenAudiobookChapters = () => {
    const audiobookChapters = useAudiobookChapters();
    const audiobookDuration = useAudiobookDuration();
    const audiobookPosition = useAudiobookPosition();
    const audiobookActions = useAudiobookActions();
    const { mediaSeekToTimestamp } = usePlayer();

    const chapters = useMemo(
        () => getOrderedAudiobookChapters(audiobookChapters, audiobookDuration),
        [audiobookChapters, audiobookDuration],
    );

    const activeChapterIndex = chapters.findIndex((chapter, index) => {
        const isLastChapter = index === chapters.length - 1;
        return (
            audiobookPosition >= chapter.start &&
            (audiobookPosition < chapter.end ||
                (isLastChapter && audiobookPosition <= audiobookDuration))
        );
    });

    return (
        <div className={styles.longFormPanel}>
            <ScrollArea className={styles.chapterList}>
                {chapters.map((chapter, index) => {
                    const isActive = index === activeChapterIndex;
                    const title = chapter.chapter.title?.trim() || `Chapter ${index + 1}`;

                    return (
                        <button
                            aria-current={isActive ? 'true' : undefined}
                            className={styles.chapterRow}
                            key={`${chapter.originalIndex}-${chapter.start}`}
                            onClick={() => {
                                audiobookActions.seekTo(chapter.start);
                                mediaSeekToTimestamp(chapter.start);
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
        </div>
    );
};

export const FullScreenPlayerQueue = () => {
    const { t } = useTranslation();
    const { activeTab } = useFullScreenPlayerStore();
    const { setStore } = useFullScreenPlayerStoreActions();
    const isVisualizerAvailable = useIsVisualizerAvailable();
    const playbackSource = usePlaybackSource();
    const isMusicMode = playbackSource == null || playbackSource === 'music';
    const isAudiobookMode = playbackSource === 'audiobook';
    const isPodcastMode = playbackSource === 'podcast';
    const isRadioMode = playbackSource === 'radio';

    const headerItems = useMemo(() => {
        const items = [
            {
                active: activeTab === 'queue',
                label: t('page.fullscreenPlayer.upNext'),
                onClick: () => setStore({ activeTab: 'queue' }),
            },
            {
                active: activeTab === 'related',
                label: t('page.fullscreenPlayer.related'),
                onClick: () => setStore({ activeTab: 'related' }),
            },
            {
                active: activeTab === 'lyrics',
                label: t('page.fullscreenPlayer.lyrics'),
                onClick: () => setStore({ activeTab: 'lyrics' }),
            },
        ];

        if (isVisualizerAvailable) {
            items.push({
                active: activeTab === 'visualizer',
                label: t('page.fullscreenPlayer.visualizer', { postProcess: 'titleCase' }),
                onClick: () => setStore({ activeTab: 'visualizer' }),
            });
        }

        return items;
    }, [activeTab, isVisualizerAvailable, setStore, t]);

    const renderContent = () => {
        if (isAudiobookMode) {
            return <FullScreenAudiobookChapters />;
        }

        if (isPodcastMode || isRadioMode) {
            return <FullScreenVisualizerPane isAvailable={isVisualizerAvailable} />;
        }

        return activeTab === 'queue' ? (
            <div className={styles.queueContainer}>
                <PlayQueue
                    enableScrollShadow={false}
                    listKey={ItemListKey.FULL_SCREEN}
                    searchTerm={undefined}
                />
            </div>
        ) : activeTab === 'related' ? (
            <div className={styles.queueContainer}>
                <FullScreenSimilarSongs />
            </div>
        ) : activeTab === 'lyrics' ? (
            <Lyrics />
        ) : activeTab === 'visualizer' && isVisualizerAvailable ? (
            <FullScreenVisualizerPane isAvailable={isVisualizerAvailable} />
        ) : null;
    };

    return (
        <div
            className={clsx(
                styles.gridContainer,
                !isMusicMode && styles.noHeader,
                'full-screen-player-queue-container',
            )}
            style={
                {
                    '--opacity': 0,
                } as CSSProperties
            }
        >
            {isMusicMode && (
                <Group
                    align="center"
                    className="full-screen-player-queue-header"
                    gap={0}
                    grow
                    justify="center"
                    pb="md"
                >
                    {headerItems.map((item) => (
                        <div className={styles.headerItemWrapper} key={`tab-${item.label}`}>
                            <Button
                                flex={1}
                                fw="600"
                                onClick={item.onClick}
                                pos="relative"
                                size="lg"
                                uppercase
                                variant="transparent"
                            >
                                {item.label}
                            </Button>
                            {item.active ? (
                                <motion.div
                                    className={styles.activeTabIndicator}
                                    layoutId="underline"
                                />
                            ) : null}
                        </div>
                    ))}
                </Group>
            )}
            {renderContent()}
        </div>
    );
};
