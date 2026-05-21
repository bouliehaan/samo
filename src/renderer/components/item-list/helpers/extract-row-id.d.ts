/**
 * Creates a function to extract row ID from an item based on the getRowId configuration.
 *
 * @param getRowId - Either a string property name, a function that extracts the ID, or undefined to use default 'id' property
 * @returns A function that extracts the row ID from an item
 */
export declare const createExtractRowId: (getRowId?: ((item: unknown) => string) | string) => ((item: unknown) => string | undefined);
