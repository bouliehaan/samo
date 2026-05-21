import { describe, expect, it, vi } from 'vitest';

import { adaptNativeFetch } from './server-http';
import { absGetLibraries, absLogin } from './server-audiobookshelf';

describe('absLogin', () => {
    it('posts credentials to /login', async () => {
        const fetcher = vi.fn(async () => ({
            json: async () => ({
                user: { id: 'u1', token: 'tok', username: 'jake' },
            }),
            ok: true,
            status: 200,
        }));

        const result = await absLogin(fetcher, 'https://abs.example.com', {
            password: 'secret',
            username: 'jake',
        });

        expect(result.user.token).toBe('tok');
        expect(fetcher).toHaveBeenCalledWith(
            'https://abs.example.com/login',
            expect.objectContaining({ method: 'POST' }),
        );
    });
});

describe('absGetLibraries', () => {
    it('requests /api/libraries with bearer auth', async () => {
        const fetcher = adaptNativeFetch(
            vi.fn(async () => ({
                json: async () => ({ libraries: [{ id: 'lib-1', mediaType: 'book', name: 'Books' }] }),
                ok: true,
                status: 200,
                headers: { get: () => null },
            })) as typeof fetch,
        );

        const result = await absGetLibraries(fetcher, {
            credential: 'jwt',
            url: 'https://abs.example.com',
        });

        expect(result.libraries).toHaveLength(1);
    });
});
