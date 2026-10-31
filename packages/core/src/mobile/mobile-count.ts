/** "1 album", "12 albums": a count with its noun, singular when it is one. */
export const formatMobileCount = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? '' : 's'}`;
