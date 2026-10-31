import { describe, expect, it } from 'vitest';
import {
    didTvFocusArriveUp,
    getTvMoveCount,
    isTvSidewaysMove,
    noteTvFocus,
    noteTvKeyDown,
    setTvPlacementZone,
    shouldTvZoneTakeFocus,
} from './tv-focus';

describe('TV navigation focus', () => {
    it('ignores the temporary rail focus caused by hiding a detail on Back', () => {
        noteTvFocus({ id: 'track:1', zone: 'content' });
        setTvPlacementZone('content');
        noteTvFocus({ id: 'rail:home', zone: 'rail' });
        expect(shouldTvZoneTakeFocus('content')).toBe(true);
        expect(shouldTvZoneTakeFocus('rail')).toBe(false);
        noteTvFocus({ id: 'playlist:1', zone: 'content' });
        noteTvFocus({ id: 'rail:home', zone: 'rail' });
        expect(shouldTvZoneTakeFocus('rail')).toBe(true);
    });
    it('lets a deliberate directional press override an unfulfilled request', () => {
        setTvPlacementZone('content');
        noteTvKeyDown('left');
        noteTvFocus({ id: 'rail:search', zone: 'rail' });
        expect(shouldTvZoneTakeFocus('rail')).toBe(true);
    });
    it('counts arrows as moves, and nothing else', () => {
        const before = getTvMoveCount();
        noteTvKeyDown('down');
        noteTvKeyDown('select');
        noteTvKeyDown('right');
        expect(getTvMoveCount()).toBe(before + 2);
    });
    it('treats focus as a crossing only while a sideways press is landing', () => {
        noteTvKeyDown('left');
        expect(isTvSidewaysMove()).toBe(true);
        // It landed: whatever focus does next is not that press.
        noteTvFocus({ id: 'rail:home', zone: 'rail' });
        expect(isTvSidewaysMove()).toBe(false);
        noteTvKeyDown('right');
        noteTvKeyDown('select');
        expect(isTvSidewaysMove()).toBe(false);
        noteTvKeyDown('down');
        expect(isTvSidewaysMove()).toBe(false);
    });
    it('does not read a stale sideways press into a navigation that follows it', () => {
        // Right at the end of a row moves nothing, then Back pops a detail.
        noteTvKeyDown('right');
        setTvPlacementZone('content');
        expect(isTvSidewaysMove()).toBe(false);
    });
    it('knows focus came by Up only when an Up press brought it', () => {
        noteTvKeyDown('up');
        noteTvFocus({ id: 'detail:play', zone: 'content' });
        expect(didTvFocusArriveUp()).toBe(true);
        // Android parking focus there when a surface closes: no press.
        noteTvFocus({ id: 'detail:play', zone: 'content' });
        expect(didTvFocusArriveUp()).toBe(false);
        noteTvKeyDown('down');
        noteTvFocus({ id: 'track:0', zone: 'content' });
        expect(didTvFocusArriveUp()).toBe(false);
        noteTvKeyDown('up');
        noteTvKeyDown('select');
        noteTvFocus({ id: 'detail:play', zone: 'content' });
        expect(didTvFocusArriveUp()).toBe(false);
    });
});
