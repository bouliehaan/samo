import { describe, expect, it } from 'vitest';
import { tvDisplayText } from './tv-text';

describe('TV feed metadata', () => {
    it('displays numeric emoji entities, including feeds missing the semicolon', () => {
        expect(tvDisplayText('Sweet Dreams Lofi &#128164')).toBe('Sweet Dreams Lofi 💤');
        expect(tvDisplayText('Dreams &#x1F4A4;')).toBe('Dreams 💤');
    });
    it('decodes punctuation without changing ordinary text or interpreting tags', () => {
        expect(tvDisplayText('Hall &amp; Oates — &quot;Live&quot;')).toBe('Hall & Oates — "Live"');
        expect(tvDisplayText('<live> R&B')).toBe('<live> R&B');
        expect(tvDisplayText('&amp;lt;')).toBe('&lt;');
        expect(tvDisplayText(null)).toBe('');
    });
    it('preserves invalid code points rather than crashing a screen', () => {
        expect(tvDisplayText('&#99999999; &#xD800; &#0; &unknown;')).toBe(
            '&#99999999; &#xD800; &#0; &unknown;',
        );
    });
});
