/**
 * Shared persist migration helpers. Each store should declare `version` and `migrate`
 * even when the migrate is a no-op today so future schema changes have a hook.
 */
export const PERSIST_VERSION_INITIAL = 1;

export function identityPersistMigrate<T>(persisted: unknown, _version: number): T {
    return persisted as T;
}
