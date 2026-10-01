import { describe, expect, it, vi } from 'vitest';

import { getFetch, type SamoFetch } from './server-http';
import { authenticateSamo, revokeSamoCredential } from './server-samo';

const response = (body: unknown, status = 200) => ({
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
});
const session = { credential: 'device-token', url: 'https://samo.example/' };
const login = {
    serverId: 'srv-1',
    token: 'login-token',
    tokenMeta: { id: 'token-login', label: 'login' },
    user: { id: 'user-1', role: 'user', username: 'listener' },
};
const signIn = (fetch: SamoFetch) =>
    authenticateSamo({
        fetch,
        password: 'correct horse',
        url: 'https://samo.example/',
        username: 'listener',
    });

describe('revokeSamoCredential', () => {
    it('revokes the token it presents as the bearer, with nothing in the URL', async () => {
        const fetch = vi.fn<SamoFetch>().mockResolvedValue(response({ revoked: true }));

        await expect(revokeSamoCredential(getFetch(fetch), session)).resolves.toBe(true);

        expect(fetch).toHaveBeenCalledOnce();
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe('https://samo.example/api/v1/users/me/tokens/current');
        expect(init?.method).toBe('DELETE');
        expect(init?.headers?.Authorization).toBe('Bearer device-token');
        expect(init?.body).toBeUndefined();
    });

    it.each([
        ['a server without the route', response({ error: 'user not found' }, 404)],
        ['the shared server token', response({ error: 'shared' }, 403)],
        ['a token already gone', response({ error: 'unauthorized' }, 401)],
    ])('reports false, without throwing, for %s', async (_, answer) => {
        const fetch = vi.fn<SamoFetch>().mockResolvedValue(answer);
        await expect(revokeSamoCredential(getFetch(fetch), session)).resolves.toBe(false);
    });

    it('reports false, without throwing, when the server cannot be reached', async () => {
        const fetch = vi.fn<SamoFetch>().mockRejectedValue(new TypeError('fetch failed'));
        await expect(revokeSamoCredential(getFetch(fetch), session)).resolves.toBe(false);
    });

    it('sends nothing for a session with no credential or no address', async () => {
        const fetch = vi.fn<SamoFetch>();
        await expect(
            revokeSamoCredential(getFetch(fetch), { credential: '', url: session.url }),
        ).resolves.toBe(false);
        await expect(
            revokeSamoCredential(getFetch(fetch), { credential: 'device-token', url: '' }),
        ).resolves.toBe(false);
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe('password sign-in', () => {
    it('revokes the login token once the device token replaces it', async () => {
        const fetch = vi
            .fn<SamoFetch>()
            .mockResolvedValueOnce(response(login))
            .mockResolvedValueOnce(response({ secret: 'device-token' }, 201))
            .mockResolvedValueOnce(response({ revoked: true }));

        const result = await signIn(fetch);

        expect(result.credential).toBe('device-token');
        expect(fetch).toHaveBeenCalledTimes(3);
        const [url, init] = fetch.mock.calls[2];
        expect(url).toBe('https://samo.example/api/v1/users/me/tokens/current');
        expect(init?.method).toBe('DELETE');
        expect(init?.headers?.Authorization).toBe('Bearer login-token');
    });

    it('keeps the login token when it is the credential the device falls back to', async () => {
        const fetch = vi
            .fn<SamoFetch>()
            .mockResolvedValueOnce(response(login))
            .mockResolvedValueOnce(response({ error: 'database is locked' }, 500));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        const result = await signIn(fetch);

        expect(result.credential).toBe('login-token');
        expect(fetch).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });

    it('does not wait on the revoke, nor fail when it does', async () => {
        let answerRevoke!: (value: ReturnType<typeof response>) => void;
        const fetch = vi
            .fn<SamoFetch>()
            .mockResolvedValueOnce(response(login))
            .mockResolvedValueOnce(response({ secret: 'device-token' }, 201))
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        answerRevoke = resolve;
                    }),
            );

        // Resolves while the revoke is still unanswered.
        await expect(signIn(fetch)).resolves.toMatchObject({ credential: 'device-token' });
        answerRevoke(response({ error: 'boom' }, 500));

        const unreachable = vi
            .fn<SamoFetch>()
            .mockResolvedValueOnce(response(login))
            .mockResolvedValueOnce(response({ secret: 'device-token' }, 201))
            .mockRejectedValueOnce(new TypeError('fetch failed'));
        await expect(signIn(unreachable)).resolves.toMatchObject({ credential: 'device-token' });
    });
});
