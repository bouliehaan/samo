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
 * Drop both connections so the NEXT access reopens fresh handles. Called the
 * instant the Kotlin sync engine finishes.
 *
 * Why it's needed: Kotlin closes its native writer at end-of-sync. Because the
 * Kotlin engine (io.requery's SQLite) and this JS side (expo-sqlite's SQLite)
 * are DIFFERENT SQLite builds that don't share a per-process lock manager, that
 * close releases THIS process's POSIX locks on the file (the classic
 * close()-drops-all-POSIX-locks quirk) AND checkpoints+truncates the WAL into
 * the main file. Our long-lived cached connections — opened at boot when the
 * mirror was still empty — are then bound to dropped locks / a checkpointed-away
 * snapshot / a possibly-replaced inode, so every synchronous mirror read returns
 * 0 rows. That is the "Home shows only the server-backed shelves; Library and
 * Playlists are blank after the first sync" bug.
 *
 * The sync reader's `.shm` shared lock is what most-often blocks Kotlin's
 * `wal_checkpoint(TRUNCATE)` (silently — Kotlin doesn't read the return code yet,
 * so a busy checkpoint leaves the data stranded in the WAL), AND blocks the next
 * fresh reader's WAL recovery — so we MUST actually close the sync reader, not
 * just drop the reference. That's safe: the sync reader has no in-flight async
 * ops by construction (sync-only), and the JS thread serializes everything
 * around this call. We still ref-drop the async writer rather than close it —
 * the writer has the Scudo-crash shape if an async op is in flight.
 *
 * Triggered from the SamoCatalogSyncState event handler, BEFORE the post-sync
 * listeners fire — so the next call to getCatalogReaderSync() opens fresh and
 * sees the freshly-synced rows.
 */
export const recycleCatalogConnections = (): void => {
    const reader = readerDatabase;
    databasePromise = null;
    readerDatabase = null;
    readerFailedOnce = false;
    if (reader) {
        try {
            reader.closeSync();
        } catch (error) {
            // Best-effort: a failure here just means the reader native handle
            // GCs on its own schedule. The reference is already dropped above,
            // so reads won't see it again either way.
            // eslint-disable-next-line no-console
            console.warn('[catalog] sync reader closeSync failed during recycle', error);
        }
    }
};

/**
 * One-shot post-sync ritual: open the JS writer (which re-acquires a healthy
 * lock + brings the WAL forward), run a PASSIVE wal_checkpoint to consolidate
 * any frames the Kotlin writer's TRUNCATE checkpoint may have left behind
 * (silent BUSY failures still happen on devices with active readers), then
 * verify rows are visible. The sync reader is opened lazily by the next render
 * call and gets a clean snapshot.
 */
export const consolidateCatalogAfterSync = async (): Promise<void> => {
    try {
        const db = await getCatalogDatabase();
        const counts = await db.getFirstAsync<{ items: number }>(
            'SELECT COUNT(*) AS items FROM catalog_item',
        );
        // eslint-disable-next-line no-console -- deliberate post-sync health probe
        console.log(`[catalog] post-recycle consolidate — items=${counts?.items ?? -1}`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[catalog] consolidateCatalogAfterSync failed', error);
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
        // useNewConnection is LOAD-BEARING, not optional. expo-sqlite caches
        // native connections by path+options and hands the SAME sqlite3* back to
        // every opener with matching options (SQLiteModule: findCachedDatabase +
        // addRef). Without this flag, openDatabaseSync here returns the very same
        // native handle as the async writer (openAndMigrate below). The writer's
        // async ops run on expo's module coroutine thread while these sync reads
        // run on the JS thread — two threads driving one non-serialized sqlite3
        // connection during the initial sync, which corrupts the heap and aborts
        // with "Scudo ERROR: invalid chunk state when deallocating" at close/
        // finalize (a hard native crash seen on real devices, masked on the
        // emulator). A dedicated connection keeps the render-path reader fully
        // isolated from the writer; WAL still gives it a consistent snapshot.
        readerDatabase = SQLite.openDatabaseSync(DATABASE_NAME, {
            useNewConnection: true,
        });
        // busy_timeout BEFORE journal_mode: the Kotlin sync engine holds
        // BEGIN IMMEDIATE through its write batches, and a connection with no
        // busy_timeout gets an INSTANT SQLITE_BUSY instead of waiting — which
        // is exactly how a fresh install's first session went blind: this
        // open raced the first full sync, threw, and the old one-shot latch
        // nulled the reader for the entire session.
        //
        // 250ms, NOT 5000: this connection serves SYNCHRONOUS reads on the
        // RENDER path — every millisecond it waits is a frozen JS thread.
        // Readers rarely block at all; when one does, failing fast and
        // falling back (callers degrade to async/network paths) beats
        // freezing navigation for seconds. The ASYNC connection keeps the
        // long timeout — its migrations/writes genuinely need to queue.
        readerDatabase.execSync('PRAGMA busy_timeout = 250;');
        readerDatabase.execSync('PRAGMA journal_mode = DELETE;');
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
    // We MUST useNewConnection to bypass the native expo-sqlite connection cache.
    // When Kotlin finishes a sync, it releases POSIX locks, which breaks any
    // natively cached connection. We deliberately leak the broken connection and
    // ask for a fresh one that will establish its own healthy locks to the WAL.
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME, {
        useNewConnection: true,
    });
    // busy_timeout FIRST: without it, every statement below fails with an
    // instant SQLITE_BUSY whenever the Kotlin sync engine is mid-batch — the
    // exact race a fresh install hits (connect triggers the first full sync
    // while this open/migration is still running).
    await db.execAsync('PRAGMA busy_timeout = 5000;');
    // Use DELETE journal mode (rollback journal) instead of WAL so POSIX file
    // locks coordinate the two SQLite builds (expo-sqlite vs Kotlin io.requery).
    // journal_mode must be set outside any transaction.
    await db.execAsync('PRAGMA journal_mode = DELETE;');
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
