import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from './schema';

// Opens (and lazily migrates) the single SQLite connection that backs the
// local Samo library mirror. Everything in services/catalog reads and writes
// through `getCatalogDatabase()`, which resolves the same connection for the
// lifetime of the app. expo-sqlite serializes statements on one connection, so
// callers only need to await their own operations sequentially.

const DATABASE_NAME = 'samo-catalog.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let readerDatabase: SQLite.SQLiteDatabase | null = null;
let readerAttempted = false;

export const getCatalogDatabase = (): Promise<SQLite.SQLiteDatabase> => {
    if (!databasePromise) {
        databasePromise = openAndMigrate().catch((error) => {
            // Drop the rejected promise so the next caller retries the open
            // instead of being permanently stuck on a one-time failure.
            databasePromise = null;
            throw error;
        });
    }
    return databasePromise;
};

/**
 * A second, synchronously-opened connection used ONLY for SELECTs on the render
 * path. WAL (set by the writer) lets it read a consistent snapshot concurrently
 * with the long write transactions a sync produces, so browse screens can read
 * the mirror DURING render — no await, no loading state, no spinner. Returns
 * null if it can't be opened yet; callers then fall back to the async path.
 *
 * The async writer ({@link getCatalogDatabase}) owns schema creation/migration;
 * this connection only reads. Call {@link warmCatalogDatabase} at startup so the
 * schema exists before the first synchronous read.
 */
export const getCatalogReaderSync = (): SQLite.SQLiteDatabase | null => {
    if (readerAttempted) {
        return readerDatabase;
    }
    readerAttempted = true;
    try {
        readerDatabase = SQLite.openDatabaseSync(DATABASE_NAME);
        readerDatabase.execSync('PRAGMA journal_mode = WAL;');
    } catch {
        readerDatabase = null;
    }
    return readerDatabase;
};

/** Eagerly open + migrate the writer so the schema exists for the sync reader. */
export const warmCatalogDatabase = (): void => {
    void getCatalogDatabase().catch(() => undefined);
};

const openAndMigrate = async (): Promise<SQLite.SQLiteDatabase> => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    // WAL keeps reads from blocking the long write transactions a full sync
    // produces. journal_mode must be set outside any transaction.
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await runMigrations(db);
    return db;
};

const runMigrations = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const current = row?.user_version ?? 0;
    if (current >= MIGRATIONS.length) {
        return;
    }

    for (let version = current; version < MIGRATIONS.length; version += 1) {
        const sql = MIGRATIONS[version];
        await db.withTransactionAsync(async () => {
            await db.execAsync(sql);
            // user_version cannot be parameterized; `version` is a loop integer
            // so the interpolation is injection-safe. Stamping it inside the
            // transaction makes the version bump atomic with the schema change.
            await db.execAsync(`PRAGMA user_version = ${version + 1};`);
        });
    }
};
