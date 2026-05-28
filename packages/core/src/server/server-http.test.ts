import { describe, expect, it, vi } from 'vitest';

import { getFetch, normalizeBaseUrl } from './server-http';

describe('normalizeBaseUrl', () => {
    it('trims whitespace and trailing slashes', () => {
        expect(normalizeBaseUrl('  https://music.example.com///  ')).toBe(
            'https://music.example.com',
        );
    });

    it('preserves a single path without trailing slash', () => {
        expect(normalizeBaseUrl('http://localhost:4533/subsonic')).toBe(
            'http://localhost:4533/subsonic',
        );
    });

    it('treats missing values as empty', () => {
        expect(normalizeBaseUrl(undefined)).toBe('');
        expect(normalizeBaseUrl(null)).toBe('');
    });
});

describe('getFetch', () => {
    it('wraps the resolved fetcher with a timeout layer', () => {
        const fetcher = vi.fn().mockResolvedValue({
            json: async () => ({}),
            ok: true,
            status: 200,
        });

        const wrapped = getFetch(fetcher);

        expect(wrapped).not.toBe(fetcher);
    });
});
