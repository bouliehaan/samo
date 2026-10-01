import { type MobilePlayableAudio } from '@samo/core/mobile';
import { getServerConnectionKey } from '@samo/core/server';
import { describe, expect, it, vi } from 'vitest';

import { testServerAuthentication } from '../../../../packages/core/src/test-fixtures';

// Only the connection key is needed from the persisted connection, and the
// real module drags expo-secure-store into a node-environment suite.
vi.mock('../services/persisted-server', async () => ({
    getPersistedServerAuthKey: (await import('@samo/core/server')).getServerConnectionKey,
}));

import { attachNativeStreamCredentials } from './native-stream-auth';

const connection = testServerAuthentication({ credential: 'current-token' });
const sourceId = getServerConnectionKey(connection);
const track = (overrides: Partial<MobilePlayableAudio>): MobilePlayableAudio =>
    ({
        contentSourceId: sourceId,
        id: `${sourceId}:music:track_1`,
        samoProgressKind: 'music-track',
        samoProgressTargetId: 'track_1',
        serverUrl: connection.url,
        source: 'music',
        title: 'Track',
        url: `${connection.url}/api/v1/music/tracks/track_1/stream`,
        ...overrides,
    }) as unknown as MobilePlayableAudio;

describe('attachNativeStreamCredentials', () => {
    // Disconnecting revokes the token a queue was stamped with, and the queue
    // can outlive that session. Re-sending it has to carry the new token.
    it('replaces a token from an earlier session on the same server', () => {
        const stale = track({ serverBearerToken: 'revoked-token' });

        expect(attachNativeStreamCredentials(stale, connection)).toMatchObject({
            serverBearerToken: 'current-token',
            serverUrl: connection.url,
        });
    });

    it('leaves an item that already carries this session unchanged', () => {
        const current = track({ serverBearerToken: 'current-token' });

        expect(attachNativeStreamCredentials(current, connection)).toBe(current);
    });
});
