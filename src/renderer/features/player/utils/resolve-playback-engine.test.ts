import { describe, expect, it } from 'vitest';

import { isMpvEngineActive, isWebOnlySource, resolveMusicEngine } from './resolve-playback-engine';

import { PlayerType } from '/@/shared/types/types';

const LOCAL = { isDesktop: true, playbackType: PlayerType.LOCAL };
const WEB = { isDesktop: true, playbackType: PlayerType.WEB };

describe('isMpvEngineActive', () => {
    // The regression this exists for: with the setting on mpv, radio still
    // plays through a web audio element. Treating it as mpv playback made the
    // visualizer attach a spectrum tap to an idle mpv, which wedged the app.
    it.each(['radio', 'podcast', 'audiobook'] as const)(
        'is false for %s even when the setting says mpv',
        (source) => {
            expect(isMpvEngineActive({ ...LOCAL, engine: 'none', source })).toBe(false);
        },
    );

    it('is true for music when the setting says mpv', () => {
        expect(isMpvEngineActive({ ...LOCAL, engine: 'none', source: 'music' })).toBe(true);
    });

    it('is false for music when the setting says web', () => {
        expect(isMpvEngineActive({ ...WEB, engine: 'none', source: 'music' })).toBe(false);
    });

    it('is false while idle', () => {
        // Nothing is playing, so nothing should be tapped.
        expect(isMpvEngineActive({ ...LOCAL, engine: 'none', source: null })).toBe(false);
    });

    it('is false in the browser build, where mpv cannot run', () => {
        expect(
            isMpvEngineActive({
                engine: 'none',
                isDesktop: false,
                playbackType: PlayerType.LOCAL,
                source: 'music',
            }),
        ).toBe(false);
    });

    it('honours an explicit session engine over the setting', () => {
        // A session that has already committed to the web engine stays there,
        // even though the setting says mpv.
        expect(isMpvEngineActive({ ...LOCAL, engine: 'web', source: 'music' })).toBe(false);
        expect(isMpvEngineActive({ ...WEB, engine: 'mpv-native', source: 'music' })).toBe(true);
    });
});

describe('resolveMusicEngine', () => {
    it('resolves an undecided session from the setting', () => {
        expect(resolveMusicEngine({ ...LOCAL, engine: 'none' })).toBe('mpv-native');
        expect(resolveMusicEngine({ ...WEB, engine: 'none' })).toBe('web');
    });

    it('never resolves to mpv off the desktop', () => {
        expect(
            resolveMusicEngine({
                engine: 'none',
                isDesktop: false,
                playbackType: PlayerType.LOCAL,
            }),
        ).toBe('web');
    });

    it('leaves a decided engine alone', () => {
        expect(resolveMusicEngine({ ...LOCAL, engine: 'web' })).toBe('web');
    });
});

describe('isWebOnlySource', () => {
    it('covers every source that bypasses mpv', () => {
        expect(isWebOnlySource('radio')).toBe(true);
        expect(isWebOnlySource('podcast')).toBe(true);
        expect(isWebOnlySource('audiobook')).toBe(true);
        expect(isWebOnlySource('music')).toBe(false);
        expect(isWebOnlySource(null)).toBe(false);
    });
});
