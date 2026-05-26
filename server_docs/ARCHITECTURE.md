# Samo Server Architecture

Samo Server is a native self-hosted listening server for music, audiobooks, podcasts, and programmed radio. It is not a wrapper around Navidrome or Audiobookshelf. The goal is to provide Samo-native concepts with enough metadata richness to support a "home Spotify" client experience, while leaving room for compatibility adapters later.

This document is a living guide for humans and AI agents building the server. Update it whenever the architecture, module boundaries, data model, scanner behavior, or API contracts meaningfully change.

## Current State

The server currently has these major pieces:

- HTTP server entrypoint in `cmd/samo-server`
- env-driven process config in `internal/config`
- SQLite open/migrate layer in `internal/storage`
- embedded SQL migrations in `migrations`
- rich catalog domain models and in-memory read service in `internal/catalog`
- SQLite catalog hydration in `internal/catalog/sqlite.go`
- metadata scanners in `internal/scanner`
- optional external metadata lookup providers in `internal/metadata`
- filesystem library watcher in `internal/watch`
- library management and scan orchestration in `internal/libraries`
- embedded cover extraction and cache in `internal/covers`
- playback state persistence in `internal/playback`
- per-user audiobook bookmarks, collections, and listening sessions in `internal/bookmarks`
- local media file access and streaming in `internal/files`
- remote source ingestion in `internal/sources`
- Samo-native HTTP API handlers in `internal/api`
- Subsonic/OpenSubsonic compatibility adapter in `internal/subsonic`
- Last.fm scrobbling adapter in `internal/lastfm`
- 24/7 radio station module in `internal/radio`
- shared media taxonomy in `internal/media`

There is a minimal browser UI at `/app` (vanilla JS, no build step). The important product surface is the API.

## Domain Architecture

Samo has **four independent first-class domains**. There is no umbrella "shelf" or "longform" parent — audiobooks and podcasts are structurally different and share **only** infrastructure tables.

| Domain | Catalog DTO | DB tables | URL namespace | Playback target kinds |
|--------|-------------|-----------|---------------|-----------------------|
| Music | `MusicArtist`, `MusicAlbum`, `MusicTrack`, `MusicPlaylist` | `music_artists`, `music_albums`, `music_tracks`, `music_playlists`, `music_album_artists`, `music_track_artists` | `/api/v1/music/*` | `music-artist`, `music-album`, `music-track`, `music-playlist` |
| Audiobook | `AudiobookItem`, `Contributor`, `Series`, `BookMetadata` | `audiobooks`, `contributors`, `series`, `audiobook_contributors`, `audiobook_series`, `audiobook_chapters`, `bookmarks`, `collections`, `collection_audiobooks`, `listening_sessions` | `/api/v1/audiobooks/*`, `/api/v1/contributors/*`, `/api/v1/series/*`, `/api/v1/bookmarks/*`, `/api/v1/collections/*`, `/api/v1/listening-sessions` | `audiobook` |
| Podcast | `PodcastItem`, `PodcastEpisode`, `PodcastMetadata`, `PodcastFeed` | `podcasts`, `podcast_episodes`, `podcast_feeds`, `episode_chapters`, `podcast_episode_cache` | `/api/v1/podcasts/*` (split into `/shows/{id}` and `/episodes/{id}`) | `podcast`, `podcast-episode` |
| Radio | `StationRecord`, `StationItem`, `ProgramSlot` | `radio_stations`, `radio_station_items`, `internet_radio_stations` | `/api/v1/radio/*`, `/api/v1/internet-radio/*`, `/radio/{id}/*`, `/internet-radio/{id}/*` | n/a (one-shot stream) |

### Shared infrastructure (NOT shared models)

These tables/types are used across domains, but they are infrastructure — not parent entities.

- `media_files` — one row per audio file on disk. Exactly **one** of `audiobook_id`, `podcast_id`, `track_id`, `episode_id` is non-null. Lets cover extraction, file streaming, and Range serving work without forcing the four domains to share an item table.
- `AudioFile`, `AudioChapter`, `PlaybackState`, `Image`, `ExternalIDs` — value types embedded in catalog DTOs. Not entities.
- `extracted_covers` — embedded artwork cache.
- `genres` — keyed by `(name, kind)` so domains' genre vocabularies don't collide.
- `metadata_overrides` — write-time guard layer, discriminated by `target_kind` (`music-artist`, `music-album`, `music-track`, `music-playlist`, `audiobook`, `podcast`, `podcast-episode`, `podcast-feed`).
- `user_playback` — per-user playback state, discriminated by `target_kind` (same vocabulary as `metadata_overrides`).
- `scanner/longform_common.go` — shared file probing (`ffprobe`), folder grouping, disc/track ordering. Pure utility; produces transient `groupedAudio` structs, not catalog rows.
- `search/audiobook.go` `longformItemMatchesQuery` / `longformLess` — shared playback-state filter and sort tiebreak. Operate on `(PlaybackState, []string genres, *time.Time, string text)` tuples — they take no entity types.

### Library kinds

Libraries are typed by `kind`: `music`, `audiobook`, `podcast`, or `mixed`. The legacy `shelf` kind and `media_type` discriminator are gone (migration 016).

- `music` libraries scan into `music_*` tables.
- `audiobook` libraries scan each book folder into `audiobooks`.
- `podcast` libraries scan each show folder into `podcasts` plus per-file rows in `podcast_episodes`.
- `mixed` libraries are **containers**, not parents. The scanner classifies each subfolder via heuristics (sidecars, `.m4b`, single-large-file, episode-naming patterns) and routes it into the appropriate domain table. A mixed library produces audiobook rows, podcast rows, and music tracks — never a "mixed-item" row.
- For backwards compatibility with old API clients, `POST /api/v1/libraries` with `kind="shelf"` plus `mediaType="book"` or `"podcast"` is translated to `audiobook` / `podcast` at create time. New code should not emit those payloads.

### Why the split

Audiobook metadata (authors, narrators, series, chapters, bookmarks, collections, listening sessions) is structurally different from podcast metadata (feed URL, episodes, enclosures, polling state, episode cache). Bundling them under one `shelf_items` table with a `media_type` discriminator leaked one domain's concerns into the other and broke FK invariants. Migration 016 split them into independent top-level tables with the right FK chains, and reserves the right to add per-domain columns/relations without affecting the other.

> **Historical note:** Samo previously bundled audiobooks and podcasts behind a generic "shelf" abstraction (`shelf_items`, `shelf_authors`, `shelf_series`, `shelf_chapters`, `shelf_bookmarks`, `shelf_collections`, `shelf_listening_sessions`). Migration `016_split_audiobooks_podcasts.sql` retired that shape — see the migration body for the exact data move. Some sections of this document below still reference "shelf" — they are accurate descriptions of historical work, not the current schema or API surface.

## Foundation Work Log

Record completed foundation-layer work here so later features do not need to reopen low-level design. Each entry should name the owning package, schema changes, API contracts, and intentional limits.

### 2026-05-22 — First-run setup wizard

**Packages:** `internal/api`, `internal/users`, `cmd/samo-server`

**Behavior**

- On a fresh install the server no longer auto-generates a bootstrap admin password. The user-server row remains (so the legacy `SAMO_API_TOKEN` still maps to it), but no admin row is created until env vars opt in (`SAMO_BOOTSTRAP_USERNAME` or `SAMO_BOOTSTRAP_PASSWORD`) or the wizard completes.
- `/` redirects to `/setup` while setup is pending; `/setup` redirects back to `/` once an admin + library + scan exist.
- `users.bootstrap` defers admin creation when both username and password are blank, so headless deploys with secrets still work and humans see the wizard.

**HTTP API (`/api/v1/setup/*`)**

- `GET /api/v1/setup/status` — public; returns `{needsSetup, hasAdmin, hasLibrary, libraryCount, hasScanned, currentStep}`.
- `POST /api/v1/setup/admin` — public when no admin exists; creates the first admin and returns a login `LoginResponse` (user + bearer token). Subsequent calls return 409.
- `GET /api/v1/setup/directories?path=…` — public during setup, admin-only afterwards. Lists subdirectories under the provided absolute path with item counts. Rejects `/proc`, `/sys`, `/dev`, `/run`. Empty path returns a suggested-locations list (`$HOME`, `/srv`, `/mnt`, `/media`, `/opt`, `/var/lib`, `/data`).
- `POST /api/v1/setup/libraries` — requires the admin token issued in step 1; calls `libraries.Service.Create`.
- `POST /api/v1/setup/scan` — runs `libraries.ScanAll(TriggerAPI)` and refreshes the catalog.
- `POST /api/v1/setup/complete` — no-op gate that returns done state.

**`/setup` UI**

- Single self-contained HTML page served by `setup_page.go`. Vanilla JS + CSS, no build step, no framework. Stores the admin token in `localStorage` and uses it for every subsequent setup request.
- Three steps with an inline progress indicator: admin account → library folders (with a directory browser and a free-form path field) → first scan.

**Tests**

- Full wizard flow: fresh status → admin creation → token use → library creation → status advances.
- Repeat admin creation is rejected (409).
- Library creation without the admin token is rejected (401).
- Directory browser returns suggested-locations entries for the root path and rejects system paths.
- `/setup` redirects to `/` once an admin + library + scan exist.
- Bootstrap behavior split tests: empty input defers to wizard, explicit username generates a password.

**Intentional limits left for later foundation passes**

- The wizard does not yet offer Last.fm/metadata-provider configuration screens; those are still env-var-driven.
- Library browser surfaces only direct subdirectories — no media-content sniffing or scan-preview yet.
- The wizard issues a single short-lived bearer token via the standard login flow; there is no "remember this device" or session cookie story yet.
- No "danger zone" rescue mode for re-running the wizard after corruption; admins must fix data state via the catalog API.

### 2026-05-22 — Remote cover art download

**Packages:** `internal/covers`, `internal/metadata`, `cmd/samo-server`

**`internal/covers`**

- `Service.DownloadFromURL` fetches an image URL into the cover cache and persists an `extracted_covers` row keyed by URL hash. Repeated calls with the same URL hit the existing row and skip the network.
- SSRF guard rejects empty/`localhost`/`.local`/loopback/private/link-local hosts unless `RemoteOptions.AllowPrivateHosts` is set (tests only).
- Content-Type must start with `image/`; oversized responses (default 5 MiB) and empty bodies fail with `ErrTooLarge` / `ErrUnsupportedType`.
- Cover IDs are derived from a stable hash of the normalized URL so the same artwork at the same address is content-addressable.

**`internal/metadata`**

- `CoverDownloader` interface (matched implicitly by `covers.Service`) wires the downloader into `MetadataApplyService` via `NewMetadataApplyServiceWithOptions`.
- `resolveCoverInCandidate` runs before merge for non-preview apply calls. On success the candidate's `Cover.URL` is preserved and `Cover.ID`/`Cover.Path` get the local cover values so override patches store a local-first reference instead of a remote URL.
- Failures are logged and never block the apply; the apply falls back to writing the external URL form.

**Tests**

- Download round-trips a fake JPEG, stores it, and repeated downloads reuse the cache row (one upstream hit).
- Non-image content types are rejected.
- Loopback URLs are rejected when `AllowPrivateHosts` is false.
- Oversized bodies are rejected when they exceed `MaxBytes`.

**Intentional limits left for later foundation passes**

- No HEAD-then-GET probe; the downloader streams immediately and bails on size violation.
- No retry/backoff; transient failures during apply simply log and fall back to the URL form.
- No background prefetch — covers download only at user-initiated apply time.

### 2026-05-22 — Catalog-backed radio stations

**Packages:** `internal/radio`, `internal/api`, `cmd/samo-server`, `migrations/014_radio_stations.sql`

**Database**

- New `radio_stations` table holds station-level fields: name, description, content type, epoch, enabled flag, and a `source` column (`database` for API-created rows, `file` for JSON-imported rows).
- New `radio_station_items` table holds ordered loop entries: position, source kind, source ID, fallback path, display fields, kind, duration, weight.

**`internal/radio`**

- `ImportConfigIfEmpty` seeds the DB from a JSON `Config` on first ever startup (radio_stations table empty). Once any DB row exists the JSON file is ignored.
- `LoadStationsFromDB` / `LoadStationByID` hydrate stations with resolved items.
- `resolveItem` joins music tracks, shelf items, and podcast episodes against `media_files` so playable file paths come from the catalog. Items with broken or remote-only references are marked `missing` and dropped from the runtime loop without removing the DB row.
- `NewServiceFromDB` constructor and `Service.Reload` rebuild the in-memory schedule from DB records.
- `Service.CreateStation` / `UpdateStation` / `DeleteStation` / `AddStationItem` / `RemoveStationItem` write through the DB and trigger a reload.
- Station summary now exposes `enabled` and `source` so admin UIs can distinguish API vs file-managed rows.

**HTTP API**

- `GET/POST /api/v1/radio/admin/stations` — list/create stations (admin).
- `GET/PATCH/DELETE /api/v1/radio/admin/stations/{id}` — read, patch, delete (admin).
- `POST /api/v1/radio/admin/stations/{id}/items` — append an item (admin).
- `DELETE /api/v1/radio/admin/items/{itemId}` — remove an item (admin).
- Existing public `GET /api/v1/radio/stations` routes are unchanged.

**Item source kinds**

- `path`: explicit absolute path (the legacy JSON shape).
- `music-track`: catalog music track ID; resolver picks the first linked `media_file`.
- `audiobook`: catalog audiobook ID (audiobook or single-file).
- `podcast-episode`: catalog podcast episode ID; remote-only episodes are skipped until cached locally.

(Migration 016 renamed `shelf-item` → `audiobook` and `shelf-episode` → `podcast-episode`. The radio resolver dispatches on these post-016 values.)

**Tests**

- `ImportConfigIfEmpty` seeds JSON stations and refuses to re-import once rows exist.
- Station + item CRUD round-trips through the DB.
- Music track resolution joins through `media_files` and pulls track/artist/album fields when not overridden.
- `NewServiceFromDB` builds a runnable in-memory station from a DB-only seed.

**Intentional limits left for later foundation passes**

- No reordering API yet; positions are append-only.
- No playlist-source kind (auto-resolves to current playlist tracks).
- No smart-query source kind (genre/recently-added/etc.).
- The radio stream module still reads file bytes directly; remote episode bytes need cache integration before they can stream from a radio station.

### 2026-05-22 — Internet radio metadata probing

**Packages:** `internal/sources`, `internal/api`, `internal/config`, `cmd/samo-server`, `migrations/013_internet_radio_probe.sql`

**Database**

- Added probe columns on `internet_radio_stations`: `now_playing`, `now_playing_artist`, `now_playing_title`, `now_playing_updated_at`, `probe_enabled`, `probe_interval_seconds`, `next_probe_at`, `last_probe_started_at`, `last_probe_finished_at`, `last_probe_error`, `consecutive_probe_errors`, `probe_status`.
- Index on `(probe_enabled, next_probe_at)` for due-station queries.

**`internal/sources`**

- `ProbeIcyStream` issues an `Icy-MetaData: 1` request, captures ICY headers (`icy-name`, `icy-genre`, `icy-br`, `icy-description`, `icy-url`, `icy-metaint`, `Content-Type`), and reads one Shoutcast metadata frame when the server advertises one. Falls back to a raw HTTP/1.0 dial for legacy Shoutcast v1 servers that respond `ICY 200 OK`.
- `parseStreamTitle` decodes `StreamTitle='Artist - Title';` payloads (single or double quoted), splits on `" - "` for the artist/title heuristic, and tolerates trailing pairs like `StreamUrl`.
- `ProbeInternetRadioStation` runs a probe, applies the result without clobbering user-set values, schedules `next_probe_at` from the station's interval, and records failures with capped backoff (60s floor, 6h ceiling).
- `RunInternetRadioProbeCycle` walks due enabled stations on each tick.
- `UpdateInternetRadioStation` patches name, description, homepage/image URLs, country, language, tags, enabled flag, and probe settings; rejects intervals outside `[60s, 24h]`.
- `ProbePoller` runs alongside the existing podcast feed poller.

**Config**

- `SAMO_INTERNET_RADIO_PROBE` (default `true`) — start the probe poller.
- `SAMO_INTERNET_RADIO_PROBE_TICK` (default `1m`) — scheduler tick interval.

**HTTP API**

- `PATCH /api/v1/internet-radio/stations/{id}` — update station + probe settings (admin).
- `POST /api/v1/internet-radio/stations/{id}/probe` — probe a single station (admin).
- `POST /api/v1/internet-radio/stations/probe` — run one cycle of due stations (admin).
- `GET` station responses include `nowPlaying` and `probe` schedule blocks.

**Tests**

- ICY response with metadata frame yields station headers, codec mapping, and parsed StreamTitle.
- Probe persists now-playing, codec, and bitrate without overwriting user-set bitrate.
- Probe failures record `consecutive_probe_errors`, `last_probe_error`, and `probe_status`.
- Update interval validation and `next_probe_at` clearing when probing is disabled.
- StreamTitle parsing across quoting styles, with/without artist, and trailing extras.

**Intentional limits left for later foundation passes**

- Probing only consumes one metadata frame per call — long-running listeners that refresh on every track change are out of scope for now.
- Probe results overwrite stale ICY-derived fields but never user-set name; future work can introduce per-field override flags similar to the metadata override layer.
- No public read endpoint streams the probed audio bytes through Samo; the public `/internet-radio/{id}/stream` route still redirects to the upstream URL.

### 2026-05-22 — Library management, scan jobs, and scanner pruning

**Packages:** `internal/libraries`, `internal/scanner`, `internal/watch`, `internal/api`, `migrations/003_scan_jobs.sql`

**Database**

- Added `scan_jobs` table for scan history: status, scope, library ID, trigger source, timestamps, error text, and prune counters (`files_seen`, `files_pruned`, `items_pruned`).
- Existing `libraries` table remains the source of truth for filesystem roots. Env paths sync into it on startup; API-created libraries use the same deterministic IDs as the scanner (`scanner.LibraryID`).

**`internal/libraries`**

- `SyncConfigured` upserts env libraries without deleting API-managed rows.
- Full CRUD for filesystem libraries (`music` and `shelf` + `book`/`podcast`). Remote `samo://` libraries are read-only through this API.
- `ScanAll` / `ScanLibrary` run under a process-wide mutex, call `scanner.ScanWithStats`, persist a `scan_jobs` row, and return the final job record.
- `ScannerLibraries` lists DB-backed roots for the watcher (skips `samo://` paths).

**`internal/scanner`**

- Per-library scan accumulates seen file paths, shelf item IDs, and podcast episode IDs.
- After each library scan: prune missing `media_files`, shelf items, and local podcast episodes; then prune orphan music tracks/albums/artists.
- `ScanWithStats` returns aggregate counters for job recording. `Scan` delegates to it.

**`internal/watch`**

- Reloads libraries from SQLite before each debounced rescan (no longer tied to startup env snapshot only).

**HTTP API**

- `GET/POST/PATCH/DELETE /api/v1/libraries`
- `POST /api/v1/libraries/{id}/scan`, `POST /api/v1/scan`
- `GET /api/v1/scan/jobs`, `GET /api/v1/scan/jobs/{id}`
- Scan routes refresh the in-memory catalog after success.

**Intentional limits left for later foundation passes**

- Watcher-triggered scans did not yet write `scan_jobs` rows (addressed in the next foundation pass).
- Library path moves that change deterministic IDs need an explicit migration path (addressed in the next foundation pass).
- Playback writes and catalog media streaming were not yet split into dedicated packages (addressed in the next foundation pass below).

### 2026-05-22 — Playback persistence, media streaming, and library hardening

**Packages:** `internal/playback`, `internal/files`, `internal/libraries`, `internal/watch`, `internal/api`

**`internal/playback`**

- Owns all writes to `playback_json` (music artists/albums/tracks/playlists) and `progress_json` (audiobooks, podcasts, podcast episodes).
- Target kinds: `music-artist`, `music-album`, `music-track`, `music-playlist`, `audiobook`, `podcast`, `podcast-episode`. (Previously `shelf-item` / `shelf-episode`; migration 016 split these into the per-domain kinds above.)
- `GET` returns normalized state; `PUT` replaces; `PATCH` merges partial updates with optional play/skip increments and timestamp touches.
- Validates entity existence, rating range (0–5), and non-negative counters before writing.

**`internal/files`**

- Resolves `media_files` rows and serves bytes with `http.ServeContent` (Range requests supported).
- Validates every local path against configured filesystem library roots; rejects paths outside libraries and `samo://` virtual roots.
- Used by track/item/episode stream shortcuts and album/item cover routes.

**`internal/libraries` (hardening)**

- `PATCH` may relocate a library path: inserts the new deterministic ID, moves `library_id` on child rows, deletes the old row.
- `ScanFilesystem` records watcher scans in `scan_jobs` with `trigger_source = filesystem`.

**`internal/watch` (hardening)**

- Uses a `Scan` callback (typically `libraries.ScanFilesystem`) so filesystem rescans share the same mutex, prune logic, and job history as API scans.
- Reloads library roots from SQLite before each debounced rescan.

**HTTP API**

- `GET|PUT|PATCH /api/v1/playback/{kind}/{id}`
- `GET /api/v1/media/files/{id}`, `GET /api/v1/media/files/{id}/stream`
- `GET /api/v1/music/tracks/{id}/stream`, `GET /api/v1/music/albums/{id}/cover`
- `GET /api/v1/audiobooks/{id}/stream`, `GET /api/v1/audiobooks/{id}/cover`, `GET /api/v1/podcasts/shows/{id}/cover`, `GET /api/v1/podcasts/episodes/{id}/stream` (post-016; previously `/api/v1/shelf/items/...` and `/api/v1/shelf/episodes/...`)
- Playback and scan routes refresh the in-memory catalog after successful writes.

### 2026-05-22 — Embedded cover extraction and multi-file streaming

**Packages:** `internal/covers`, `internal/scanner`, `internal/files`, `internal/api`, `migrations/004_extracted_covers.sql`

**Database**

- Added `extracted_covers` table mapping stable cover IDs to on-disk cache paths, source audio paths, and source checksums for re-extract decisions.

**`internal/covers`**

- Extracts embedded artwork with `ffmpeg` when sidecar images are absent.
- Caches under `{SAMO_DATA_DIR}/covers/{cover_id}.jpg`.
- Skips re-extraction when the source audio checksum is unchanged and the cache file still exists.
- Detects attached pictures with `ffprobe` before invoking `ffmpeg`.

**`internal/scanner`**

- Computes per-file checksums from path, size, and mtime during probe.
- Resolves covers in priority order: sidecar image in folder, then embedded extraction.
- `Scanner` accepts `Options{Covers}` via `NewWithOptions`.

**`internal/files`**

- Allows serving from the cover cache directory in addition to library roots.

**HTTP API**

- `GET /api/v1/media/covers/{id}` (metadata) and `GET /api/v1/media/covers/{id}/image`
- Track/item/episode stream shortcuts are disc- and progress-aware; `?mediaFileId=` still forces a specific file

### 2026-05-22 — Podcast feed polling and refresh scheduling

**Packages:** `internal/sources`, `internal/config`, `internal/api`, `cmd/samo-server`, `migrations/005_podcast_poll.sql`

**Database**

- Added poll columns on `podcast_feeds`: `poll_enabled`, `poll_interval_seconds`, `next_poll_at`, `last_poll_started_at`, `last_poll_finished_at`, `consecutive_errors`.
- Index on `(poll_enabled, next_poll_at)` for due-feed queries.

**`internal/sources`**

- Each feed carries a `Poll` schedule (enabled flag, interval, next run, last start/finish, consecutive errors).
- `UpdatePodcastFeed` patches title and poll settings without re-fetching RSS.
- `ListDuePodcastFeeds` / `RunPodcastPollCycle` refresh feeds whose `next_poll_at` is due.
- Manual `RefreshPodcastFeed` and scheduled polls share the same path: mark start, fetch/save RSS, mark success with interval-based `next_poll_at`, or mark failure with capped exponential backoff (15m floor, 6h ceiling).
- `savePodcastFeed` upserts feed metadata on refresh without overwriting user poll settings.
- `Poller` runs on a ticker (`SAMO_PODCAST_POLL_TICK`, default 1m) and reloads the in-memory catalog after successful updates.

**HTTP API**

- `PATCH /api/v1/podcasts/feeds/{id}` — update title, `pollEnabled`, `pollIntervalSeconds` (900s–7d). (post-016; previously `/api/v1/shelf/podcast-feeds/{id}`)
- `POST /api/v1/podcasts/feeds/poll` — run one poll cycle immediately (admin-style trigger).

**Config**

- `SAMO_PODCAST_POLL` (default `true`) — start background poller.
- `SAMO_PODCAST_POLL_TICK` (default `1m`) — scheduler tick interval.

### 2026-05-22 — Metadata override layer (phase 2)

**Packages:** `internal/catalog`, `internal/scanner`, `internal/sources`, `internal/metadata`, `internal/api`

**Write-time guarding**

- `OverrideIndex` loads override patches once per scan or RSS save.
- Scanner upserts skip SQL columns and junction-table sync for overridden apply fields.
- RSS `savePodcastFeed` guards feed and episode metadata before opening write transactions (avoids SQLite lock contention).
- `PruneStaleMetadataOverrides` removes override rows for deleted catalog entities after scans.

**Admin API**

- `GET /api/v1/metadata/overrides/{targetKind}/{targetId}` — inspect stored override fields.
- `DELETE /api/v1/metadata/overrides/{targetKind}/{targetId}` — remove all overrides for a target.
- `PATCH /api/v1/metadata/overrides/{targetKind}/{targetId}` — clear specific override fields (`fields` list).

**Podcast feed reads**

- `GetPodcastFeed` / `ListPodcastFeeds` project `podcast-feed` overrides onto API responses.

**Tests**

- Scanner preserves overridden artist columns in SQLite while catalog projection shows user values.
- RSS refresh preserves overridden feed title in SQLite while API reads show user values.
- Override admin get/clear/delete lifecycle.

### 2026-05-22 — Bit-perfect direct playback hardening

**Packages:** `internal/files`, `internal/api`

**`internal/files`**

- Default stream path still serves original on-disk bytes via `http.ServeContent` (Range requests, no transcoding).
- Resume offsets (`ServeMediaFileAt` / `X-Samo-Stream-Offset-Seconds`) now copy from the computed byte offset with an explicit `Content-Length` for the tail, because `http.ServeContent` resets seek position to zero.
- Symlink escape and library-root validation tests cover path safety.

**HTTP API**

- Track, shelf item, and episode stream shortcuts unchanged; shelf resume now returns the correct tail bytes end-to-end.

**Tests**

- Full GET and ranged responses match source file bytes (`internal/files`, `internal/api`).
- Resume offset serves unmodified tail bytes after a computed byte seek.
- Shelf multi-file stream selects the progress-aware file and resumes within that file.

**Intentional limits left for later foundation passes**

- No transcoded alternate route yet.
- Subsonic stream compatibility relies on the same files service; dedicated Subsonic byte-equality tests are optional follow-up.

### 2026-05-22 — Music browse views and playlist CRUD

**Packages:** `internal/catalog`, `internal/playlists`, `internal/playback`, `internal/api`

**`internal/catalog`**

- `MusicBrowse` builds favorites, starred, recently-played, and recently-added views from the in-memory catalog with per-user playback overlay (favorite, starred, `lastPlayedAt`, `createdAt`).

**`internal/playlists`**

- `Create` / `Update` / `Delete` for `music_playlists` rows with owner checks, track ID validation, and duration aggregation.
- Playlist metadata apply uses `music-playlist` override kind; stale override rows prune when playlists are deleted.

**`internal/playback`**

- `ListForUser` loads all playback rows for a target kind (used by browse handlers).

**HTTP API**

- `GET /api/v1/music/browse/favorites|starred|recently-played|recently-added` — paginated browse payloads with user playback overlay.
- `POST /api/v1/music/playlists`, `PATCH /api/v1/music/playlists/{id}`, `DELETE /api/v1/music/playlists/{id}` — owner-scoped mutations; catalog reload after success.

**Tests**

- Browse filtering/sorting with playback overlay (`internal/catalog`).
- Playlist create/update/delete and owner enforcement (`internal/playlists`).

**Intentional limits left for later foundation passes**

- Public playlist read filtering (non-owner access rules) not expanded yet.
- List/detail music routes outside browse still return catalog-global playback JSON unless a dedicated overlay pass is added later.

### 2026-05-22 — Search and filter index (phase 1)

**Packages:** `internal/search`, `internal/api`, `internal/subsonic`

**`internal/search`**

- Owns catalog search indexes rebuilt from `catalog.Seed` on startup and catalog reload.
- Multi-token text matching (all terms must match) with relevance scoring.
- Structured filters: `genre`, `year`, `libraryId`, `favorite`, `starred`, `recentlyPlayed`, `recentlyAdded`, `completed`, `minRating`, `mediaType` (shelf).
- Sort modes: `relevance` (default), `title`, `added`, `played`.
- Per-user playback overlay for filter/sort fields that depend on user state.

**HTTP API**

- `GET /api/v1/music/search` and `GET /api/v1/shelf/search` accept the filter/sort query params above in addition to `q`.
- Subsonic `search2` / `search3` use the same music text index via `SearchMusicText`.

**Tests**

- Token matching, genre/favorite filters, sort-by-played, narrator/series shelf search (`internal/search`).

**Intentional limits left for later foundation passes**

- In-memory index only (no SQLite FTS5 or external search engine yet).
- Filter-only searches with empty `q` are supported but not exposed as browse shortcuts.

### 2026-05-22 — Remote podcast enclosure streaming (phase 1–2)

**Packages:** `internal/podcaststream`, `internal/podcastcache`, `internal/files`, `internal/sources`, `internal/api`, `migrations/011_podcast_episode_cache.sql`

**`internal/podcaststream`**

- Proxies RSS episode enclosure URLs when an episode has no local `media_files` rows.
- Forwards client `Range` requests; applies resume offsets from saved episode progress via upstream `Range: bytes=N-`.
- Rejects loopback/private hosts by default (SSRF guard).
- `FetchEnclosure` supports cache downloads with a per-file byte cap.

**`internal/podcastcache`**

- Downloads enclosures into `{SAMO_DATA_DIR}/podcast-cache/` and records rows in `podcast_episode_cache`.
- Stream path prefers cached on-disk bytes (`X-Samo-Stream-Source: cache`) before proxying (`enclosure`).
- Background download after a cache miss while streaming.
- Retention: max total bytes, max age since last access, stale enclosure URL cleanup, and orphan row cleanup after RSS saves.

**Config**

- `SAMO_PODCAST_CACHE` (default `true`)
- `SAMO_PODCAST_CACHE_MAX_BYTES` (default `10GiB`)
- `SAMO_PODCAST_CACHE_MAX_AGE` (default `720h`)
- `SAMO_PODCAST_CACHE_MAX_FILE_BYTES` (default `500MiB`)

**HTTP API**

- `GET /api/v1/podcasts/episodes/{id}/stream` uses local files when present, otherwise cache, otherwise enclosure proxy. (post-016; previously `/api/v1/shelf/episodes/{id}/stream`)

**Tests**

- Upstream proxy with resume offset and client Range forwarding (`internal/podcaststream`).
- Cache download, retention pruning, and cached stream bytes (`internal/podcastcache`, `internal/api`).

**Intentional limits left for later foundation passes**

- No explicit admin prefetch/evict API yet.
- Cached bytes are stored as downloaded from publishers, not re-validated with checksums beyond enclosure URL matching.

### 2026-05-22 — Metadata override layer (phase 1)

**Packages:** `internal/catalog`, `internal/metadata`, `migrations/010_metadata_overrides.sql`

**Database**

- Added `metadata_overrides` table storing user-applied field patches keyed by `(target_kind, target_id)`.

**`internal/metadata`**

- Metadata apply now writes override patches instead of mutating catalog SQLite rows directly.
- Preview/merge behavior is unchanged; apply persists field-level patches for all supported targets.

**`internal/catalog`**

- `LoadSeedFromDB` loads overrides and projects them onto hydrated music/shelf entities before returning the seed.
- Podcast feed apply overrides project onto the linked shelf podcast item via `podcast_feeds.podcast_id`.
- Rescans and RSS refreshes may still rewrite source catalog rows, but client-facing catalog projections keep user overrides.

**Tests**

- Apply stores overrides and survives simulated rescan/RSS clobber during catalog reload.

**Intentional limits left for later foundation passes**

- None for the metadata override foundation; phase 1 and phase 2 are complete for this layer.

### 2026-05-22 — Metadata candidate preview and apply

**Packages:** `internal/metadata`, `internal/api`, `cmd/samo-server`

**`internal/metadata`**

- `MetadataApplyService` writes user-selected fields from `SearchResult` candidates into `metadata_overrides` patches (projected at catalog load time).
- `POST /api/v1/metadata/apply/preview` returns `before`, merged `after`, `allowedFields`, `appliedFields`, and `skippedFields` without writing.
- `POST /api/v1/metadata/apply` requires a non-empty `fields` list (confirmation gate), merges `externalIds`, updates contributors/series relations for audiobooks, and reloads the in-memory catalog.
- Targets: `audiobook`, `podcast`, `podcast-episode`, `music-artist`, `music-album`, `music-track`, `podcast-feed`. (post-016; previously `shelf-item` / `shelf-episode`)
- Apply routes are admin-only because they mutate shared catalog metadata. Search/provider routes are authenticated user routes and do not write.
- Podcast feed apply writes both the `podcast_feeds` source row and the corresponding `shelf_items.podcast_json` projection in one transaction, so clients reading `/api/v1/shelf/podcasts` see applied metadata immediately after catalog reload.

### 2026-05-22 — Disc-aware default stream selection

**Packages:** `internal/catalog`, `internal/files`, `internal/api`

**`internal/catalog`**

- `SortAudioFiles` orders linked files by disc/track embedded tags, then path.
- `SelectStreamTarget` resolves the stream file from `mediaFileId`, `disc`, or saved playback progress across multi-file shelf items and episodes.
- Hydrated catalog audio file lists use the same sort order clients see in stream responses.

**`internal/files`**

- `ServeMediaFileAt` seeks to an approximate byte offset for resume positions and sets `X-Samo-Stream-Offset-Seconds`.

**HTTP API**

- Track/item/episode stream shortcuts set `X-Samo-Media-File-Id` and optional global/offset headers.
- Music track streams default `disc` to the track's own `discNumber` when multiple files exist.

### 2026-05-22 — Scanner metadata expansion

**Packages:** `internal/scanner`, `internal/watch`

**`internal/scanner`**

- Centralized tag alias resolution (`tags.go`) for ID3, MP4, Vorbis, and iTunes field names (artist, album artist, dates, disc/track numbers, barcodes, podcast fields, series, etc.).
- `mergeProbeTags` combines embedded tags across all files in an audiobook or podcast folder so multi-part releases keep the richest metadata.
- Improved explicit detection via iTunes advisory values (`1` explicit, `2` clean) in addition to boolean tags.
- Audiobook sidecars: `metadata.json` (Audiobookshelf-style), existing `desc.txt` / `reader.txt` / `.opf`, plus `.cue` chapter sheets when embedded chapters are absent.
- Music sidecars: Kodi-style `album.nfo` for album title, artists, year, genre, label, and UPC.
- Music artists now persist `sortName` from `artistsort` / `albumartistsort` tags when present.
- Shelf items store top-level `tags` from embedded tag fields; audiobook items populate `book.tags` consistently.
- Expanded published-date parsing (RFC3339, common locale formats, year-only fallback).

**`internal/watch`**

- Filesystem watcher retriggers scans for `metadata.json`, `.cue`, and `.nfo` sidecar changes.

### 2026-05-22 — Admin boundaries and local file containment

**Packages:** `internal/api`, `internal/files`

**`internal/api`**

- `requireUser` authenticates every `/api/v1/*` route into a `users.Principal`.
- `requireAdmin` centralizes role checks for shared-server management actions.
- Admin-only routes include user list/create, filesystem library management, scan orchestration/job history, podcast feed source mutations, internet-radio source mutations, and metadata apply/preview.
- Normal users continue to read catalog/search/playback surfaces through the Samo-native API.

**`internal/files`**

- Local media serving now checks both the requested path and its symlink-resolved target against configured library roots and allowed cache roots.
- Configured roots keep both their declared absolute path and their resolved path, so symlinked library roots still work while symlink escapes inside a library are rejected.
- Outside-library paths are rejected before file existence is revealed.

## Startup Flow

`cmd/samo-server/main.go` owns process assembly only. Keep it thin.

Startup currently does this:

1. Load env config with `config.LoadEnv`.
2. Open SQLite with `storage.Open`.
3. Apply embedded migrations with `storage.ApplyMigrations`.
4. Create `covers.Service` (cache dir under `{SAMO_DATA_DIR}/covers`).
5. Create `scanner.Scanner` with the covers service wired in, then `libraries.Service`.
6. Sync env-configured libraries into SQLite with `libraries.Service.SyncConfigured`.
7. If configured, scan libraries on startup with `libraries.Service.ScanAll`.
8. Hydrate catalog seed data from SQLite with `catalog.LoadSeedFromDB`.
9. Load optional radio JSON config with `radio.LoadConfigFile`.
10. Create `catalog.Service`, `playback.Service`, `files.Service`, `metadata.Service`, `radio.Service`, and `sources.Service`.
11. Build `api.Server`.
12. If configured, start the podcast feed poller (reloads catalog after successful poll cycles).
13. If configured, start the library watcher (reloads libraries from SQLite, records filesystem scan jobs).
14. Start `http.ListenAndServe`.

This means HTTP handlers do not talk directly to scanner code or raw startup config. They receive services.

## Configuration

Main environment variables:

- `SAMO_ADDR`: listen address, defaults to `:4500`
- `SAMO_DATA_DIR`: data directory, defaults to `data`
- `SAMO_DB_PATH`: SQLite database path, defaults to `data/samo.db`
- `SAMO_RADIO_CONFIG`: radio JSON config, defaults to `data/radio.json`
- `SAMO_API_TOKEN`: optional bearer token for `/api/v1/*`
- `SAMO_BOOTSTRAP_USERNAME`: optional first admin username, defaults to `admin`
- `SAMO_BOOTSTRAP_PASSWORD`: optional first admin password. If omitted on first run, startup generates and logs a random one-time password; if the named admin already exists, setting this env var updates that admin's password.
- `SAMO_SCAN_ON_START`: defaults to `true`
- `SAMO_WATCH_LIBRARIES`: defaults to `true`
- `SAMO_WATCH_DEBOUNCE`: filesystem change debounce duration, defaults to `3s`
- `SAMO_METADATA_PROVIDERS`: comma-separated external lookup providers, defaults to empty/off
- `SAMO_METADATA_USER_AGENT`: user-agent for external metadata requests, used by MusicBrainz
- `SAMO_MUSIC_DIRS`: path-list of music library folders
- `SAMO_AUDIOBOOK_DIRS`: path-list of audiobook library folders
- `SAMO_PODCAST_DIRS`: path-list of podcast library folders
- `SAMO_PODCAST_POLL`: enable background RSS polling, defaults to `true`
- `SAMO_PODCAST_POLL_TICK`: poll scheduler tick interval, defaults to `1m`

Embedded cover art is cached under `{SAMO_DATA_DIR}/covers`. Static `ffmpeg` and `ffprobe` ship in `bin/` beside the server binary on Ubuntu (see `internal/toolchain` and [docs/install-ubuntu.md](docs/install-ubuntu.md)).

Path-list values use the OS separator, so Linux/macOS use `:`.

## Package Responsibilities

### `cmd/samo-server`

Process composition only. It should not contain business logic, SQL details, scanner parsing, route behavior, or metadata mapping.

### `internal/config`

Loads and validates process-level settings from env vars. Feature-specific config belongs near the owning module when it grows beyond simple env fields.

### `internal/toolchain`

Resolves bundled `ffmpeg` and `ffprobe` for Ubuntu/Linux deployments.

Lookup order:

1. `SAMO_FFMPEG_PATH` / `SAMO_FFPROBE_PATH` overrides
2. `{executable_dir}/bin/ffmpeg` and `bin/ffprobe` (release tarball layout)
3. `{SAMO_DATA_DIR}/tools/linux-gpl-latest/{linux-amd64|linux-arm64}/` cached extract
4. repository `bin/` during local development
5. embedded assets when built with `-tags bundled`

Samo does not search the system `PATH` for ffmpeg. Ubuntu servers should use the bundled `bin/` layout from [docs/install-ubuntu.md](docs/install-ubuntu.md).

### `internal/storage`

Owns SQLite connection setup and migration application.

Responsibilities:

- create database parent directory
- open `sqlite3`
- apply pragmas
- run migrations idempotently

It should not know about music, audiobooks, radio, or HTTP.

### `migrations`

Embeds ordered `.sql` migrations. Migration names are the migration versions.

Current schema stores:

- libraries
- scan jobs (library scan history and prune counters)
- media files
- music artists, albums, tracks, playlists, genres
- music artist/album/track relationships
- shelf libraries/items/authors/series/chapters
- podcast episodes
- remote podcast feed source records
- internet radio station source records
- JSON columns for rich metadata that is still evolving

Use migrations for schema evolution. Do not silently mutate schema in Go code.

### `internal/catalog`

Defines Samo-native catalog domain/API DTOs and read behavior.

Important files:

- `types.go`: shared metadata structs like images, external IDs, audio files, chapters, playback state
- `music_types.go`: artists, albums, tracks, playlists, music search
- `shelf_types.go`: libraries, audiobook/podcast items, authors, series, podcast episodes
- `service.go`: in-memory read service used by API handlers
- `sqlite.go`: hydrates a `catalog.Seed` from SQLite

The catalog service is read-optimized and guarded by a mutex. It can be refreshed with `Replace(seed)` after scans. Handlers continue to read through the service rather than querying raw SQL.

### `internal/metadata`

Owns optional external metadata lookup providers. This package is for explicit user-initiated search only, like a future web UI asking "find metadata for this book/show/album." It must not run automatically during scanner walks, watcher events, source ingestion, or startup.

Current providers:

- `openlibrary`: audiobook/book metadata through Open Library search
- `googlebooks`: audiobook/book metadata through Google Books volume search
- `itunes`: podcast directory metadata through Apple's iTunes Search API
- `musicbrainz`: music artist, album/release-group, and track/recording metadata through MusicBrainz search

Providers are disabled by default. `cmd/samo-server` only registers providers named in `SAMO_METADATA_PROVIDERS`. An empty provider list means `/api/v1/metadata/search` returns no results and performs no outbound network calls.

Responsibilities:

- define common metadata search request/result DTOs
- normalize provider configuration
- route explicit searches to enabled providers
- map provider-specific JSON into Samo metadata candidates
- preserve provider IDs and URLs in `catalog.ExternalIDs`/links

It writes user-confirmed fields to `metadata_overrides` via `MetadataApplyService`; catalog projection merges overrides at load time. It must not call external providers automatically during scans or ingestion.

### `internal/libraries`

Owns filesystem library records, scan orchestration, and scan job history.

Responsibilities:

- sync env-configured library paths into SQLite on startup
- list/create/update/delete filesystem libraries over the API
- trigger full or per-library scans
- record scan job status, timing, and prune counts
- expose the current scanner library list for the filesystem watcher

It should not parse tags, call `ffprobe`, or handle HTTP directly.

### `internal/covers`

Owns embedded artwork extraction and the on-disk cover cache.

Responsibilities:

- detect attached pictures in audio files
- extract artwork into `{dataDir}/covers`
- persist `extracted_covers` rows with source checksums
- serve stable cover IDs to catalog image metadata

It should not scan full libraries or handle HTTP directly.

### `internal/playback`

Owns listening-state writes for catalog entities stored as JSON in SQLite.

Responsibilities:

- read and write `playback_json` / `progress_json` columns
- validate target kind and ID existence
- normalize and validate playback payloads (rating, counts, progress)
- support explicit PUT replacement and PATCH merges

It should not hydrate the catalog read model directly; callers refresh `catalog.Service` after writes.

### `internal/files`

Owns safe access to on-disk media referenced by the catalog.

Responsibilities:

- load `media_files` metadata by ID
- verify local paths stay inside configured filesystem library roots
- stream audio/image bytes with range support and content types from DB metadata

It should not scan libraries, parse tags, or own playback state.

### `internal/scanner`

Walks configured libraries, calls `ffprobe`, maps discovered metadata into SQLite.

Current scanner behavior:

- accepts common audio extensions
- skips hidden directories
- uses deterministic SHA-256 based IDs
- uses `ffprobe` for container, stream, tag, chapter, and duration metadata
- creates music artists/albums/tracks from tags
- groups audiobooks by folder
- groups podcasts by first folder under the podcast library
- writes technical audio file metadata
- tracks detected embedded metadata formats such as ID3, MP4, and Vorbis comments
- writes embedded tags as JSON
- writes audiobook chapters from embedded chapter data or file-part fallback chapters
- prunes stale media files, shelf items, and local podcast episodes after each library scan
- removes orphaned music tracks, albums, and artists after pruning
- reads OverDrive MediaMarkers into audiobook chapters when available
- reads audiobook sidecars: `desc.txt`, `reader.txt`, and `.opf`
- discovers local cover images such as `cover.jpg`, `folder.png`, `front.webp`, or `album.jpg`
- extracts embedded cover art into the cover cache when sidecars are missing
- resolves tag aliases across ID3/MP4/Vorbis/iTunes field names
- merges embedded tags across multi-file audiobook and podcast folders
- reads audiobook `metadata.json`, `.opf`, text sidecars, and `.cue` chapter sheets
- reads music `album.nfo` sidecars for album-level metadata and UPC

The scanner writes to SQLite. It should not return API response DTOs directly to HTTP.

### `internal/watch`

Owns filesystem watching and scan orchestration.

Responsibilities:

- recursively watch configured library roots
- add watches for newly-created directories
- filter events to audio, sidecar metadata, and cover image paths
- debounce bursts of writes
- reload library roots from SQLite before each rescan
- call the shared library scan callback (records `scan_jobs`, prunes stale rows)
- run scanner after changes settle
- reload catalog seed data from SQLite
- call `catalog.Service.Replace` so API handlers see new data

It should not parse metadata, write SQL directly, or handle HTTP.

### `internal/sources`

Owns user-added remote sources. This package is the first "coagulator" layer: it pulls remote inputs into Samo-owned catalog data without making handlers or scanners know remote feed details.

Current responsibilities:

- validate and fetch podcast RSS feed URLs
- parse RSS and iTunes podcast metadata
- upsert remote podcast feeds as shelf podcast items and podcast episodes
- store podcast feed source state, fetch timestamps, errors, and poll schedule
- poll due RSS feeds on a background ticker with backoff on failure
- store user-added internet radio station URLs
- expose source read/write methods for API handlers

Podcast feeds are unique because a podcast can come from local files through `internal/scanner` or from RSS through `internal/sources`. Both paths write into the same `podcasts` / `podcast_episodes` tables so clients can use one podcast API shape.

Internet radio stations are simpler source records: Samo stores the stream URL and descriptive metadata, then exposes public playlist/redirect links. They do not create catalog items and they do not participate in the 24/7 scheduler yet.

`internal/sources` may write SQL because it owns these source ingestion workflows. It should not handle HTTP and should not become a general catalog query service.

### `internal/api`

Owns HTTP routing and response writing.

Current namespaces:

- `/api/v1/libraries/*`
- `/api/v1/scan/*`
- `/api/v1/playback/*`
- `/api/v1/media/*`
- `/api/v1/catalog/*`
- `/api/v1/metadata/*`
- `/api/v1/music/*`
- `/api/v1/audiobooks/*`, `/api/v1/contributors/*`, `/api/v1/series/*`, `/api/v1/bookmarks/*`, `/api/v1/collections/*`, `/api/v1/listening-sessions`
- `/api/v1/podcasts/*` (split into `/shows/{id}/*` and `/episodes/{id}/*`)
- `/api/v1/radio/*`
- `/api/v1/internet-radio/*`
- public `/radio/{id}/playlist.m3u`
- public `/radio/{id}/stream`
- public `/internet-radio/{id}/playlist.m3u`
- public `/internet-radio/{id}/stream`

API handlers should stay thin:

- parse path/query/body
- call services
- map errors to HTTP responses
- write JSON or stream output

Do not put SQL, scanning, tag parsing, or long-running workflow logic in handlers.

### `internal/radio`

Owns the first radio module:

- loads optional JSON station config
- normalizes stations and media items
- calculates deterministic current/upcoming slots
- exposes stream behavior from scheduled local files

The current stream is first-generation: it seeks approximately by duration and throttles file bytes to approximate real-time playback. It assumes compatible source files per station.

### `internal/media`

Shared media taxonomy used across radio/catalog/scanner. Keep broad media kind definitions here when they are shared by multiple modules.

## API Direction

Samo's primary API is native and metadata-rich. Compatibility layers can come later.

The native API is documented in `docs/api.md`.

Current music surface:

- artists
- albums
- tracks
- genres
- playlists
- search

Current audiobook surface:

- audiobooks
- contributors (authors, narrators)
- series
- bookmarks
- collections
- listening sessions
- search

Current podcast surface:

- shows
- episodes
- RSS feeds (subscribe, poll, refresh, delete)
- search

Current radio surface:

- stations
- station detail
- now playing
- schedule
- playlist
- stream

Current source-ingestion surface:

- podcast feed list/create/detail/refresh/delete
- internet radio station list/create/detail/delete
- public M3U and stream redirect routes for internet radio stations

Current library management surface:

- filesystem library list/create/update/delete
- manual full-library and per-library scan triggers
- scan job list/detail with prune counts

Current playback surface:

- get, replace, and patch playback/progress state for music and shelf entities
- optional play/skip increments and last-played timestamps on patch

Current media surface:

- media file metadata by ID
- byte streaming for media files, tracks, shelf items, and podcast episodes
- cover image streaming for music albums and shelf items with local cover paths

Current metadata lookup surface:

- enabled metadata provider list
- explicit metadata search for audiobooks, podcasts, and music
- metadata apply preview/apply with field-level confirmation

The API should preserve rich metadata rather than flattening to the lowest common denominator. Navidrome/OpenSubsonic and Audiobookshelf compatibility should map into or out of Samo-native models.

## Metadata Philosophy

Samo clients are expected to use rich metadata. Capture and preserve more than the first UI needs.

Important metadata categories:

- canonical IDs and provider IDs
- sort titles and sort names
- display artist strings alongside structured artist arrays
- music technical metadata
- music release version, compilation flag, label, catalog number, barcode, MusicBrainz/Discogs/Spotify/Apple/ISRC IDs
- audiobook narrators, authors, series, ISBN/ASIN/provider IDs
- audiobook sidecars and OverDrive MediaMarkers
- podcast feed, owner, episode, enclosure, and GUID data
- embedded tags
- chapters
- cover/image metadata
- playback/progress/rating/favorite state

When unsure whether a field matters, prefer storing it in a structured place or in embedded tags rather than discarding it.

## Architecture Rules

Avoid god components. Keep ownership boundaries clear.

Rules:

- `cmd` wires dependencies; it does not implement behavior.
- `api` handles HTTP only.
- `catalog` defines read models and catalog query behavior.
- `playback` owns listening-state writes.
- `files` owns validated local media byte serving.
- `metadata` searches external metadata providers and applies user-confirmed candidate fields when explicitly called.
- `libraries` owns library records and scan orchestration.
- `covers` owns embedded artwork extraction and cache rows.
- `scanner` discovers and writes metadata.
- `watch` observes filesystem changes and coordinates scanner/catalog refresh.
- `sources` ingests remote RSS and stream URL records.
- `storage` owns DB setup/migration mechanics.
- `radio` owns radio scheduling/streaming behavior.
- shared types only move to shared packages after multiple modules need them.
- avoid cross-package cycles.
- prefer interfaces only when they remove real coupling or unlock tests.
- keep SQL out of HTTP handlers.
- keep ffprobe/tag parsing out of HTTP handlers and catalog read service.
- add migrations for schema changes.
- add focused tests around package boundaries.

## Current Known Limits

These are expected first-pass limits, not accidental bugs:

- scanner does not fetch remote metadata; remote RSS ingestion lives in `internal/sources`
- external metadata lookup still does not download remote cover art into the local cache automatically
- scanner does not download remote cover art (only sidecars + embedded extraction)
- scanner does not transcode audio
- relocating a library path assigns a new deterministic library ID; clients must follow the ID returned by `PATCH`
- stream shortcuts accept `?mediaFileId=` to force a specific linked file; otherwise selection is disc- and progress-aware
- radio config is still JSON-backed rather than catalog-backed
- internet radio stations are stored and shared, but not probed for live metadata yet
- podcast feed deletion removes the remote podcast shelf item; it does not reconcile with a local-file podcast of the same show yet
- native API uses per-user bearer tokens; legacy `SAMO_API_TOKEN` maps to bootstrap user `user-server`
- Subsonic adapter maps Samo music IDs directly; per-library album filtering in `getAlbumList2` is not wired yet

### 2026-05-22 — Subsonic / OpenSubsonic compatibility expansion

**Packages:** `internal/subsonic`, `internal/api`, `internal/playback`

**`internal/subsonic`**

- Per-user starred albums, artists, and tracks via `getStarred` / `getStarred2`.
- `star`, `unstar`, and `setRating` write through `internal/playback` for the authenticated Subsonic user.
- `getAlbumList2` supports `starred` and `frequent` (recently played) list types using the same browse overlay as the Samo-native API.
- `getRandomSongs` returns a shuffled track sample.
- Starred items and ratings appear on song/album child payloads when present.

**HTTP**

- `GET /rest/getStarred`, `GET /rest/getStarred2`
- `GET /rest/star?id=`, `GET /rest/unstar?id=`, `GET /rest/setRating?id=&rating=`
- `GET /rest/getRandomSongs`
- `GET /rest/getAlbumList2?type=starred|frequent|...`

**Tests**

- Starred listing, star/unstar persistence, and starred album list type (`internal/subsonic`).

**Intentional limits**

- JSON only (`f=json`); XML not implemented.
- `musicFolderId` filtering not applied because albums are not library-scoped in the catalog read model yet.
- Audiobookshelf compatibility remains a future adapter layer.

### 2026-05-22 — Subsonic / OpenSubsonic compatibility (initial)

**Packages:** `internal/subsonic`, `internal/catalog`, `internal/api`

**`internal/subsonic`**

- JSON Subsonic API under `/rest/{action}` and `/rest/{action}.view`.
- Maps Samo music libraries, artists, albums, tracks, playlists, search, stream, and cover art onto existing catalog and files services.
- Auth reuses `SAMO_API_TOKEN` via Subsonic password (`p=`), token auth (`t`/`s`), or Bearer header. Open when no token is configured.

**`internal/catalog`**

- Added relation helpers: albums for artist, tracks for album/playlist, cover art ID resolution.

**HTTP**

- Registered `/rest/*` routes alongside existing Samo-native API (not behind `requireAPIAuth`; Subsonic auth is separate).

**Intentional v1 limits**

- JSON only (`f=json`); XML not implemented yet.
- No user accounts, starred/frequent album lists, or Subsonic XML yet.
- `musicFolderId` filtering not applied because albums are not library-scoped in the catalog read model yet.

### 2026-05-22 — Last.fm native scrobbling

**Packages:** `internal/lastfm`, `internal/api`, `internal/config`, `migrations/006_lastfm.sql`

**`internal/lastfm`**

- Last.fm web auth flow with session stored in SQLite.
- Automatic scrobbling from playback `PATCH`/`PUT`, music/subsonic stream starts, and explicit scrobble events.
- Subsonic `scrobble` and `updateNowPlaying` compatibility routes.
- Love/unlove sync when tracks are favorited or starred.
- Failed submissions queued with audit history; background poller retries; invalid sessions auto-cleared.

**HTTP**

- `GET /api/v1/lastfm/status`, queue, history
- `POST /api/v1/lastfm/auth/begin`, `POST /api/v1/lastfm/auth/complete`
- `DELETE /api/v1/lastfm/auth/session`
- `POST /api/v1/lastfm/queue/flush`
- `POST /api/v1/scrobble/events`
- Subsonic `GET /rest/scrobble`, `GET /rest/updateNowPlaying`

**Config**

- `SAMO_LASTFM_API_KEY`, `SAMO_LASTFM_SHARED_SECRET`
- `SAMO_LASTFM_POLL`, `SAMO_LASTFM_POLL_TICK`

**Intentional limits**

- one linked Last.fm account per Samo user
- scrobbling is music-track only (not shelf/radio)
- listen timing uses client-reported progress or stream resume position

### 2026-05-22 — Multi-user accounts and per-user Last.fm

**Packages:** `internal/users`, `internal/api`, `internal/playback`, `internal/lastfm`, `internal/subsonic`, `migrations/008_users.sql`, `migrations/009_lastfm_per_user.sql`

**`internal/users`**

- SQLite users with bcrypt passwords and revocable API tokens.
- Bootstrap row `user-server` for legacy `SAMO_API_TOKEN` and migrated Last.fm session data.
- Optional first admin via `SAMO_BOOTSTRAP_USERNAME` / `SAMO_BOOTSTRAP_PASSWORD`.
- Subsonic auth resolves `u` + password or token auth to a Samo user.

**Data model**

- `user_playback` stores per-user progress/ratings/favorites for catalog targets.
- `lastfm_user_settings` stores one Last.fm session per Samo user; queue and submission audit rows include `user_id`.

**HTTP**

- `POST /api/v1/auth/login`, `/api/v1/users/*` token and profile routes.
- Last.fm and playback routes use the authenticated user's ID.
- Subsonic stream/scrobble routes scrobble for the authenticated Subsonic user.

### 2026-05-22 — Audiobook bookmarks, collections, listening sessions, author/series items

**Packages:** `internal/shelfuser`, `internal/catalog`, `internal/api`, `migrations/012_shelf_user.sql`

**Database**

- `shelf_bookmarks` — per-user position bookmarks on audiobook `shelf_items` only.
- `shelf_collections` and `shelf_collection_items` — ordered user lists of audiobook items.
- `shelf_listening_sessions` — append-only progress segments recorded from playback updates.

**`internal/shelfuser`**

- Bookmark CRUD scoped to the authenticated user and audiobook items.
- Collection CRUD with owner checks; rejects podcast shelf items.
- `RecordSession` / list-by-item / recent sessions for the user.

**`internal/catalog`**

- `ShelfAuthorDetail` and `ShelfSeriesDetail` embed paginated matching items.
- `ShelfItemsForAuthor` matches book author contributor IDs; `ShelfItemsForSeries` uses series `itemIds`.

**HTTP API**

- `GET/POST /api/v1/shelf/items/{id}/bookmarks`, `PATCH/DELETE /api/v1/shelf/bookmarks/{id}`
- `GET/POST /api/v1/shelf/collections`, `GET/PATCH/DELETE /api/v1/shelf/collections/{id}`
- `GET /api/v1/shelf/items/{id}/sessions`, `GET /api/v1/shelf/listening-sessions`
- `GET /api/v1/shelf/authors/{id}/items`, `GET /api/v1/shelf/series/{id}/items`
- `GET /api/v1/shelf/series` — paginated series list (was missing from handlers).
- Author/series `GET` with `?include=items` returns detail + paginated items in one payload.
- Playback `PUT`/`PATCH` on `shelf-item` records a listening session when progress changes.

**Tests**

- Bookmark/collection/session lifecycle and podcast rejection in collections (`internal/shelfuser`).
- Author/series item pagination (`internal/catalog`).

**Intentional limits left for later foundation passes**

- No Audiobookshelf compatibility routes for bookmarks/collections yet.
- Listening sessions are recorded from API playback writes only (not Subsonic shelf playback).
- Collections are user-private; no shared or admin-managed shelf lists.

## Near-Term Build Path

Useful next steps:

1. Admin/settings/ops APIs (server status, config visibility, safer self-hosted operations).
2. Radio programming UI/API foundations after server concepts are stable.
3. Audiobookshelf compatibility adapter when a dedicated ABS client is in scope.
4. Subsonic XML and per-library album indexes if a legacy client requires them.
5. ListenBrainz support or shared-household scrobble policies.

## Testing Expectations

Current tests cover:

- API route/token behavior
- rich seeded API response metadata
- catalog filtering/search
- SQLite migration idempotency
- SQLite hydration into catalog seed
- ffprobe result normalization
- audiobook grouping
- external metadata provider mapping
- radio deterministic schedule behavior
- library CRUD and scan job recording
- scanner prune behavior for stale files and orphan music rows
- playback PUT/PATCH validation and persistence
- local path sandboxing and media file range streaming
- library path relocation and filesystem scan job recording
- embedded cover extraction, cache rows, and cover ID serving
- audio file checksum computation and `mediaFileId` stream selection
- podcast feed poll scheduling, due-feed selection, and refresh without clobbering poll settings
- tag alias resolution, multi-file tag merge, cue/metadata.json/nfo sidecars, and iTunes explicit mapping
- disc-aware stream file selection and resume offsets for multi-file shelf items
- metadata apply preview/apply with field-level confirmation, external ID merge, and override persistence
- Subsonic starred/rating/random-song routes and per-user playback overlay

Keep tests focused on contracts and package boundaries. Scanner tests should prefer parser/grouping tests and small generated media fixtures when practical.
