import { ServerType } from '@samo/core/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ revoke: vi.fn() }));

vi.mock('@samo/core/server', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@samo/core/server')>()),
    revokeSamoCredential: mocks.revoke,
}));
vi.mock('/@/renderer/api/samo/samo-fetch', () => ({ samoFetch: 'samo-fetch' }));

import { retireSamoCredential } from './samo-sign-out';

beforeEach(() => {
    mocks.revoke.mockReset();
});

describe('retireSamoCredential', () => {
    it('revokes the token a removed samo server held, at the address it was used on', () => {
        retireSamoCredential({
            credential: 'desktop-token',
            type: ServerType.SAMO,
            url: 'https://samo.example',
        });

        expect(mocks.revoke).toHaveBeenCalledWith('samo-fetch', {
            credential: 'desktop-token',
            url: 'https://samo.example',
        });
    });

    it('sends nothing for a server that holds no token', () => {
        retireSamoCredential(null);
        retireSamoCredential({
            credential: '',
            type: ServerType.SAMO,
            url: 'https://samo.example',
        });

        expect(mocks.revoke).not.toHaveBeenCalled();
    });
});
