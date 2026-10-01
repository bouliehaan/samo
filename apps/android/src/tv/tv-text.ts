/** Radio feeds sometimes expose HTML entities as plain metadata. Decode text
 * once for display; never interpret tags or turn metadata into markup. */
export function tvDisplayText(value: string | null | undefined): string {
    if (!value) return '';
    const named: Record<string, string> = {
        amp: '&',
        apos: "'",
        gt: '>',
        lt: '<',
        nbsp: ' ',
        quot: '"',
    };
    return value.replace(
        /&#(x[\da-f]+|\d+);?|&(amp|apos|gt|lt|nbsp|quot);/gi,
        (entity: string, numeric: string | undefined, name: string | undefined) => {
            if (name) return named[name.toLowerCase()] ?? entity;
            const point = numeric?.toLowerCase().startsWith('x')
                ? Number.parseInt(numeric.slice(1), 16)
                : Number.parseInt(numeric ?? '', 10);
            return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
                ? String.fromCodePoint(point)
                : entity;
        },
    );
}
