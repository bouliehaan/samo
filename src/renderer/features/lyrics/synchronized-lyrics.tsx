import clsx from 'clsx';
import isElectron from 'is-electron';
import { useCallback, useEffect, useRef } from 'react';

import styles from './synchronized-lyrics.module.css';

import { LyricLine } from '/@/renderer/features/lyrics/lyric-line';
import { getClockNowMs } from '/@/renderer/features/player/audio-player/playback-clock';
import {
    useLyricsDisplaySettings,
    useLyricsSettings,
    usePlaybackType,
    usePlayerActions,
} from '/@/renderer/store';
import { FullLyricsMetadata, SynchronizedLyricsArray } from '/@/shared/types/domain-types';
import { PlayerType } from '/@/shared/types/types';

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

const USER_SCROLL_PAUSE_MS = 3000;
const SCROLL_CENTER_OFFSET_PX = 15;

const findActiveIndex = (lines: SynchronizedLyricsArray, timeMs: number): number => {
    if (lines.length === 0) return -1;
    // Largest idx where lines[idx][0] <= timeMs. If timeMs precedes the first stamp, return 0
    // so the first line is highlighted from the start (matches the prior implementation).
    let lo = 0;
    let hi = lines.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lines[mid][0] <= timeMs) lo = mid;
        else hi = mid - 1;
    }
    return lo;
};

const getCenteredScrollTop = (container: HTMLElement, lyric: HTMLElement) =>
    lyric.offsetTop + lyric.clientHeight / 2 - container.clientHeight / 2 + SCROLL_CENTER_OFFSET_PX;

export const SynchronizedLyrics = ({
    lyrics,
    offsetMs,
    settingsKey = 'default',
    style,
    translatedLyrics,
}: SynchronizedLyricsProps) => {
    const lyricsSettings = useLyricsSettings();
    const displaySettings = useLyricsDisplaySettings(settingsKey);
    const playbackType = usePlaybackType();
    const { mediaSeekToTimestamp } = usePlayerActions();

    const settings = {
        alignment: lyricsSettings.alignment,
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

    const containerRef = useRef<HTMLDivElement | null>(null);
    const linesRef = useRef<SynchronizedLyricsArray>(lyrics);
    const offsetMsRef = useRef(offsetMs ?? 0);
    const followRef = useRef(lyricsSettings.follow);
    const activeIdxRef = useRef(-1);
    const userScrollingRef = useRef(false);
    const programmaticScrollRef = useRef(false);
    const userScrollTimeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);
    const ignoreScrollUntilRef = useRef(0);

    // Keep refs in sync with props/settings without re-creating the rAF loop
    useEffect(() => {
        linesRef.current = lyrics;
        activeIdxRef.current = -1;
    }, [lyrics]);

    useEffect(() => {
        offsetMsRef.current = offsetMs ?? 0;
    }, [offsetMs]);

    useEffect(() => {
        followRef.current = lyricsSettings.follow;
    }, [lyricsSettings.follow]);

    // Single rAF loop. Runs while the component is mounted; no-ops on ticks where the
    // active line hasn't changed, so paused/no-progress states are essentially free.
    useEffect(() => {
        let rafId: null | number = null;

        const applyActive = (newIdx: number) => {
            const container = containerRef.current;
            if (!container) return;

            const oldIdx = activeIdxRef.current;
            if (newIdx === oldIdx) return;

            if (oldIdx !== -1) {
                container
                    .querySelector(`[data-lyric-index="${oldIdx}"]`)
                    ?.classList.remove('active');
            }

            if (newIdx >= 0) {
                const node = container.querySelector<HTMLElement>(`[data-lyric-index="${newIdx}"]`);
                if (node) {
                    node.classList.add('active');

                    if (followRef.current && !userScrollingRef.current) {
                        programmaticScrollRef.current = true;
                        ignoreScrollUntilRef.current = performance.now() + 50;
                        container.scrollTop = getCenteredScrollTop(container, node);
                        requestAnimationFrame(() => {
                            programmaticScrollRef.current = false;
                        });
                    }
                }
            }

            activeIdxRef.current = newIdx;
        };

        const tick = () => {
            const timeMs = getClockNowMs() + offsetMsRef.current;
            const idx = findActiveIndex(linesRef.current, timeMs);
            if (idx !== activeIdxRef.current) applyActive(idx);
            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);

    // User-scroll detection: pause auto-follow for 3s after the user scrolls manually
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (programmaticScrollRef.current || performance.now() < ignoreScrollUntilRef.current) {
                return;
            }
            userScrollingRef.current = true;
            if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
            userScrollTimeoutRef.current = setTimeout(() => {
                userScrollingRef.current = false;
            }, USER_SCROLL_PAUSE_MS);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
        };
    }, []);

    const handleSeek = useCallback(
        (timeMs: number) => {
            if (!Number.isFinite(timeMs) || timeMs <= 0) return;
            const seconds = timeMs / 1000;
            if (playbackType === PlayerType.LOCAL && mpvPlayer) {
                mpvPlayer.seekTo(seconds);
            } else {
                mpris?.updateSeek(seconds);
                mediaSeekToTimestamp(seconds);
            }
        },
        [mediaSeekToTimestamp, playbackType],
    );

    const showScrollbar = () => containerRef.current?.classList.remove('hide-scrollbar');
    const hideScrollbar = () => containerRef.current?.classList.add('hide-scrollbar');

    return (
        <div
            className={clsx(styles.container, 'synchronized-lyrics overlay-scrollbar')}
            onMouseEnter={showScrollbar}
            onMouseLeave={hideScrollbar}
            ref={containerRef}
            style={
                {
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
                    onClick={() => handleSeek(time)}
                    text={
                        text +
                        (translatedLyrics ? `_BREAK_${translatedLyrics.split('\n')[idx]}` : '')
                    }
                />
            ))}
        </div>
    );
};
