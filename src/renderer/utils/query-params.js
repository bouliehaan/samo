import { customFiltersSchema } from '/@/renderer/features/shared/utils';
/**
 * Parse a string array from URLSearchParams
 * Returns undefined if the key doesn't exist or array is empty
 */
export const parseArrayParam = (searchParams, key) => {
    const values = searchParams.getAll(key);
    return values.length > 0 ? values : undefined;
};
/**
 * Parse a boolean from URLSearchParams
 * Returns undefined if the key doesn't exist
 */
export const parseBooleanParam = (searchParams, key) => {
    const value = searchParams.get(key);
    if (value === null)
        return undefined;
    return value === 'true';
};
/**
 * Parse an integer from URLSearchParams
 * Returns undefined if the key doesn't exist or value is invalid
 */
export const parseIntParam = (searchParams, key) => {
    const value = searchParams.get(key);
    if (value === null)
        return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
};
/**
 * Parse a string from URLSearchParams
 * Returns undefined if the key doesn't exist
 */
export const parseStringParam = (searchParams, key) => {
    const value = searchParams.get(key);
    return value === null ? undefined : value;
};
/**
 * Parse JSON from URLSearchParams
 * Returns undefined if the key doesn't exist or parsing fails
 */
export const parseJsonParam = (searchParams, key) => {
    const value = searchParams.get(key);
    if (value === null)
        return undefined;
    try {
        const parsed = JSON.parse(value);
        // Validate against schema if provided
        return parsed;
    }
    catch {
        return undefined;
    }
};
/**
 * Set or remove a value in URLSearchParams
 * If value is null or undefined, removes the key
 */
export const setSearchParam = (searchParams, key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === undefined) {
        newParams.delete(key);
        return newParams;
    }
    if (Array.isArray(value)) {
        newParams.delete(key);
        value.forEach((v) => newParams.append(key, String(v)));
        return newParams;
    }
    if (typeof value === 'boolean') {
        newParams.set(key, String(value));
        return newParams;
    }
    if (typeof value === 'number') {
        newParams.set(key, String(value));
        return newParams;
    }
    newParams.set(key, value);
    return newParams;
};
/**
 * Set or remove a JSON value in URLSearchParams
 * If value is null or undefined, removes the key
 */
export const setJsonSearchParam = (searchParams, key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === undefined) {
        newParams.delete(key);
        return newParams;
    }
    newParams.set(key, JSON.stringify(value));
    return newParams;
};
export const setMultipleSearchParams = (searchParams, params, jsonKeys) => {
    const newParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined) {
            newParams.delete(key);
            continue;
        }
        if (jsonKeys?.has(key)) {
            if (typeof value === 'object' && !Array.isArray(value)) {
                newParams.set(key, JSON.stringify(value));
            }
            else {
                newParams.delete(key);
            }
        }
        else {
            if (Array.isArray(value)) {
                newParams.delete(key);
                value.forEach((v) => newParams.append(key, String(v)));
            }
            else if (typeof value === 'boolean') {
                newParams.set(key, String(value));
            }
            else if (typeof value === 'number') {
                newParams.set(key, String(value));
            }
            else {
                newParams.set(key, value);
            }
        }
    }
    return newParams;
};
/**
 * Parse custom filters from URLSearchParams with validation
 */
export const parseCustomFiltersParam = (searchParams, key) => {
    const value = parseJsonParam(searchParams, key);
    if (value === undefined)
        return undefined;
    try {
        return customFiltersSchema.parse(value);
    }
    catch {
        return undefined;
    }
};
const PAGINATION_KEYS = ['currentPage', 'scrollOffset'];
/**
 * Build filter query string from current search params (minus pagination/scroll).
 * Optionally merge customFilters (e.g. from ListContext) into the result.
 */
export const getFilterQueryStringFromSearchParams = (searchParams, customFilters) => {
    const params = new URLSearchParams(searchParams);
    for (const key of PAGINATION_KEYS) {
        params.delete(key);
    }
    if (customFilters && Object.keys(customFilters).length > 0) {
        for (const [key, value] of Object.entries(customFilters)) {
            if (value === undefined || value === null)
                continue;
            if (Array.isArray(value)) {
                params.delete(key);
                value.forEach((v) => params.append(key, String(v)));
            }
            else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                params.set(key, JSON.stringify(value));
            }
            else {
                params.set(key, String(value));
            }
        }
    }
    return params.toString();
};
