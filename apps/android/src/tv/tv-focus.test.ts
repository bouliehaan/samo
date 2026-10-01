import { describe, expect, it } from 'vitest';
import {
    clearTvPlacementRequest,
    noteTvFocus,
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
        clearTvPlacementRequest();
        noteTvFocus({ id: 'rail:search', zone: 'rail' });
        expect(shouldTvZoneTakeFocus('rail')).toBe(true);
    });
});
