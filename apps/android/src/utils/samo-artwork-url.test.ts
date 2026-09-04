import {
    getDefaultServerCapabilities,
    ServerAuthenticationKind,
    type ServerAuthenticationResult,
    ServerType,
} from '@samo/core/server';
import { describe, expect, it, vi } from 'vitest';

// This module reaches the device for the on-disk artwork cache and the
// persisted connection. Neither is part of what is under test here, and both
// drag react-native into a node-environment suite.
vi.mock('../services/artwork-cache', () => ({
    getArtworkLocalUri: () => undefined,
    peekArtworkLocalUri: () => null,
}));
vi.mock('../services/persisted-server', () => ({
    getPersistedServerAuthKey: () => undefined,
}));

import { resolveSamoItemArtworkSourceForDisplay } from './samo-artwork-url';

/**
 * A bare string is a source with no headers, so handing one a samo /api/v1/
 * URL is a request that can only 401. It used to do exactly that on every tile
 * that mounted before the connection resolved — measured through samo-proxy as
 * covers going 401 and the same URLs returning 200 about 120ms later, once the
 * re-resolve retried them. On the no-reuse connection pool each wasted attempt
 * is a full TCP + TLS handshake.
 */
const SAMO_URL = 'https://music.example.com/api/v1/media/images/cover_abc/image';
const REMOTE_URL = 'https://cdn.example.com/podcasts/cover.jpg';

const samoSource = { id: 'src-1', type: ServerType.SAMO, url: 'https://music.example.com' };

describe('resolveSamoItemArtworkSourceForDisplay', () => {
    it('withholds a samo media URL when there is no connection to authenticate it', () => {
        expect(
            resolveSamoItemArtworkSourceForDisplay(
                { artworkUrl: SAMO_URL, source: samoSource },
                null,
            ),
        ).toBeUndefined();
    });

    it('still hands over a non-samo URL, which needs no bearer', () => {
        expect(
            resolveSamoItemArtworkSourceForDisplay(
                { artworkUrl: REMOTE_URL, source: samoSource },
                null,
            ),
        ).toBe(REMOTE_URL);
    });

    it('attaches the bearer once the connection resolves', () => {
        const auth: ServerAuthenticationResult = {
            capabilities: getDefaultServerCapabilities(),
            credential: 'test-token',
            details: 'test server',
            kind: ServerAuthenticationKind.SAMO_TOKEN,
            title: 'Test Server',
            type: ServerType.SAMO,
            url: 'https://music.example.com',
            username: 'tester',
        };
        const resolved = resolveSamoItemArtworkSourceForDisplay(
            { artworkUrl: SAMO_URL, source: { id: 'src-1', type: ServerType.SAMO, url: auth.url } },
            auth,
        );
        expect(typeof resolved === 'object' && resolved?.headers.Authorization).toBeTruthy();
    });
});
