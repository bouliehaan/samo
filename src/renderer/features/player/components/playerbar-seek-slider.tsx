import type { AudiobookChapterListItem } from '/@/renderer/store/audiobook.store';

import formatDuration from 'format-duration';
import { useEffect, useMemo, useRef, useState } from 'react';

import { CustomPlayerbarSlider } from './playerbar-slider';
import styles from './playerbar-slider.module.css';

import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { usePlayerTimestamp } from '/@/renderer/store';
import {
    getOrderedAudiobookChapters,
    useAudiobookActions,
    useAudiobookChapters,
    useAudiobookDuration,
    useAudiobookPosition,
} from '/@/renderer/store/audiobook.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import {
    usePodcastActions,
    usePodcastDuration,
    usePodcastPosition,
} from '/@/renderer/store/podcast.store';

interface PlayerbarSeekSliderProps {
    max: number;
    min: number;
}

const MAX_CHAPTER_SEGMENTS = 120;

interface ChapterSeekbarSegment {
    fillPercentage: number;
    leftPercentage: number;
    widthPercentage: number;
}

const getChapterSeekbarSegments = (
    chapters: AudiobookChapterListItem[],
    duration: number,
    progress: number,
): ChapterSeekbarSegment[] => {
    if (chapters.length <= 1 || chapters.length > MAX_CHAPTER_SEGMENTS) {
        return [];
    }

    const clampedProgress = Math.min(Math.max(progress, 0), duration);

    return chapters.map((chapter) => ({
        fillPercentage:
            ((Math.min(Math.max(clampedProgress, chapter.start), chapter.end) - chapter.start) /
                chapter.duration) *
            100,
        leftPercentage: (chapter.start / duration) * 100,
        widthPercentage: (chapter.duration / duration) * 100,
    }));
};

export const PlayerbarSeekSlider = ({ max, min }: PlayerbarSeekSliderProps) => {
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);
    const musicCurrentTime = usePlayerTimestamp();
    const source = usePlaybackSource();
    const audiobookChapters = useAudiobookChapters();
    const audiobookPosition = useAudiobookPosition();
    const audiobookDuration = useAudiobookDuration();
    const audiobookActions = useAudiobookActions();
    const podcastPosition = usePodcastPosition();
    const podcastDuration = usePodcastDuration();
    const podcastActions = usePodcastActions();
    const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSeekValueRef = useRef<null | number>(null);

    const { mediaSeekToTimestamp } = usePlayer();

    const isAudiobookMode = source === 'audiobook';
    const isPodcastMode = source === 'podcast';
    const isRadioMode = source === 'radio';
    const currentTime = isAudiobookMode
        ? audiobookPosition
        : isPodcastMode
          ? podcastPosition
          : musicCurrentTime;
    const sliderMax = isAudiobookMode
        ? audiobookDuration > 0
            ? audiobookDuration
            : max
        : isPodcastMode
          ? podcastDuration > 0
              ? podcastDuration
              : max
          : max;
    const displayedValue = isSeeking
        ? seekValue
        : lastSeekValueRef.current !== null &&
            Math.abs(currentTime - lastSeekValueRef.current) > 0.5
          ? lastSeekValueRef.current
          : currentTime;
    const chapterSegments = useMemo(() => {
        if (!isAudiobookMode) return [];
        const chapters = getOrderedAudiobookChapters(audiobookChapters, sliderMax);
        return getChapterSeekbarSegments(chapters, sliderMax, displayedValue);
    }, [audiobookChapters, displayedValue, isAudiobookMode, sliderMax]);
    const hasChapterSegments = chapterSegments.length > 1;

    const handleSeekToTimestamp = (timestamp: number) => {
        if (isRadioMode) return;

        // Optimistically update the per-source store position so the slider
        // doesn't snap back while the engine catches up.
        if (isAudiobookMode) {
            audiobookActions.seekTo(timestamp);
        } else if (isPodcastMode) {
            podcastActions.seekTo(timestamp);
        }

        mediaSeekToTimestamp(timestamp);
    };

    // Sync isSeeking state when currentTime catches up to seek value
    useEffect(() => {
        if (isSeeking && lastSeekValueRef.current !== null) {
            const timeDiff = Math.abs(currentTime - lastSeekValueRef.current);
            if (timeDiff < 0.5) {
                setIsSeeking(false);
                lastSeekValueRef.current = null;
                if (seekTimeoutRef.current) {
                    clearTimeout(seekTimeoutRef.current);
                    seekTimeoutRef.current = null;
                }
            }
        }
    }, [currentTime, isSeeking]);

    useEffect(() => {
        return () => {
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
            }
        };
    }, []);

    if (isRadioMode) {
        return (
            <CustomPlayerbarSlider
                disabled
                label="LIVE"
                max={1}
                min={0}
                onClick={(e) => {
                    e?.stopPropagation();
                }}
                size={6}
                value={1}
                w="100%"
            />
        );
    }

    const slider = (
        <CustomPlayerbarSlider
            className={hasChapterSegments ? styles.segmentedSlider : undefined}
            label={(value) => formatDuration(value * 1000)}
            max={sliderMax}
            min={min}
            onChange={(e) => {
                // Cancel any pending timeout if user starts seeking again
                if (seekTimeoutRef.current) {
                    clearTimeout(seekTimeoutRef.current);
                    seekTimeoutRef.current = null;
                }
                setIsSeeking(true);
                setSeekValue(e);
            }}
            onChangeEnd={(e) => {
                setSeekValue(e);
                lastSeekValueRef.current = e;
                handleSeekToTimestamp(e);

                if (seekTimeoutRef.current) {
                    clearTimeout(seekTimeoutRef.current);
                }

                // Keep isSeeking true to prevent slider from snapping back.
                // The useEffect will detect when currentTime catches up and clear isSeeking.
                // Also set a fallback timeout to clear isSeeking after a max delay
                // in case the seek doesn't complete (e.g., network issues).
                seekTimeoutRef.current = setTimeout(() => {
                    setIsSeeking(false);
                    lastSeekValueRef.current = null;
                    seekTimeoutRef.current = null;
                }, 1000);
            }}
            onClick={(e) => {
                e?.stopPropagation();
            }}
            size={6}
            value={displayedValue}
            w="100%"
        />
    );

    if (!hasChapterSegments) {
        return slider;
    }

    return (
        <div className={styles.chapterSeekWrapper}>
            <div aria-hidden className={styles.chapterSegments}>
                {chapterSegments.map((segment, index) => (
                    <div
                        className={styles.chapterSegment}
                        key={`${segment.leftPercentage}-${segment.widthPercentage}`}
                        style={{
                            left: `${segment.leftPercentage}%`,
                            paddingRight: index === chapterSegments.length - 1 ? 0 : 2,
                            width: `${segment.widthPercentage}%`,
                        }}
                    >
                        <div className={styles.chapterSegmentTrack}>
                            <div
                                className={styles.chapterSegmentFill}
                                style={{ width: `${segment.fillPercentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {slider}
        </div>
    );
};
