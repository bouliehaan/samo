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
let readerFailedOnce = false;

/**
 * Close + forget both connections so the next reads reopen fresh. The heal
 * for the orphaned-inode failure mode: when the database FILE is replaced on
 * disk (e.g. the platform SQLite's corruption handler deleted it and the sync
 * engine re-created it), connections opened before the swap keep reading the
 * deleted inode — every surface renders empty while the new file fills up.
 * Recycling reattaches to whatever path currently exists.
 */
export const recycleCatalogConnections = async (): Promise<void> => {
    const promise = databasePromise;
    databasePromise = null;
    const reader = readerDatabase;
    readerDatabase = null;
    readerFailedOnce = false;
    if (promise) {
        try {
            const db = await promise;
            await db.closeAsync();
        } catch {
            // already broken — nothing to close
        }
    }
    try {
        reader?.closeSync();
    } catch {
        // ignore
    }
};

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
    // Retry-on-failure, not attempt-once-forever: the old one-shot latch meant
    // a single failed open (e.g. racing the very first boot's directory
    // creation) silently nulled the sync reader for the ENTIRE JS lifetime —
    // every mirror-backed surface rendered empty until an app restart, with
    // zero evidence. Now a failure logs loudly and the next read retries.
    if (readerDatabase) {
        return readerDatabase;
    }
    try {
        readerDatabase = SQLite.openDatabaseSync(DATABASE_NAME);
        // busy_timeout BEFORE journal_mode: the Kotlin sync engine holds
        // BEGIN IMMEDIATE through its write batches, and a connection with no
        // busy_timeout gets an INSTANT SQLITE_BUSY instead of waiting — which
        // is exactly how a fresh install's first session went blind: this
        // open raced the first full sync, threw, and the old one-shot latch
        // nulled the reader for the entire session.
        //
        // 250ms, NOT 5000: this connection serves SYNCHRONOUS reads on the
        // RENDER path — every millisecond it waits is a frozen JS thread.
        // WAL readers rarely block at all; when one does, failing fast and
        // falling back (callers degrade to async/network paths) beats
        // freezing navigation for seconds. The ASYNC connection keeps the
        // long timeout — its migrations/writes genuinely need to queue.
        readerDatabase.execSync('PRAGMA busy_timeout = 250;');
        readerDatabase.execSync('PRAGMA journal_mode = WAL;');
        if (readerFailedOnce) {
            // eslint-disable-next-line no-console
            console.log('[catalog] sync reader recovered after earlier failure');
        }
    } catch (error) {
        readerDatabase = null;
        if (!readerFailedOnce) {
            readerFailedOnce = true;
            // eslint-disable-next-line no-console
            console.error('[catalog] sync reader open FAILED', error);
        }
    }
    return readerDatabase;
};

/** Eagerly open + migrate the writer so the schema exists for the sync reader. */
export const warmCatalogDatabase = (): void => {
    void getCatalogDatabase()
        .then(async (db) => {
            // One-line boot health probe, mirroring the Kotlin reader's
            // "catalog reader online" line — the two MUST agree on path and
            // counts. When they don't, every JS surface quietly renders empty
            // while the sync engine reports success; this line is what makes
            // that failure mode diagnosable from logcat instead of invisible.
            const counts = await db.getFirstAsync<{ items: number; tracks: number }>(
                'SELECT (SELECT COUNT(*) FROM catalog_item) AS items, (SELECT COUNT(*) FROM catalog_track) AS tracks',
            );
            // eslint-disable-next-line no-console -- deliberate boot health probe
            console.log(
                `[catalog] js reader online — items=${counts?.items ?? -1} tracks=${counts?.tracks ?? -1} dir=${SQLite.defaultDatabaseDirectory}`,
            );
        })
        .catch((error) => {
            // A silent catalog open failure renders every surface empty with
            // zero evidence; this line is the evidence.
            // eslint-disable-next-line no-console
            console.error('[catalog] js open/migrate FAILED', error);
        });
};

const openAndMigrate = async (): Promise<SQLite.SQLiteDatabase> => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    // busy_timeout FIRST: without it, every statement below fails with an
    // instant SQLITE_BUSY whenever the Kotlin sync engine is mid-batch — the
    // exact race a fresh install hits (connect triggers the first full sync
    // while this open/migration is still running).
    await db.execAsync('PRAGMA busy_timeout = 5000;');
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
