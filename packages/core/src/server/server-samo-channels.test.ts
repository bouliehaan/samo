import { describe, expect, it } from 'vitest';

import { testServerAuthentication } from '../test-fixtures';
import { type SamoFetch } from './server-http';
import {
    getSamoChannelStreamUrl,
    listSamoChannels,
    parseSamoChannelIdFromStreamUrl,
    resolveSamoChannelArtworkUrl,
} from './server-samo-channels';

const auth = testServerAuthentication({ url: 'https://music.example.com' });

describe('getSamoChannelStreamUrl', () => {
    it('builds the API form, which is what makes a channel an ordinary Samo stream', () => {
        // The `/api/v1/` prefix is load-bearing, not cosmetic: re-homing, token
        // refresh and 401 recovery all decide what they are looking at by
        // finding it in the path. The bare `/channels/…` route the server also
        // serves is for outside subscribers, and nothing here can mint for it.
        expect(getSamoChannelStreamUrl(auth, 'jake')).toBe(
            'https://music.example.com/api/v1/channels/jake/stream',
        );
    });

    it('carries a stream token when one is given', () => {
        expect(getSamoChannelStreamUrl(auth, 'jake', { streamToken: 'tok-1' })).toBe(
            'https://music.example.com/api/v1/channels/jake/stream?stream_token=tok-1',
        );
    });
});

describe('parseSamoChannelIdFromStreamUrl', () => {
    it('reads the id back out, token or no token', () => {
        expect(parseSamoChannelIdFromStreamUrl(getSamoChannelStreamUrl(auth, 'jake'))).toBe('jake');
        expect(
            parseSamoChannelIdFromStreamUrl(
                getSamoChannelStreamUrl(auth, 'jake', { streamToken: 'tok-1' }),
            ),
        ).toBe('jake');
    });

    it('survives an id that had to be encoded', () => {
        const url = getSamoChannelStreamUrl(auth, 'late night/jazz');
        expect(parseSamoChannelIdFromStreamUrl(url)).toBe('late night/jazz');
    });

    it('does not claim a station that is not a channel', () => {
        // The whole point of the parse: it is how a URL alone says which
        // catalog it belongs to, so a false positive would poll the wrong
        // endpoint for what is on air.
        expect(
            parseSamoChannelIdFromStreamUrl('https://stream.example.com/radio-paradise'),
        ).toBeUndefined();
        expect(
            parseSamoChannelIdFromStreamUrl(
                'https://music.example.com/api/v1/internet-radio/st-1/stream',
            ),
        ).toBeUndefined();
        expect(parseSamoChannelIdFromStreamUrl(undefined)).toBeUndefined();
        expect(parseSamoChannelIdFromStreamUrl('not a url')).toBeUndefined();
    });
});

describe('resolveSamoChannelArtworkUrl', () => {
    it('serves the cover the server named, uploaded or generated alike', () => {
        // Both kinds come back as `cover_*` ids from the same store, so there
        // is one path here and no way for a generated tile to be treated as
        // less real than an uploaded one.
        expect(resolveSamoChannelArtworkUrl(auth, { coverId: 'cover_abc123' }, 'tok-1')).toBe(
            'https://music.example.com/api/v1/media/covers/cover_abc123/image?stream_token=tok-1',
        );
    });

    it('has nothing to show for a server too old to have channel covers', () => {
        expect(resolveSamoChannelArtworkUrl(auth, {})).toBeUndefined();
        expect(resolveSamoChannelArtworkUrl(auth, { coverId: '' })).toBeUndefined();
        // Not an id from the cover store — refusing it is what stops a bad
        // value being turned into a URL that 404s on every tile.
        expect(resolveSamoChannelArtworkUrl(auth, { coverId: 'jake' })).toBeUndefined();
    });
});

describe('listSamoChannels', () => {
    const answering = (items: unknown[]): SamoFetch =>
        (async () => ({ json: async () => ({ items }), ok: true, status: 200 })) as SamoFetch;

    it('drops the channels whose encoder is switched off', async () => {
        // A disabled channel produces silence and a stalled connection. Filtered
        // here so no surface has to know that before it can offer a station.
        const channels = await listSamoChannels(
            answering([
                { enabled: true, id: 'jake', name: 'Jake' },
                { enabled: false, id: 'off-air', name: 'Off Air' },
            ]),
            auth,
        );

        expect(channels.map((channel) => channel.id)).toEqual(['jake']);
    });
});
