import {
    ServerAuthenticationKind,
    type ServerAuthenticationResult,
} from './server/server-auth';
import { getDefaultServerCapabilities } from './server/server-capabilities';
import { ServerType } from './server/server-types';

export const testServerAuthentication = (
    overrides: Partial<ServerAuthenticationResult> = {},
): ServerAuthenticationResult => {
    const type = overrides.type ?? ServerType.NAVIDROME;

    return {
        capabilities: getDefaultServerCapabilities(type),
        credential: 'test-token',
        details: 'test server',
        kind: ServerAuthenticationKind.NAVIDROME_TOKEN,
        title: 'Test Server',
        type,
        url: 'https://music.example.com',
        username: 'tester',
        ...overrides,
    };
};
