# Stability & Performance Rework — 2026-06-12

Execution of the architecture audit (R1–R6). One sentence per disease: every
concern now has ONE owner. Kotlin owns sync and playback continuity, the
SQLite mirror owns rendering, TypeScript owns mapping, the server's delta
owns freshness, and JS asks the network for exactly three things on the hot
path (live home sections, resume reads, auth).

**Deploy requirements: full native (Kotlin) rebuild — NOT a Metro reload — and
a server rebuild/redeploy (`samo-server` changed). First app launch after
upgrade runs one full catalog re-sync (cursor v3), then deltas forever.**

---

## What changed

### R1 — One sync owner: Kotlin (`SamoCatalogSync.kt` rewrite)
- Kotlin now owns EVERYTHING: items, tracks, **detail crawls**, **FTS index**,
  deletion reconcile (now including details + search rows), the delta cursor,
  completeness backfill, and sync-state rows. WorkManager drives it
  (30-min periodic + `triggerNow` from connect / sync button / pull-refresh).
- **The JS sync engine is DELETED** (`catalog-sync.ts`,
  `catalog-sync-completeness.ts`, the FTS healer). Both healers became
  structural: one writer can't split-brain itself. The completeness decision
  logic was ported to Kotlin and JUnit-locked (`SamoCatalogSyncDecisionTest`).
- **Latent data-loss bug found & fixed**: Kotlin's `markSyncStarted` upsert
  bound NULL for untouched columns, clobbering the delta cursor *before the
  orchestrator read it* — so every background run for the past week was a
  FULL re-enumerate every 30 minutes; and a partially-failed full run still
  ran `pruneSource`, silently deleting every row of any variant whose fetch
  errored. This is the most likely mechanism behind the periodic
  partial-mirror states that ended in storage clears. Now: sync-state writes
  are read-modify-write, the cursor only advances on clean runs, and prune
  only runs after a clean full walk.
- Detail rows store **raw server JSON** (`$samoRawDetail` envelope); the JS
  read path hydrates them through the SAME core mappers the network path uses
  (`mapSamo*Detail`, extracted as pure functions). One mapping implementation,
  zero Kotlin/TS drift surface.
- Podcast detail crawls are gated by the manifest's episode count (cursor
  remembers it) instead of re-crawling every show on every delta.
- Progress streams to JS as `SamoCatalogSyncState` device events (Settings
  panel updates live); background runs just write the table and JS re-reads on
  foreground.

### R2 — Local-first inversion: the mirror renders everything
- Home, Library (grids + "relevant" pool), View-All, and detail opens read the
  mirror only. The ~15-request home fan-out, the per-detail-open network
  refresh, the View-All full re-enumeration, and the 11-request library pool
  are all GONE from interactive paths.
- The only network on the Home path: Discover + Podcast Feed + Radio (the
  server-curated sections), fetched on boot/connect/pull-refresh and kept
  through mirror re-derives.
- `home-content-cache.ts` and `media-detail-cache.ts` (both fs JSON caches)
  are deleted — the mirror IS the persistent cache.
- Mirror-rendered surfaces re-derive automatically when a sync completes.
- **Server fix that gates this** (`samo-server`): `updatedSince` on the music
  list endpoints now folds in the per-user playback write clock
  (`PlaybackState.StateUpdatedAt`, track→album/artist rollup included), so
  plays/favorites flow through deltas. Without this, mirror-derived "Favorite
  Albums/Artists" froze at first-sync values. Regression-locked in
  `delta_sync_test.go`.

### R3 — Commit-first tap-to-sound
- Audiobook taps: mirror detail first (memory → SQLite → offline files),
  network only when nothing local; the progress read is bounded (4s).
- Samo podcast taps: the serial pre-play progress GET is gone — resume is
  owned by ONE place (`playQueuedItem`'s bounded server-resume overlay).
- Music taps prepare ONLY the tapped item; the queue rides raw (native
  re-mints per-track tokens as ExoPlayer opens each source). The post-play
  "refresh the upcoming item + re-bridge the whole queue" pass is deleted.

### R4 — Connect sanitation
- Samo auth is login-first (setup-status probe only on failure) → 2 round
  trips, not 3.
- Interactive auth requests: 10s timeout + one automatic retry with live
  status ("Server slow to respond — retrying…") — built to absorb the
  first-connect stall pattern.

### R5 — Dead-backend strip (android side)
- AddServerScreen is Samo-only (server-type picker deleted), ABS download
  paths deleted, `server-types.ts` deleted, dead ABS imports/helpers gone.
- **Samo audiobook downloads now actually work** (previously every Samo book
  failed with "Audiobookshelf server no longer connected"): per-file download
  via the whole-file stream route, trackId `bookId:file:mediaFileId` agreed
  with `resolveLocalPlayback` and `getOfflineAudiobookFiles` by construction.
- Core/Electron strip deferred (per Jacob).

### R6 — Render & event-path performance
- **The 1–2s JS position poll is deleted.** The native engine pushes a status
  event per second while the local player plays AND the app is foregrounded
  (host-lifecycle-gated); Cast already pushes its own progress. Native is the
  source of truth — it pushes, JS never asks.
- Lazy tab mounting: scenes mount on first visit (boot renders Home alone);
  the cheap opacity-toggle switching is unchanged.
- Playback callbacks (`playQueuedItem` & co.) are referentially stable (refs
  for connections/cast) — the audio-event subscription no longer tears down on
  health-check ticks, and the playback hook subscribes to a cast-connected
  slice instead of the whole session store.
- `NowPlayingMetadataSync` is radio-only (native owns all other metadata).
- Launch-time whole-library artwork walk removed; the post-sync prefetch hook
  (sync-completed event) owns cache warming.
- Tab buttons no longer double-dispatch (onPressIn only).

---

## On-device verify checklist
1. **Fresh connect** (after the storage-clear ritual): connect should succeed
   first try, or visibly retry once and succeed. Watch for the new status line.
2. First sync after upgrade: Settings → Local library shows live progress;
   counts land (items/tracks/details); Home fills in as it completes.
3. Tap an audiobook / podcast / album with the server PAUSED (`systemctl stop`
   briefly): taps still paint instantly; audiobook starts from local data;
   podcast starts after ≤4s (resume falls back).
4. Search "The Beatles" offline → artists/albums/songs all present (Kotlin FTS).
5. Play a few tracks, wait for a delta (or trigger sync) → Home "Favorite
   Albums" ordering reflects the new plays (server StateUpdatedAt fix).
6. Long session + Wi-Fi blips: no 30-min full-sync stalls (watch
   `adb logcat -s SamoCatalogSync` — runs should say delta, finish in seconds).
7. Seek bar advances normally during playback (native ticks), full player and
   mini player both; background → foreground reconciles position.
8. Download a Samo audiobook → files appear per-part → airplane mode → plays
   offline from the right position.
9. Bit-perfect badge on USB DAC unchanged (playback chain untouched).
10. 18-hour shuffle soak: screen off, plugged in — queue advances all night
    (this path was already native; nothing in this rework touches it except
    LESS JS interference).

## Post-deploy fix (same day, device-verified diagnosis)
- First on-device run surfaced `SQLiteException: unknown error (code 0
  SQLITE_OK): Queries can be performed using SQLiteDatabase query or rawQuery
  methods only` from `SamoCatalogWriter.ensureOpen:62` —
  `execSQL("PRAGMA busy_timeout = …")`. busy_timeout RETURNS A ROW even in its
  set form, and android.database's execSQL throws the moment a statement
  yields data. Fixed with the same rawQuery treatment journal_mode already
  had. **This single pre-existing line is why the Kotlin background sync never
  completed a single run on-device before today** — every ensureOpen threw
  before the first write, which retroactively explains why the coexistence-era
  "Kotlin sync" symptoms never matched its code: it never ran.

## Post-deploy fixes round 2 (same day — TWO more founding bugs, both device-diagnosed)
- **`no such module: fts5`**: Android's PLATFORM SQLite ships without the fts5
  module — only expo-sqlite's bundled sqlite3 has it. The Kotlin engine could
  never touch `catalog_search` (and a Kotlin-first fresh install could never
  even create it). Resolution: ownership partitioned BY TABLE — Kotlin owns
  the mirror (items/tracks/details/sync-state); the new JS
  `catalog-search-index.ts` (expo-sqlite, fts5-capable) DERIVES the search
  index from the mirror after each sync: full non-song rebuild + incremental
  song indexing via a per-source synced_at cursor + orphan sweep. Search
  freshness is a UI concern, so JS ownership is architecturally sound.
- **Pagination contract mismatch**: the Kotlin client read `{data, hasMore}`;
  the server's Page struct returns `{items, total, limit, offset}`. Every
  list fetch "succeeded" with zero records — which then walked straight into
  prune. Fixed (`items` + total/short-page termination), plus a guard: a
  clean full walk that returns 0 items against a populated mirror SKIPS prune
  and records an error instead of deleting the library.
- **Stuck-"syncing" fix**: any uncaught throw in a sync run now lands in
  markSyncFailed (best-effort) so the Settings panel never wedges on
  "syncing"; terminal events (synced AND error) re-derive Home/Library and
  kick the search indexer, so partial data renders honestly.
- Root lesson for all three: the Kotlin sync engine had NEVER successfully
  executed on a device before today — busy_timeout threw at connection-open
  on every prior run, masking the contract bugs behind it. First-run code
  paths hide in layers.

## Post-deploy round 3 — fresh-install blindness + the database deleter (device-verified)
- **Android's DefaultDatabaseErrorHandler DELETES the db file on a corruption
  verdict** — and a hot WAL/-shm left by a process kill, read by a different
  SQLite build, can trigger that verdict. Observed live: samo-catalog.db
  vanished across an app restart. Downstream: whichever side re-creates the
  file first leaves the OTHER side's already-open connections reading the
  orphaned deleted inode — "sync says 5559 items, UI reads 0" blind sessions
  that healed only on restart (Jacob's fresh-install repro, reproduced under
  probes).
- Fixes: never-delete error handlers on all Kotlin opens; busy_timeout=5000 on
  both JS connections (their opens raced the first sync's write locks);
  sync-reader retry instead of attempt-once-forever; post-sync orphaned-inode
  self-heal (sync reports items>0 + JS COUNT(*)==0 → recycle connections, then
  re-derive); boot health probes on both sides. Verified: 3× force-stop +
  relaunch cycles with identical counts both readers, Home/Library full.
- **Bulletproof-by-construction follow-up (landed)**: the Kotlin engine now
  opens `samo-catalog.db` through **io.requery sqlite-android** (bundled
  modern SQLite, AOSP-compatible API) — the platform SQLite never touches the
  catalog file again. Both writers (expo-sqlite JS + requery Kotlin) are
  modern bundled builds; `libsqlite3x.so` ships in the APK.

## Notes
- Mixed-era detail rows: the v3 cursor bump forces one full re-sync, so every
  detail row becomes a raw bundle on first run; the reader tolerates legacy
  rows in the interim.
- The playback defense-in-depth guards (anchor/grace/retired-sessions/
  pending-item lock) are UNTOUCHED per the boring-rework soak rule.
- `loadAndroidMediaDetail` (network detail) survives as the fresh-install
  fallback + explicit retry path only.
