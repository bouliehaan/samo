import { describe, expect, it, vi } from 'vitest';

import {
    pollSamoDevicePairing,
    SamoDevicePairingProtocolError,
    startSamoDevicePairing,
} from './server-device-pairing';
import { type SamoFetch } from './server-http';
import { authenticateSamo } from './server-samo';

const response = (body: unknown) => ({
    json: async () => body,
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
});
const fetchBody = (body: unknown) => vi.fn<SamoFetch>().mockResolvedValue(response(body));
const challenge = {
    device_code: 'private-device-secret',
    expires_in: 600,
    interval: 5,
    user_code: 'ABCD-EFGH',
    verification_uri: '/pair',
};

describe('samo TV pairing', () => {
    it('keeps browser approval on the selected origin and excludes the polling secret', async () => {
        const fetch = fetchBody(challenge);
        const result = await startSamoDevicePairing('https://samo.example/', fetch);
        expect(result.verificationUrl).toBe('https://samo.example/pair');
        expect(result.verificationUrlComplete).toBe('https://samo.example/pair#code=ABCD-EFGH');
        expect(result.verificationUrl).not.toContain(challenge.device_code);
        expect(result.verificationUrlComplete).not.toContain(challenge.device_code);
        expect(result.userCode).toBe('ABCD-EFGH');
        expect(result.intervalMs).toBe(5000);
        expect(fetch.mock.calls[0][0]).toBe('https://samo.example/api/v1/auth/device/start');
    });
    it('rejects a server response that sends the user to a different approval site', async () => {
        await expect(
            startSamoDevicePairing(
                'https://samo.example',
                fetchBody({ ...challenge, verification_uri: 'https://other.example/login' }),
            ),
        ).rejects.toThrow(SamoDevicePairingProtocolError);
    });
    it('never puts the private polling secret in a URL', async () => {
        const fetch = fetchBody({ interval: 5, status: 'authorization_pending' });
        await pollSamoDevicePairing('https://samo.example', 'private-device-secret', fetch);
        expect(fetch.mock.calls[0][0]).not.toContain('private-device-secret');
        expect(JSON.parse(fetch.mock.calls[0][1]!.body!)).toEqual({
            device_code: 'private-device-secret',
        });
    });
    it('honors backoff and returns terminal denial/expiry without an auth session', async () => {
        expect(
            await pollSamoDevicePairing(
                'https://samo.example',
                'secret',
                fetchBody({ interval: 15, status: 'slow_down' }),
            ),
        ).toEqual({ intervalMs: 15000, status: 'slow_down' });
        for (const status of ['access_denied', 'expired_token']) {
            expect(
                await pollSamoDevicePairing(
                    'https://samo.example',
                    'secret',
                    fetchBody({ status }),
                ),
            ).toEqual({ status });
        }
    });
    it('builds exactly the session a password login builds for the same account', async () => {
        const login = {
            serverId: 'srv-1',
            user: { displayName: 'Listener', id: 'user-1', role: 'user', username: 'listener' },
        };
        const typed = await authenticateSamo({
            fetch: vi
                .fn<SamoFetch>()
                .mockResolvedValueOnce(response({ ...login, token: 'login-token' }))
                .mockResolvedValueOnce(response({ secret: 'device-token' })),
            password: 'correct horse',
            url: 'https://samo.example/',
            username: 'listener',
        });
        const paired = await pollSamoDevicePairing(
            'https://samo.example/',
            'secret',
            fetchBody({ status: 'approved', ...login, token: 'device-token' }),
        );
        expect(paired).toEqual({ authentication: typed, status: 'approved' });
        expect(typed).toMatchObject({ credential: 'device-token', serverId: 'srv-1' });
    });
    it('accepts an approval without a server identity, as login does', async () => {
        const result = await pollSamoDevicePairing(
            'https://samo.example',
            'secret',
            fetchBody({
                status: 'approved',
                token: 'device-token',
                user: { id: 'user-1', username: 'listener' },
            }),
        );
        expect(result).toMatchObject({
            authentication: { credential: 'device-token', serverId: undefined, userId: 'user-1' },
            status: 'approved',
        });
    });
    it('rejects partial approval rather than persisting a broken credential', async () => {
        await expect(
            pollSamoDevicePairing(
                'https://samo.example',
                'secret',
                fetchBody({ status: 'approved', token: 'device-token' }),
            ),
        ).rejects.toThrow(SamoDevicePairingProtocolError);
    });
});
