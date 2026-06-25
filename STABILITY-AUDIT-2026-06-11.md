# Samo Android — Stability & Performance Architecture Audit
**2026-06-11 · senior architect pass · android app (server touched only where the issue demands it)**

Scope read: all of `apps/android/src` orchestration (App.tsx, native-playback, media-handlers,
controls, server-auth, catalog services, artwork pipeline, state stores), the full Kotlin audio
package, and the core mobile/server layers the app routes through. Gates verified green on the
current uncommitted tree (android tsc + 28 vitest, core tsc + 52 vitest).

---

## The one-sentence diagnosis

The app is slow and unreliable because **almost every concern has two owners** — a JS
implementation and a Kotlin implementation, or a legacy network path and a local-mirror path —
and the gap between each pair is papered over with reconcilers, healers, generation counters,
and timeout cliffs. The playback rework (2026-06-11) fixed this disease *inside the player*;
the same disease is still systemic everywhere else.

Nothing here touches the bit-perfect surface (float output, no offload, USB mixer renegotiation,
no transcode). Every recommendation below is orthogonal to the audio path.

---

## Part 1 — The five structural diseases

### D1. Dual sync engines, one database, one shared cursor ⚠ worst offender

Two complete catalog sync engines run against the same SQLite file and the **same delta cursor**:

- JS: `src/services/catalog/catalog-sync.ts` (~700 lines) — foreground, owns `catalog_detail` + FTS.
- Kotlin: `SamoCatalogSync.kt` + `SamoCatalogWriter.kt` + `SamoCatalogConverters.kt` +
  `SamoCatalogServerClient.kt` + worker + auth mirror (~1,900 lines) — 30-min WorkManager periodic,
  scheduled on every boot (`index.ts`), owns items + tracks only.

Both advance `deltaServerTime`. Neither covers the other's tables. The documented consequences —
all real bugs Jacob hit — required **two permanent healers** that now run on every sync:

- `reindexItemSearchFromCatalog` (catalog-sync.ts:203): rebuilds the entire non-song FTS index
  every run, because Kotlin advances the cursor without writing FTS, silently dropping artists
  from search.
- `shouldBackfillMirror` completeness check (catalog-sync.ts:604): counts the mirror against the
  manifest and forces a full re-enumerate, because either engine can advance the shared cursor
  after a partial run and unchanged rows then never come back.

Plus a steady-state cost: **two writers on `samo-catalog.db`**. The Kotlin periodic sync takes the
write lock mid-playback; JS reads/writes stall behind `busy_timeout=5000` — up to 5 s of JS-thread
SQLite stalls while you're using the app. This is a direct contributor to "long session = sluggish."

The healers are good engineering *given* the dual ownership. The dual ownership is the flaw.

### D2. The mirror exists but isn't trusted (local-first betrayed)

The entire library is mirrored into SQLite — that was the local-first initiative's whole point —
yet the network is still treated as the render-path source of truth:

- **Home** = a ~15-request network fan-out per load (`loadSamoHomeContent`, mobile-home.ts:1653:
  10 top-level requests, +4 inside recently-added which re-downloads 300 audiobooks and 300
  podcasts that two sibling requests download *again*), racing **three** sources of truth
  (catalog seed → persisted JSON `home-content-cache` → network), reconciled by a hand-rolled
  recursive `deepEqual` over the full payload (`home-content.ts:30`) so the page doesn't flash.
- **Library / View All** = mirror paint, then `loadAndroidFullCollection` re-enumerates the whole
  library from the network (500/page, up to 40 pages/variant) — a second full enumeration that
  duplicates the sync engine's job, on screen-open.
- **Detail** = four cache layers (memory map → SQLite → fs JSON `media-detail-cache` → network),
  network refresh on every open.
- **Audiobook tap** = network **first**, caches as fallback (`handleStartAudiobook`,
  use-android-media-handlers.ts:705).

Every one of these layers exists to hide the latency of a network call that shouldn't be on the
path at all. The fs JSON caches (`home-content-cache.ts`, `media-detail-cache.ts`) are pure
redundancy with the SQLite mirror. (`refreshAndroidHomeLiveSections` in home-content.ts is now
fully dead code — no callers.)

### D3. Tap-to-sound still front-loads network ahead of the commit

`playQueuedItem` got the instant-synchronous-commit fix (round 3), but the handlers *above* it
still await server I/O before the commit ever runs — so taps still go dead when the server is slow:

- Audiobook tap: `loadAndroidMediaDetail` (network-first, **30 s timeout**) → `loadAbsCurrentProgress`
  (another GET) → play. Worst case ~60 s of dead air.
- Samo podcast tap: `loadAbsCurrentProgress` → downloads lookup → `loadAndroidMediaTrackPlayback`
  (server) → play. 2–3 serial round-trips pre-commit (use-android-media-handlers.ts:951–1065).
- Music tap: `preparePlaybackItemForNative` is awaited for **every track in the queue**
  (`Promise.all` over a whole album/playlist, :893) before commit, then the entire credentialed
  queue is serialized over the RN bridge in `play()` — and re-serialized on every Up-Next edit.
  O(queue) JS work per tap, twice.

And the universal ceiling: `DEFAULT_SAMO_REQUEST_TIMEOUT_MS = 30_000` (core server-http.ts:11) on
*interactive* paths. Any single stalled request = the app "feels dead" for 30 s.

The kicker: the per-item JS URL rewriting is now **redundant** — native re-mints every track's
token at load time (`SamoResolvingDataSource` + `SamoStreamTokenCache.kt`) and can build URLs
from `{kind, targetId}` (Phase 2 PROPER). JS preparing URLs for queue items is the second owner
doing the work again.

### D4. Connect/boot is three serial 30-second cliffs followed by a stampede

`authenticateSamo` (core server-samo.ts:757) = **3 serial round-trips** (setup-status → login →
device-token mint), each under a 30 s timeout, no retry, no per-step feedback. Any one stalled
hop = the observed "first reconnect fails after timeout." (The *cause* of the first hop stalling
is answerable from the server access log in 5 minutes: if the first request never arrives,
it's the phone's network layer warming the route; if it arrives late, it's the server. The fix
direction is the same either way — see R4.)

Then on success, **everything fires at once**: 15-request home fan-out + full catalog crawl
(detail fetches at concurrency 8) + whole-library artwork prefetch (concurrency 6) + library
full-collection network enumerate + health checks + token mints — saturating one LAN link and one
JS thread. This is why the first minutes after a reconnect feel broken, and a request failure
during that one full sync is exactly how the mirror went permanently partial (pre-backfill).

### D5. Dead multi-backend abstraction still shapes every signature

The only backend is Samo, but the app still routes through the 4-backend abstraction everywhere:

- Core still ships ABS/Navidrome/Subsonic authenticators (server-auth.ts), `server-audiobookshelf.ts`,
  `server-subsonic.ts`, `subsonic-quality-scan.ts`, and ~1,000+ lines of Subsonic/ABS home/collection
  loaders inside mobile-home.ts.
- The app performs `ServerType.SAMO` checks **60 times**, resolves auth via
  `findServerAuthenticationForSource(serverConnections, source)` on nearly every call site, and
  threads `serverConnections: ServerAuthenticationResult[]` through every hook/component — for a
  list that always contains one Samo connection. AddServerScreen still offers a server-type picker.
- The "abs" vocabulary (`absContextRef`, `abs-progress`, `loadAbsCurrentProgress`) survives as
  naming for what is now Samo progress.

This isn't only dead weight — the *indirection is the tax*. Auth lists + source-matching is why
`serverConnections` identity changes ripple through ~30 effect deps (App.tsx, native-playback's
event resubscription, per-tile artwork effects).

---

## Part 2 — Secondary findings (real, smaller)

**P1. Permanent 1–2 s bridge poll + metadata echo loop.** During playback, JS polls
`getStatus()` over the bridge every 1–2 s forever (use-android-native-playback.ts:1060) *and*
`NowPlayingMetadataSync` recomputes artwork resolution + `JSON.stringify` on **every**
playback-store update (PlayerSurface.tsx:338), feeding a channel whose pushes native now mostly
gates off. Native already has a main-looper tick (SamoProgressSync) — it could emit positionMs
pushes and the poll dies.

**P2. All five tabs permanently mounted, zero virtualization.** Every tab renders inside plain
`ScrollView`s (App.tsx:1702); Home/Playlists/Search/Radio fully materialize all sections/tiles.
Every `homeContentState`/`visibleRecentItems` change re-renders all five (memo'd, but those two
props are rebuilt). `visibleRecentItems` also returns fresh row objects whenever a home item
matches (merge spread, App.tsx:625) — recents rows re-render on every home refresh even when
value-identical.

**P3. 45 hand-rolled race guards, zero AbortController.** Every async flow does
"capture token → await → compare token". Stale requests aren't *cancelled* — they run to
completion and burn network/CPU/DB, they just don't commit. Core's fetch layer accepts
`AbortSignal` (server-http.ts:44) and almost nothing passes one.

**P4. Catalog delta re-crawls ALL podcasts every sync** (catalog-sync.ts:465, known) — the
dominant delta cost on a podcast-heavy library, on the JS thread.

**P5. Artwork fixes are sitting uncommitted.** The token-invariant cache key work
(`artwork-canonical.ts`) is in the tree but not shipped; until a build lands it, the
~25-min token rotation keeps fragmenting the disk cache (the historical "clear cache fixes it"
degradation). Ship it. Separately, `prefetchCatalogArtwork` re-walks the entire library on every
connect *and* 8 s after every launch — post-sync only would do.

**P6. Misc correctness papercuts.**
- `handleTabPress` fires on both `onPressIn` *and* `onPress` (App.tsx:1952) — double dispatch per tap.
- `registerNavigatePlayback` effect has no dep array (App.tsx:1263) — runs every render.
- The audio-event subscription tears down/re-subscribes whenever `serverConnections`/cast state
  changes (native-playback.ts:1030 deps) — events in the gap are dropped.
- The playback-status poll's `setInterval` keeps polling when the app is backgrounded (JS frozen
  anyway under Doze, but it burns on every wake tick while backgrounded-but-not-frozen).

---

## Part 3 — What I would do (sequenced, with the forks that are yours)

**Sequencing constraint (important):** the tree currently holds the *unverified* playback rework
rounds 2–3 + server fixes. Do not start demolition on top of unverified work. Order:
**(0) rebuild Kotlin + redeploy server → device-verify the rework → commit it.** Then:

### R1. One sync owner ← biggest stability win — **FORK A/B**
- **A — Kotlin owns sync completely** (matches your locked 2026-06-04 direction): port detail
  crawls + FTS indexing into `SamoCatalogSync.kt`; delete `catalog-sync.ts`, both healers, the
  shared-cursor coexistence rules, and the JS sync path entirely. JS keeps: a `triggerNow()`
  button + progress events. Keeps 30-min background freshness. Cost: the remaining sync surface
  (detail mapping + FTS) moves to Kotlin (~3–4 focused sessions of work + careful converters).
- **B — JS owns sync, Kotlin sync deleted**: remove `SamoCatalogSync*/SamoCatalogWriter/
  SamoAuthMirror/worker` + the boot schedule; sync runs on launch/foreground/connect (delta is
  seconds-fast). Cost: no background refresh — the mirror is only as fresh as the last open,
  which in practice is when you look at it anyway. Massively less code, single writer, the 5 s
  mid-playback DB stalls disappear by construction.
- Either way the two healers and the cursor split-brain are deleted, and the DB has one writer
  per process lifetime.

### R2. Local-first inversion (Home/Library/Detail render from the mirror, period)
- Home = synchronous mirror read (already exists: `loadCatalogHomeContentSync`) + delta sync on
  focus/pull-to-refresh; network only for the two legitimately-live sections (podcast feed,
  discover) and radio (radio isn't in the mirror's variants — either add it or keep its one fetch).
- Delete: the 15-request `loadSamoHomeContent` fan-out for everything else, `home-content-cache.ts`,
  `media-detail-cache.ts`, the deepEqual reconciler, the seed/cache/network precedence dance in
  `loadHomeForConnections`, and the Samo branch of `loadAndroidFullCollection`'s network enumerate.
- Detail opens read the mirror only; freshness is the sync engine's job, not the screen's.
- Search keeps local-paint + server-merge (it's cheap and genuinely authoritative).
- This is the single biggest "feels fast" change: every browse surface becomes a local DB read.

### R3. Commit-first tap-to-sound, end to end
- Restructure `handleSelectMediaItem` / `handlePlayMediaTrack` / `handleStartAudiobook` the same
  way round 3 restructured `playQueuedItem`: synchronous UI commit first, then bounded (4 s)
  resume/URL resolution with session checks. Audiobook detail + chapters come from the mirror
  synchronously → a book tap needs zero network before sound.
- Stop preparing the whole queue in JS: prepare the tapped item only; hand native the raw queue —
  native already re-mints per item at load (`SamoResolvingDataSource`). Delete per-item JS URL
  rewriting for queue items (keep it for cast, which bypasses the native resolver).
- Drop interactive timeouts to 8 s (one retry) and keep 30 s only for bulk sync paths.

### R4. Connect/boot sanitation
- Collapse auth to ≤2 round-trips (fold device-token mint into login server-side — small samo-server
  change — or at minimum run setup-status in parallel and add one auto-retry per step with 8–10 s
  timeouts + per-step status text). The "first reconnect times out" symptom dies either by the
  retry or by whatever the server access log shows — check it once during a stability run.
- Serialize the post-connect stampede: full sync (with its existing progress UI) → then artwork
  prefetch → background. Home paints from the mirror as soon as items land; no separate library
  network enumerate.

### R5. Kill the multi-backend abstraction — **FORK on scope**
- App-side now: delete the server-type picker, `ANDROID_SERVER_TYPES`, the ABS download residue,
  the 60 `ServerType.SAMO` guards, and rename the `abs*` vocabulary → `progress*`. Replace
  `serverConnections`-threading with a single `useSamoServer()` store (one connection, stable
  identity → the 30-dep ripple disappears).
- Core-side: deleting ABS/Navidrome/Subsonic modules from `packages/core` also touches the
  **Electron** app (unexamined, ~56 files of refs). Fork: (a) do core+desktop together as its own
  pass later, or (b) core deletes now and desktop gets fixed in the same pass. I'd do (a) — keep
  today's blast radius to the android app, since desktop wasn't in scope.

### R6. Render/perf pass — measured, not blind (the standing hard lesson)
- Virtualize Home/Library/View-All (FlashList), lazy-mount tabs on first visit, move App.tsx
  state into the existing module stores so its ~25 effects stop re-rendering the world.
- Replace the 1–2 s JS status poll with native positionMs pushes (SamoProgressSync already ticks);
  gate `NowPlayingMetadataSync` to radio (the only consumer native doesn't cover).
- Fix the P6 papercuts (one-line each).
- All of this verified with the on-device profiler per the established rule — no blind timing tuning.

### Effort/impact summary

| Step | Stability impact | Perf impact | Risk | Size |
|------|-----------------|-------------|------|------|
| R1 one sync owner | ★★★★★ | ★★★ | medium | large (A) / medium (B) |
| R2 local-first inversion | ★★★ | ★★★★★ | medium | large |
| R3 commit-first taps | ★★★★ | ★★★★ | low-med | medium |
| R4 connect sanitation | ★★★★ | ★★ | low | small-med |
| R5 abstraction strip | ★★ | ★★ | low (app) | medium |
| R6 render pass | ★ | ★★★ | low-med | medium |

Recommended order: verify+commit current tree → R4 + R3 + P5/P6 (fast wins, low risk) →
R1 (your fork) → R2 → R5 → R6. Each step independently shippable and device-verifiable.
