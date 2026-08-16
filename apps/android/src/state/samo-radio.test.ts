import { beforeEach, describe, expect, it } from 'vitest';

import {
    getSamoRadioReach,
    samoRadioReachFor,
    setSamoRadioReach,
} from './samo-radio';

/**
 * The reachability verdict is asserted every 5 seconds by the device poll for
 * as long as the Radio tab is open, so "still fine" has to be free: a fresh
 * object each time would publish a store change and re-render the whole tab
 * twelve times a minute for no new information.
 */
describe('samo-radio reachability', () => {
    beforeEach(() => {
        setSamoRadioReach({ status: 'unknown' });
    });

    it('starts out with no opinion', () => {
        expect(getSamoRadioReach().status).toBe('unknown');
    });

    it('holds one reference while the verdict is unchanged', () => {
        setSamoRadioReach(samoRadioReachFor(true));
        const first = getSamoRadioReach();

        setSamoRadioReach(samoRadioReachFor(true));

        expect(getSamoRadioReach()).toBe(first);
    });

    it('holds one reference while the same failure repeats', () => {
        setSamoRadioReach(samoRadioReachFor(false, 'No route to host.'));
        const first = getSamoRadioReach();

        setSamoRadioReach(samoRadioReachFor(false, 'No route to host.'));

        expect(getSamoRadioReach()).toBe(first);
    });

    it('replaces the verdict when the failure changes', () => {
        setSamoRadioReach(samoRadioReachFor(false, 'No route to host.'));

        setSamoRadioReach(samoRadioReachFor(false, 'Connection refused.'));

        expect(getSamoRadioReach()).toEqual({
            message: 'Connection refused.',
            status: 'unreachable',
        });
    });

    it('recovers when the server answers again', () => {
        setSamoRadioReach(samoRadioReachFor(false, 'No route to host.'));

        setSamoRadioReach(samoRadioReachFor(true));

        expect(getSamoRadioReach().status).toBe('ok');
    });
});
