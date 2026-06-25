import { describe, expect, it } from 'vitest';

import { canonicalArtworkKey } from './artwork-canonical';

const IMAGE = 'https://samo.example/api/v1/media/images/abc123/image';

describe('canonicalArtworkKey', () => {
    it('strips the rotating stream_token', () => {
        expect(canonicalArtworkKey(`${IMAGE}?stream_token=TOKEN_A`)).toBe(IMAGE);
    });

    it('collapses the token-bearing and token-less variants to one key', () => {
        // This is the whole point: a cover cached while a token was present must
        // still be a hit once that token rotates away or is dropped at expiry.
        const withToken = canonicalArtworkKey(`${IMAGE}?stream_token=TOKEN_A`);
        const withoutToken = canonicalArtworkKey(IMAGE);
        expect(withToken).toBe(withoutToken);
    });

    it('maps two different stream tokens for the same image to the same key', () => {
        expect(canonicalArtworkKey(`${IMAGE}?stream_token=TOKEN_A`)).toBe(
            canonicalArtworkKey(`${IMAGE}?stream_token=TOKEN_B`),
        );
    });

    it('preserves non-volatile params like size (so size variants stay distinct)', () => {
        const small = canonicalArtworkKey(`${IMAGE}?size=320&stream_token=T`);
        const large = canonicalArtworkKey(`${IMAGE}?size=1200&stream_token=T`);
        expect(small).toContain('size=320');
        expect(large).toContain('size=1200');
        expect(small).not.toBe(large);
    });

    it('normalizes query-param order so reordered URLs share one key', () => {
        const a = canonicalArtworkKey(`${IMAGE}?size=1200&disc=1&stream_token=T1`);
        const b = canonicalArtworkKey(`${IMAGE}?disc=1&size=1200&stream_token=T2`);
        expect(a).toBe(b);
    });

    it('passes file:// uris through unchanged', () => {
        const local = 'file:///data/user/0/app/files/samo-artwork/abc';
        expect(canonicalArtworkKey(local)).toBe(local);
    });

    it('passes data: uris through unchanged', () => {
        const data = 'data:image/png;base64,iVBORw0KGgo=';
        expect(canonicalArtworkKey(data)).toBe(data);
    });

    it('returns unparseable and empty inputs unchanged', () => {
        expect(canonicalArtworkKey('not a url')).toBe('not a url');
        expect(canonicalArtworkKey('')).toBe('');
    });

    it('leaves a token-free URL with no query untouched', () => {
        expect(canonicalArtworkKey(IMAGE)).toBe(IMAGE);
    });
});
