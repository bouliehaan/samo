# Samo Server Directives

This document is mandatory guidance for AI agents and humans working on Samo Server. Read it before making architectural changes. If it conflicts with a casual implementation impulse, this document wins unless the project owner explicitly says otherwise.

Samo Server is intended to become a real replacement for Navidrome and Audiobookshelf, with Samo-native features on top. It is not a wrapper around either project. It must stay small enough to reason about, but serious enough to be trusted with a home media library.

## Prime Directive

Build durable server foundations, not demos.

Do not optimize for making a route appear to work if the implementation weakens the long-term server. Samo clients will rely on this server for bit-perfect music playback, audiobook progress, podcast ingestion, metadata, search, history, and eventually radio programming. Treat server contracts as product contracts.

## Domain Model (mandatory vocabulary)

Samo has four product domains. They are independent and stay independent.

- **Music** — artists, albums, tracks, playlists. Tables: `music_artists`, `music_albums`, `music_tracks`, `music_playlists`. URL prefix: `/api/v1/music`. Apply target kinds: `music-artist`, `music-album`, `music-track`.
- **Audiobooks** — audiobooks, contributors (authors/narrators), series, chapters, bookmarks, collections, listening sessions. Tables: `audiobooks`, `contributors`, `series`, `audiobook_*` join tables, `bookmarks`, `collections`, `listening_sessions`. URL prefix: `/api/v1/audiobooks`, `/api/v1/contributors`, `/api/v1/series`, `/api/v1/bookmarks`, `/api/v1/collections`. Apply target kind: `audiobook`.
- **Podcasts** — shows and episodes. Tables: `podcasts`, `podcast_episodes`, `podcast_feeds`. URL prefix: `/api/v1/podcasts`. Apply target kinds: `podcast`, `podcast-episode`, `podcast-feed`.
- **Radio** — programmed stations + internet radio sources. Tables: `radio_stations`, `radio_station_items`, `internet_radio_stations`. URL prefix: `/api/v1/radio`, `/api/v1/internet-radio`.

Do not reintroduce a generic "shelf" umbrella for audiobooks + podcasts. The split is intentional — audiobook metadata (authors, narrators, series, chapters, bookmarks) is structurally different from podcast metadata (feed URL, episodes, enclosures, polling state). Sharing one model leaks one domain's concerns into the other and broke FK invariants the previous time we tried it.

Libraries are typed by `kind`: `music`, `audiobook`, `podcast`, or `mixed`. The legacy `shelf` kind and `media_type` discriminator are gone. The library service translates older `kind=shelf` + `media_type=book`/`podcast` payloads into the explicit kinds for backwards compatibility with old clients, but new code should not emit them.

## Non-Negotiables

- Do not create god packages, god services, or god handlers.
- Do not put business logic in `cmd/samo-server/main.go`.
- Do not query raw SQL directly from HTTP handlers when an owning service/package should exist.
- Do not make scanners call external metadata providers automatically.
- Do not silently overwrite user-edited metadata with scanner or RSS data.
- Do not make transcoding the default playback path.
- Do not break bit-perfect original-file playback.
- Do not flatten rich metadata into a lowest-common-denominator Subsonic or Audiobookshelf shape.
- Do not add GUI work unless explicitly asked. The server/API foundation comes first.
- Do not add broad dependencies for narrow problems.
- Do not bypass auth/role checks for mutating shared-server state.
- Do not store secrets in logs except the one-time generated bootstrap admin password at initial creation.
- Do not introduce schema changes without migrations.
- Do not hand-wave tests for scanner, streaming, auth, metadata apply, or data pruning behavior.

## Product Target

Samo Server must eventually replace:

- Navidrome-style music library browsing, metadata, playlists, favorites, streaming, and Subsonic/OpenSubsonic compatibility.
- Audiobookshelf-style audiobook and podcast libraries, authors, series, chapters, bookmarks, progress, RSS subscriptions, metadata matching, and rich item detail.
- A Samo-native 24/7 radio system that can program from local media, RSS podcasts, internet radio, old radio archives, commercials, and custom audio.

The native Samo API is the primary product surface. Compatibility APIs are adapters, not the core model.

## Current Foundation

The server already has:

- SQLite migrations and storage setup.
- Rich catalog domain models.
- Music, audiobook, and podcast scanners.
- Library CRUD and scan job tracking.
- Filesystem watcher rescans.
- Local media file serving with Range support.
- Embedded cover extraction and cover cache serving.
- User auth, tokens, admin boundaries, and safe bootstrap password behavior.
- Per-user playback state.
- Last.fm linking, scrobbling, queue, and history.
- RSS podcast feed ingestion and background polling.
- Internet radio source records.
- Optional metadata search providers and explicit metadata apply.
- Subsonic/OpenSubsonic compatibility for Navidrome-style music clients.
- Initial 24/7 radio module.

See `ARCHITECTURE.md` for the detailed work log and package responsibilities.

## Package Boundaries

Use existing package ownership. Add new packages only when there is a real ownership boundary.

- `cmd/samo-server`: process composition only.
- `internal/config`: env/process configuration only.
- `internal/storage`: SQLite open/migrate only.
- `migrations`: schema evolution only.
- `internal/catalog`: domain DTOs and read model hydration/service.
- `internal/scanner`: filesystem walking, media probing, sidecar parsing, scanner writes.
- `internal/libraries`: library CRUD and scan orchestration.
- `internal/watch`: filesystem event watching and debounce.
- `internal/files`: local path validation and byte serving.
- `internal/covers`: embedded/sidecar cover cache.
- `internal/playback`: per-user playback state.
- `internal/users`: users, tokens, auth primitives.
- `internal/sources`: RSS podcast feeds and internet radio source records.
- `internal/metadata`: optional user-initiated metadata provider search and apply.
- `internal/lastfm`: Last.fm integration.
- `internal/subsonic`: compatibility adapter only.
- `internal/radio`: Samo programmed radio.
- `internal/api`: HTTP request/response translation only.

If a handler grows logic that is not request parsing, response writing, or auth, move that logic into the owning service.

## Metadata Directive

Metadata must be treated as layered data.

Required direction:

- Scanned metadata is evidence from files.
- RSS metadata is evidence from feeds.
- External provider metadata is candidate data.
- User-applied metadata is intentional override data.
- Catalog projections are resolved output for clients.

Do not build features that make user edits fragile. The next major metadata foundation should separate source facts from user overrides so rescans and feed refreshes cannot erase manual corrections.

Metadata providers must remain opt-in and user-initiated unless the owner explicitly changes that policy. Never make MusicBrainz, Google Books, Open Library, Apple Podcasts, or any future provider run during startup, scan, watch, or RSS polling by default.

## Bit-Perfect Playback Directive

Bit-perfect direct playback is a core Samo requirement.

The default music playback path must serve original file bytes directly. No transcoding, normalization, replaygain alteration, format conversion, sample-rate conversion, or loudness processing may happen unless the client explicitly requests a future transcoded route.

Direct playback must preserve:

- Original container bytes.
- Range request support.
- Correct `Content-Length`, content type, and cache headers where possible.
- Stable `mediaFileId` selection.
- Disc/track-aware selection for multi-file albums.
- Resume behavior without changing file bytes.
- Path safety, including symlink escape rejection.

Future tests should prove direct stream responses match source bytes for normal and ranged requests.

Transcoding may be added later, but only as an explicit alternate path with clear API parameters and headers. It must not replace direct playback.

## Auth And Roles

Every `/api/v1/*` route requires a user principal unless explicitly documented as public.

Admin-only operations include:

- User list/create and future user administration.
- Filesystem library CRUD.
- Scan orchestration and scan job inspection.
- Metadata apply and apply preview.
- Podcast feed source mutations.
- Internet radio source mutations.
- Future server settings.

Normal users may read catalog data, stream playable media, manage their own tokens, manage their own playback state, link their own Last.fm account, and use safe search endpoints.

Public routes are limited and intentional: health, login, and direct radio/internet-radio playlist/stream URLs.

## Schema And Storage

All schema changes require migrations.

Rules:

- Do not mutate schema from Go startup code.
- Do not repurpose existing columns for incompatible meanings.
- Prefer additive migrations for evolving metadata.
- Preserve user data on scans and refreshes.
- When adding write paths, define owner package, transaction boundaries, and tests.
- JSON columns are acceptable for evolving metadata, but stable relationships should become relational when they drive queries, permissions, sorting, filtering, or cross-entity navigation.

SQLite is the source of truth. The in-memory catalog is a projection/cache and must be reloadable from SQLite.

## Scanner Rules

Scanner behavior must be deterministic and safe.

- Scanner may read local filesystem files and sidecars.
- Scanner may use `ffprobe`/`ffmpeg` for media facts and cover extraction.
- Scanner must not call external metadata providers.
- Scanner must not destroy user overrides.
- Scanner should collect rich tags rather than discard them.
- Scanner pruning must be tested before broadening.
- Watcher-triggered scans must share scan orchestration, mutexes, pruning, and scan job history.

Sidecar support is good. Keep adding it in small focused parsers rather than stuffing every format into one function.

## API Design

The Samo-native API should be rich, boring, and stable.

Routes should expose Samo concepts, not leak backend shortcuts. Compatibility adapters can map into these concepts later.

For new APIs:

- Use clear nouns and stable IDs.
- Return rich metadata clients can render without extra guessing.
- Keep list pagination consistent.
- Keep write payloads explicit.
- Require confirmation-like field lists for bulk metadata apply.
- Return structured errors.
- Reload or update catalog projections after successful shared catalog writes.

Do not add large one-off endpoints that duplicate existing package responsibilities.

## Compatibility APIs

Subsonic/OpenSubsonic support is important for Navidrome replacement, but it is an adapter.

Do not let Subsonic constraints dictate the internal catalog model. Map Samo metadata down to Subsonic responses, not the other way around.

Audiobookshelf compatibility should also be an adapter or carefully mapped API layer. Do not collapse Samo's per-domain models (audiobooks, podcasts, contributors, series) into one Audiobookshelf response shape.

## Search And Browse

Current search is simple in-memory matching. That is fine for early foundation work, but a true replacement needs better query behavior.

Future search should support:

- Large libraries.
- Music artist/album/track fields.
- Audiobook title/author/narrator/series fields.
- Podcast title/feed/episode fields.
- Genre, year, date, rating, favorite, recently added, recently played, and completion filters.
- Stable sorting and pagination.

Do not bolt advanced search into handlers. Give it an owning package or a catalog/search service boundary.

## Needed Major Work

Foundation items **1–7** are complete. Remaining major modules:

8. Admin/settings/ops APIs.
9. Radio programming UI/API foundations after server concepts are stable.

**Deferred compatibility (not blocking Samo-native server):**

- Subsonic XML responses (`f=xml`) — JSON remains the supported format.
- `musicFolderId` album filtering — requires library-scoped album indexing in the catalog read model.
- Audiobookshelf HTTP adapter — map Samo's `/api/v1/audiobooks` and `/api/v1/podcasts` routes when a dedicated ABS client is needed; do not collapse them back into one "shelf" shape.

Historical foundation order (completed):

1. Metadata source/override/projection layer.
2. Bit-perfect direct playback hardening.
3. Music playlists, favorites, starred views, recents, and richer browse APIs.
4. Remote podcast episode streaming, download/cache, and retention policies.
5. Search/filter/index upgrade.
6. Audiobook bookmarks, collections, listening sessions, and richer series/author management.
7. Subsonic/OpenSubsonic compatibility expansion.

Do not skip item 1 if adding more metadata write paths. Do not skip item 2 if touching streaming.

## Definition Of Done

For meaningful server work, done means:

- Package ownership is clear.
- Schema changes have migrations.
- Auth and role behavior is correct.
- User data and user edits are preserved.
- Direct playback behavior is not weakened.
- Tests cover the risky behavior.
- `go test ./...` passes.
- `go vet ./...` passes.
- `git diff --check` is clean.
- `ARCHITECTURE.md` or relevant docs are updated when behavior or architecture changes.

## Review Checklist

Before finishing a change, ask:

- Did this put business logic in the wrong package?
- Did this create a god component?
- Can a normal user mutate shared server state through this route?
- Can a rescan or RSS refresh wipe user edits?
- Did this break original-file playback?
- Did this leak files outside configured library roots?
- Does the in-memory catalog reload from SQLite into the expected client shape?
- Are compatibility APIs mapping from Samo models rather than shaping them?
- Would this still work with a large library?
- Would this be obvious to the next AI agent reading the code?

If any answer is bad, fix the foundation before adding more surface area.
