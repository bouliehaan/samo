import { describe, expect, it } from 'vitest';

import { type SamoFetch } from '../server/server-http';
import { testServerAuthentication } from '../test-fixtures';
import { loadMobileRadioForServers } from './mobile-home';

/**
 * The distinction this whole module exists to preserve: a server that answers
 * with no stations is NOT a server that never answered.
 *
 * Radio is the only browse type with no on-device mirror behind it, so it is
 * the first thing to go blank when a phone cannot reach its server — and for a
 * long time the loader swallowed the failure and returned `[]`, leaving the
 * Radio tab to report a dead network as "no server-backed radio stations
 * returned". The address being unroutable (a LAN-addressed server with a
 * full-tunnel VPN in the way) looked identical to an empty library.
 */

const auth = testServerAuthentication({ url: 'https://music.example.com' });

const INTERNET_PATH = '/internet-radio/stations';
const PROGRAMMED_PATH = '/radio/stations';

/** A fetch that answers per-path: a function to run, or a payload to return. */
const fakeFetch = (routes: Record<string, () => Promise<unknown>>): SamoFetch => {
    return async (url: string) => {
        const route = Object.keys(routes).find((path) => url.includes(path));
        if (!route) {
            // Anything else on the path (the stream-token mint) is irrelevant
            // to what is under test and is allowed to fail quietly, exactly as
            // it does against a server that has not enabled it.
            return { json: async () => ({}), ok: false, status: 404 };
        }
        return { json: routes[route], ok: true, status: 200 };
    };
};

const unreachable = () => Promise.reject(new Error('Network request failed'));

describe('loadMobileRadioForServers', () => {
    it('reports an error when neither station endpoint can be reached', async () => {
        const result = await loadMobileRadioForServers({
            authentication: auth,
            fetch: fakeFetch({
                [INTERNET_PATH]: unreachable,
                [PROGRAMMED_PATH]: unreachable,
            }),
        });

        expect(result.items).toEqual([]);
        expect(result.error).toBeTruthy();
    });

    it('leaves error unset when the server answers with no stations', async () => {
        const result = await loadMobileRadioForServers({
            authentication: auth,
            fetch: fakeFetch({
                [INTERNET_PATH]: async () => ({ items: [] }),
                [PROGRAMMED_PATH]: async () => ({ items: [] }),
            }),
        });

        expect(result.items).toEqual([]);
        // The one case where "no server-backed radio stations returned" is a
        // true sentence, and the only case allowed to render it.
        expect(result.error).toBeUndefined();
    });

    it('treats a half-answer as reachable and keeps what arrived', async () => {
        const result = await loadMobileRadioForServers({
            authentication: auth,
            fetch: fakeFetch({
                [INTERNET_PATH]: async () => ({
                    items: [
                        {
                            enabled: true,
                            id: 'st-1',
                            name: 'Radio Paradise',
                            streamUrl: 'https://stream.example.com/rp',
                        },
                    ],
                }),
                [PROGRAMMED_PATH]: unreachable,
            }),
        });

        expect(result.error).toBeUndefined();
        expect(result.items.map((item) => item.title)).toEqual(['Radio Paradise']);
    });

    it('is silent when there is no radio-capable server at all', async () => {
        const result = await loadMobileRadioForServers({
            authentication: null,
            fetch: fakeFetch({}),
        });

        // Nothing was attempted, so there is nothing to have failed — an absent
        // server must never be accused of being out of reach.
        expect(result).toEqual({ items: [] });
    });
});
