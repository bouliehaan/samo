/**
 * Safely parses a JSON string.
 * Returns the parsed object if successful, or the fallback value (default null) if parsing fails.
 * This prevents unexpected crashes due to malformed or unexpected data in cache/network payloads.
 */
export function safeParseJson<T = unknown>(raw: string, fallback: T | null = null): T | null {
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}
