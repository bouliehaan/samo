import type { PlaybackEngine, PlaybackSource } from '/@/renderer/store/playback-owner.store';

import { PlayerType } from '/@/shared/types/types';

/**
 * Which engine is actually playing right now.
 *
 * The playback *setting* is not the answer. Radio, podcasts and audiobooks
 * always run through a web audio element even when the setting says mpv, so
 * anything that reasons about "are we on mpv" from `playbackType` alone will be
 * wrong for three of the four sources.
 *
 * That is not hypothetical: the visualizer did exactly that, decided radio was
 * mpv playback, and asked the main process to attach a spectrum tap to an mpv
 * that was sitting idle. Both this module and AudioPlayers now resolve the
 * engine through the same functions so they cannot disagree again.
 */

type EngineInput = {
    /** The session's declared engine; 'none' means "not decided yet". */
    engine: PlaybackEngine;
    /** mpv only exists in the desktop build. */
    isDesktop: boolean;
    playbackType: PlayerType;
    source: null | PlaybackSource;
};

/** Sources that are always played by a web audio element, whatever the setting. */
const WEB_ONLY_SOURCES: PlaybackSource[] = ['radio', 'audiobook', 'podcast'];

export const isWebOnlySource = (source: null | PlaybackSource): boolean =>
    source !== null && WEB_ONLY_SOURCES.includes(source);

/** The engine music would use, given the setting and an undecided session. */
export const resolveMusicEngine = ({
    engine,
    isDesktop,
    playbackType,
}: Omit<EngineInput, 'source'>): PlaybackEngine => {
    if (engine !== 'none') return engine;
    return isDesktop && playbackType === PlayerType.LOCAL ? 'mpv-native' : 'web';
};

/**
 * True only when mpv is the thing making sound. False while idle, false for
 * radio/podcast/audiobook, and false in the browser build.
 */
export const isMpvEngineActive = ({
    engine,
    isDesktop,
    playbackType,
    source,
}: EngineInput): boolean => {
    if (!isDesktop) return false;
    if (isWebOnlySource(source)) return false;
    if (source !== 'music') return false;

    return resolveMusicEngine({ engine, isDesktop, playbackType }) === 'mpv-native';
};
