import clsx from 'clsx';
import isElectron from 'is-electron';
import { useCallback, useEffect, useRef } from 'react';

import styles from './synchronized-lyrics.module.css';

import { LyricLine } from '/@/renderer/features/lyrics/lyric-line';
import {
    useLyricsDisplaySettings,
    useLyricsSettings,
    usePlaybackType,
    usePlayerActions,
    usePlayerStatus,
} from '/@/renderer/store';
import { usePlayerTimestamp } from '/@/renderer/store/timestamp.store';
import { FullLyricsMetadata, SynchronizedLyricsArray } from '/@/shared/types/domain-types';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';

const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;
const utils = isElectron() ? window.api.utils : null;
const mpris = isElectron() && utils?.isLinux() ? window.api.mpris : null;

export interface SynchronizedLyricsProps extends Omit<FullLyricsMetadata, 'lyrics'> {
    lyrics: SynchronizedLyricsArray;
    offsetMs?: number;
    settingsKey?: string;
    style?: React.CSSProperties;
    translatedLyrics?: null | string;
}

export const SynchronizedLyrics = ({
    lyrics,
    offsetMs,
    settingsKey = 'default',
    style,
    translatedLyrics,
}: SynchronizedLyricsProps) => {
    const playbackType = usePlaybackType();
    const lyricsSettings = useLyricsSettings();
    const displaySettings = useLyricsDisplaySettings(settingsKey);
    const settings = {
        ...lyricsSettings,
        fontSize:
            displaySettings.fontSize && displaySettings.fontSize !== 0
                ? displaySettings.fontSize
                : 24,
        gap: displaySettings.gap && displaySettings.gap !== 0 ? displaySettings.gap : 24,
        opacityNonActive: displaySettings.opacityNonActive,
        scaleNonActive:
            displaySettings.scaleNonActive && displaySettings.scaleNonActive !== 0
                ? displaySettings.scaleNonActive
                : 0.95,
    };
    const { mediaSeekToTimestamp } = usePlayerActions();
    const status = usePlayerStatus();
    const timestamp = usePlayerTimestamp();
    const timestampRef = useRef(timestamp);

    const effectiveOffsetMs = offsetMs ?? 0;

    const handleSeek = useCallback(
        (time: number) => {
            if (playbackType === PlayerType.LOCAL && mpvPlayer) {
                mpvPlayer.seekTo(time);
            } else {
                mpris?.updateSeek(time);
                mediaSeekToTimestamp(time);
            }
        },
        [mediaSeekToTimestamp, playbackType],
    );

    // A reference to the timeout handler
    const lyricTimer = useRef<null | ReturnType<typeof setTimeout>>(null);

    // A reference to the lyrics. This is necessary for the
    // timers, which are not part of react necessarily, to always
    // have the most updated values
    const lyricRef = useRef<null | SynchronizedLyricsArray>(null);

    const activeIndexRef = useRef<number>(-1);

    // A constantly increasing value, used to tell timers that may be out of date
    // whether to proceed or stop
    const timerEpoch = useRef(0);

    const delayMsRef = useRef(effectiveOffsetMs);
    const followRef = useRef(settings.follow);
    const userScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const programmaticScrollRef = useRef(false);
    const ignoreScrollUntilRef = useRef(0);

    useEffect(() => {
        timestampRef.current = timestamp;
    }, [timestamp]);

    const getCurrentLyric = (timeInMs: number) => {
        if (lyricRef.current) {
            const activeLyrics = lyricRef.current;
            for (let idx = 0; idx < activeLyrics.length; idx += 1) {
                if (timeInMs < activeLyrics[idx][0]) {
                    return idx === 0 ? idx : idx - 1;
                }
            }

            return activeLyrics.length - 1;
        }

        return -1;
    };

    const getCenteredScrollTop = useCallback((container: HTMLElement, lyric: HTMLElement) => {
        return lyric.offsetTop + lyric.clientHeight / 2 - container.clientHeight / 2 + 15;
    }, []);

    const setCurrentLyricRef = useRef<
        (timeInMs: number, epoch?: number, targetIndex?: number) => void
    >(() => {});

    const setCurrentLyric = useCallback(
        (timeInMs: number, epoch?: number, targetIndex?: number) => {
            const start = performance.now();
            let nextEpoch: number;

            if (epoch === undefined) {
                timerEpoch.current = (timerEpoch.current + 1) % 10000;
                nextEpoch = timerEpoch.current;
            } else if (epoch !== timerEpoch.current) {
                return;
            } else {
                nextEpoch = epoch;
            }

            const index = targetIndex ?? getCurrentLyric(timeInMs);
            const isSameActiveLine = activeIndexRef.current === index;

            const container = containerRef.current;
            if (!container) {
                return;
            }

            if (index === -1) {
                if (!isSameActiveLine) {
                    container
                        .querySelectorAll('.active')
                        .forEach((node) => node.classList.remove('active'));
                    activeIndexRef.current = -1;
                }
                return;
            }

            if (!isSameActiveLine) {
                // Directly modify this lyrics pane instead of using React to prevent rerender.
                container
                    .querySelectorAll('.active')
                    .forEach((node) => node.classList.remove('active'));

                const currentLyric = container.querySelector<HTMLElement>(
                    `[data-lyric-index="${index}"]`,
                );

                if (currentLyric === null) {
                    return;
                }

                const offsetTop = getCenteredScrollTop(container, currentLyric);

                currentLyric.classList.add('active');
                activeIndexRef.current = index;

                if (followRef.current) {
                    userScrollingRef.current = false;
                    programmaticScrollRef.current = true;
                    ignoreScrollUntilRef.current = performance.now() + 500;
                    container.scrollTop = offsetTop;
                    setTimeout(() => {
                        programmaticScrollRef.current = false;
                    }, 500);
                }
            }

            if (index !== lyricRef.current!.length - 1) {
                const nextTime = lyricRef.current![index + 1][0];
                const elapsed = performance.now() - start;
                const delayMs = Math.max(0, nextTime - timeInMs - elapsed);
                const scheduledFor = performance.now() + delayMs;

                lyricTimer.current = setTimeout(() => {
                    const driftMs = Math.max(0, performance.now() - scheduledFor);
                    setCurrentLyricRef.current(nextTime + driftMs, nextEpoch);
                }, delayMs);
            }
        },
        [getCenteredScrollTop],
    );

    useEffect(() => {
        setCurrentLyricRef.current = setCurrentLyric;
    }, [setCurrentLyric]);

    useEffect(() => {
        // Copy the follow settings into a ref that can be accessed in the timeout
        followRef.current = settings.follow;
    }, [settings.follow]);

    useEffect(() => {
        // This handler is used to handle when lyrics change. It is the primary
        // handler for resetting the parser/timer lifecycle for a new lyric set.
        lyricRef.current = lyrics;
        activeIndexRef.current = -1;

        if (lyricTimer.current) {
            clearTimeout(lyricTimer.current);
        }

        if (status === PlayerStatus.PLAYING) {
            setCurrentLyric(timestampRef.current * 1000 + delayMsRef.current);

            return () => {
                if (lyricTimer.current) clearTimeout(lyricTimer.current);
            };
        }

        return () => {};
    }, [lyrics, setCurrentLyric, status]);

    useEffect(() => {
        // This handler is used to deal with changes to the current delay. If the offset
        // changes, we should immediately stop the current listening set and calculate
        // the correct one using the new offset. Afterwards, timing can be calculated like normal
        const newOffset = offsetMs ?? 0;
        const changed = delayMsRef.current !== newOffset;

        if (!changed) {
            return;
        }

        if (lyricTimer.current) {
            clearTimeout(lyricTimer.current);
        }

        delayMsRef.current = newOffset;
        setCurrentLyric(timestamp * 1000 + delayMsRef.current);
    }, [setCurrentLyric, offsetMs, timestamp]);

    useEffect(() => {
        // This handler is used specifically for dealing with seeking and progress updates.
        // When the timestamp changes, update the current lyric position.
        if (status !== PlayerStatus.PLAYING) {
            if (lyricTimer.current) {
                clearTimeout(lyricTimer.current);
            }

            return;
        }

        const timeInMs = timestamp * 1000 + delayMsRef.current;
        const nextIndex = getCurrentLyric(timeInMs);
        if (nextIndex === activeIndexRef.current) {
            return;
        }

        if (lyricTimer.current) {
            clearTimeout(lyricTimer.current);
        }

        setCurrentLyric(timeInMs);
    }, [timestamp, setCurrentLyric, status]);

    useEffect(() => {
        if (lyricTimer.current) {
            clearTimeout(lyricTimer.current);
        }

        timerEpoch.current += 1;
    }, []);

    // Handle manual scrolling - pause auto-scroll when user scrolls
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Ignore programmatic scrolls (auto-scroll)
            if (programmaticScrollRef.current || performance.now() < ignoreScrollUntilRef.current) {
                return;
            }

            userScrollingRef.current = true;

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Re-enable auto-scroll after 3 seconds of no scrolling
            scrollTimeoutRef.current = setTimeout(() => {
                userScrollingRef.current = false;
            }, 3000);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const hideScrollbar = () => {
        containerRef.current?.classList.add('hide-scrollbar');
    };

    const showScrollbar = () => {
        containerRef.current?.classList.remove('hide-scrollbar');
    };

    return (
        <div
            className={clsx(styles.container, 'synchronized-lyrics overlay-scrollbar')}
            onMouseEnter={showScrollbar}
            onMouseLeave={hideScrollbar}
            ref={containerRef}
            style={
                {
                    // opacity/scale is set here for every lyric,
                    // and then overwritten by CSS for active lyrics
                    // to prevent expensive rerenders each lyric
                    '--lyric-opacity': settings.opacityNonActive,
                    '--lyric-scale': settings.scaleNonActive,
                    '--lyric-scale-origin': settings.alignment,
                    gap: `${settings.gap}px`,
                    ...style,
                } as React.CSSProperties
            }
        >
            {lyrics.map(([time, text], idx) => (
                <LyricLine
                    alignment={settings.alignment}
                    className="lyric-line synchronized"
                    data-lyric-index={idx}
                    fontSize={settings.fontSize}
                    key={idx}
                    onClick={() => {
                        if (time > 0 && Number.isFinite(time)) {
                            handleSeek(time / 1000);
                        }
                    }}
                    text={
                        text +
                        (translatedLyrics ? `_BREAK_${translatedLyrics.split('\n')[idx]}` : '')
                    }
                />
            ))}
        </div>
    );
};
