/**
 * Parse a string array from URLSearchParams
 * Returns undefined if the key doesn't exist or array is empty
 */
export declare const parseArrayParam: (searchParams: URLSearchParams, key: string) => string[] | undefined;
/**
 * Parse a boolean from URLSearchParams
 * Returns undefined if the key doesn't exist
 */
export declare const parseBooleanParam: (searchParams: URLSearchParams, key: string) => boolean | undefined;
/**
 * Parse an integer from URLSearchParams
 * Returns undefined if the key doesn't exist or value is invalid
 */
export declare const parseIntParam: (searchParams: URLSearchParams, key: string) => number | undefined;
/**
 * Parse a string from URLSearchParams
 * Returns undefined if the key doesn't exist
 */
export declare const parseStringParam: (searchParams: URLSearchParams, key: string) => string | undefined;
/**
 * Parse JSON from URLSearchParams
 * Returns undefined if the key doesn't exist or parsing fails
 */
export declare const parseJsonParam: <T = unknown>(searchParams: URLSearchParams, key: string) => T | undefined;
/**
 * Set or remove a value in URLSearchParams
 * If value is null or undefined, removes the key
 */
export declare const setSearchParam: (searchParams: URLSearchParams, key: string, value: boolean | null | number | Record<string, any> | string | string[] | undefined) => URLSearchParams;
/**
 * Set or remove a JSON value in URLSearchParams
 * If value is null or undefined, removes the key
 */
export declare const setJsonSearchParam: (searchParams: URLSearchParams, key: string, value: null | Record<string, any> | undefined) => URLSearchParams;
export declare const setMultipleSearchParams: (searchParams: URLSearchParams, params: Record<string, boolean | null | number | Record<string, any> | string | string[] | undefined>, jsonKeys?: Set<string>) => URLSearchParams;
/**
 * Parse custom filters from URLSearchParams with validation
 */
export declare const parseCustomFiltersParam: (searchParams: URLSearchParams, key: string) => Record<string, any> | undefined;
/**
 * Build filter query string from current search params (minus pagination/scroll).
 * Optionally merge customFilters (e.g. from ListContext) into the result.
 */
export declare const getFilterQueryStringFromSearchParams: (searchParams: URLSearchParams, customFilters?: Record<string, boolean | number | Record<string, unknown> | string | string[]>) => string;
