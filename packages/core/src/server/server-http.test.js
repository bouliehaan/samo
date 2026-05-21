import { describe, expect, it } from 'vitest';
import { normalizeBaseUrl } from './server-http';
describe('normalizeBaseUrl', () => {
    it('trims whitespace and trailing slashes', () => {
        expect(normalizeBaseUrl('  https://music.example.com///  ')).toBe('https://music.example.com');
    });
    it('preserves a single path without trailing slash', () => {
        expect(normalizeBaseUrl('http://localhost:4533/subsonic')).toBe('http://localhost:4533/subsonic');
    });
});
