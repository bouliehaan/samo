# Samo Native API

Samo's first API is native to this server. Compatibility adapters can sit beside it later, but these routes are the contracts Samo clients should prefer.

Authenticated `/api/v1/*` routes require a user token: `Authorization: Bearer <token>` or `X-Samo-Token: <token>`.

Legacy installs can keep using `SAMO_API_TOKEN`; it maps to the bootstrap `server` user (`user-server`) so existing clients keep working.

## Users

User accounts live in SQLite. Each user has their own playback state and can link their own Last.fm account.

| Route | Purpose |
|-------|---------|
| `POST /api/v1/auth/login` | username/password login; returns a bearer token |
| `GET /api/v1/users/me` | current user profile |
| `PATCH /api/v1/users/me` | update display name or password |
| `GET /api/v1/users/me/tokens` | list API tokens |
| `POST /api/v1/users/me/tokens` | issue a new token |
| `DELETE /api/v1/users/me/tokens/{id}` | revoke a token |
| `GET /api/v1/users` | list users (admin) |
| `POST /api/v1/users` | create user (admin) |

Bootstrap env (first run):

- `SAMO_BOOTSTRAP_USERNAME` — optional admin username (default `admin` when no other users exist)
- `SAMO_BOOTSTRAP_PASSWORD` — optional admin password. When omitted on first run, Samo generates a one-time random admin password and prints it to the server log.

If the named admin already exists and `SAMO_BOOTSTRAP_PASSWORD` is set, startup updates that admin's password. This gives self-hosted installs a recovery path without carrying a known default password.

Public routes (no user token): `GET /health`, `POST /api/v1/auth/login`, radio/internet-radio stream URLs.

## Catalog

- `GET /api/v1/catalog/overview`
- `GET /api/v1/catalog/manifest`

`overview` returns counts for each of the four first-class domains: music, audiobooks, podcasts, and radio. `manifest` returns namespaces, route lists, and the metadata groups clients can expect.

## Libraries

Filesystem libraries are stored in SQLite. Env-configured paths from `SAMO_MUSIC_DIRS`, `SAMO_AUDIOBOOK_DIRS`, and `SAMO_PODCAST_DIRS` are synced into the database on startup.

All `/api/v1/libraries` and `/api/v1/scan` routes are admin-only. General catalog clients should use the per-domain read routes under `/api/v1/music/*`, `/api/v1/audiobooks/*`, and `/api/v1/podcasts/*` instead.

Routes:

- `GET /api/v1/libraries`
- `GET /api/v1/libraries/{id}`
- `POST /api/v1/libraries`
- `PATCH /api/v1/libraries/{id}`
- `DELETE /api/v1/libraries/{id}`
- `POST /api/v1/libraries/{id}/scan`
- `POST /api/v1/scan`
- `GET /api/v1/scan/jobs`
- `GET /api/v1/scan/jobs/{id}`

`POST /api/v1/libraries` accepts:

```json
{
  "name": "Audiobooks",
  "kind": "audiobook",
  "path": "/media/audiobooks"
}
```

Supported `kind` values:

- `music` — music tracks/albums/artists
- `audiobook` — audiobook items, contributors, series, chapters
- `podcast` — podcast shows and episodes
- `mixed` — root containing a mix of the above; the scanner classifies each subfolder into the right domain table

Older clients that still send `kind="shelf"` plus `mediaType="book"` or `mediaType="podcast"` are translated to the explicit kinds at create time. New code should not emit those values.

Scan routes run asynchronously and return a scan job record. A scan removes database rows for files, audiobooks, podcasts, and local podcast episodes that disappeared from disk since the previous scan.

`PATCH /api/v1/libraries/{id}` may include a new `path`. Relocating a library creates a new deterministic library ID and moves child rows to it.

## Playback

Playback state is stored in SQLite and surfaced on catalog reads after refresh.

Routes:

- `GET /api/v1/playback/{kind}/{id}`
- `PUT /api/v1/playback/{kind}/{id}`
- `PATCH /api/v1/playback/{kind}/{id}`

Playback is stored per user in `user_playback`, not on shared catalog rows. `GET /api/v1/music/tracks/{id}` overlays the caller's playback onto the track response.

Supported `kind` values:

- `music-artist`, `music-album`, `music-track`, `music-playlist`
- `audiobook`
- `podcast`, `podcast-episode`

`PATCH` accepts partial fields plus optional `incrementPlayCount`, `incrementSkipCount`, `touchLastPlayedAt`, and `touchLastPositionAt`. Ratings must be 0–5.

When Last.fm is configured (via Settings or `SAMO_LASTFM_API_KEY` + `SAMO_LASTFM_SHARED_SECRET`) and an account is linked, music track playback patches automatically drive Last.fm now playing and scrobble submissions using standard listen thresholds (50% or 4 minutes, with a minimum listen time). Last.fm links are per Samo user, so different users can scrobble to different Last.fm accounts.

Example:

```json
PATCH /api/v1/playback/music-track/track-id
{
  "progressSeconds": 184,
  "favorite": true,
  "touchLastPositionAt": true
}
```

## Last.fm Scrobbling

See [docs/lastfm.md](lastfm.md) for the full guide. Summary:

- enable with `SAMO_LASTFM_API_KEY` + `SAMO_LASTFM_SHARED_SECRET`
- link account via `/api/v1/lastfm/auth/begin` and `/complete`
- automatic scrobbling from playback `PATCH`/`PUT`, music stream starts, and Subsonic `scrobble` / `updateNowPlaying`
- explicit client events via `POST /api/v1/scrobble/events`
- queue/history at `/api/v1/lastfm/queue` and `/api/v1/lastfm/history`
- favorites/starred sync to Last.fm love/unlove

## Media Streaming

Local files are served only when their path falls under a configured filesystem library root.
Symlink targets are resolved before serving, so a link inside a library cannot expose files outside allowed roots.

Routes:

- `GET /api/v1/media/files/{id}`
- `GET /api/v1/media/files/{id}/stream`
- `GET /api/v1/music/tracks/{id}/stream`
- `GET /api/v1/music/albums/{id}/cover`
- `GET /api/v1/audiobooks/{id}/stream`
- `GET /api/v1/audiobooks/{id}/cover`
- `GET /api/v1/podcasts/shows/{id}/cover`
- `GET /api/v1/podcasts/episodes/{id}/stream`

Stream routes support HTTP Range requests.

Remote RSS podcast episodes without local `media_files` stream through the server's enclosure proxy (`X-Samo-Stream-Source: enclosure`) unless a cached copy exists (`X-Samo-Stream-Source: cache`). Samo forwards Range headers to the publisher URL and applies saved episode progress as an upstream byte range when the client does not override resume position.

Podcast cache env vars (defaults shown):

| Variable | Default | Purpose |
|----------|---------|---------|
| `SAMO_PODCAST_CACHE` | `true` | Enable enclosure download/cache |
| `SAMO_PODCAST_CACHE_MAX_BYTES` | `10737418240` | Max total cache size (10 GiB) |
| `SAMO_PODCAST_CACHE_MAX_AGE` | `720h` | Evict entries not accessed within this window |
| `SAMO_PODCAST_CACHE_MAX_FILE_BYTES` | `524288000` | Max size per downloaded episode (500 MiB) |

Query parameters for track, audiobook, and podcast episode shortcuts:

| Parameter | Purpose |
|-----------|---------|
| `mediaFileId` | Stream a specific linked file (overrides defaults) |
| `disc` | Pick the file for a disc number (multi-disc albums / audiobooks) |
| `at`, `offsetSeconds`, or `progressSeconds` | Override resume position in global item seconds |

When `mediaFileId` is omitted, Samo picks the file automatically:

- Uses saved playback `progressSeconds` to select the correct part file and byte offset for multi-file audiobooks and podcasts.
- Uses `disc` (or the track's own disc number on music streams) when multiple files share one track.
- Orders linked files by disc/track metadata, then relative path.

Response headers on stream shortcuts:

- `X-Samo-Media-File-Id` — file being streamed
- `X-Samo-Stream-Offset-Seconds` — resume offset inside that file
- `X-Samo-Stream-Global-Seconds` — requested global position when applicable

Cover routes serve the first local image path on the album, audiobook, or podcast show (sidecar file or extracted embedded art).

### Extracted covers

When the scanner extracts embedded artwork, covers are cached under `{SAMO_DATA_DIR}/covers` and registered in `extracted_covers`.

Routes:

- `GET /api/v1/media/covers/{id}`
- `GET /api/v1/media/covers/{id}/image`

Catalog `Image` entries use the stable `cover_*` ID and local cache path when extraction ran during scan.

## Metadata Lookup

External metadata lookup is explicit and disabled by default. Search returns candidates; apply endpoints write user-selected fields after preview.

Enable providers with:

```sh
SAMO_METADATA_PROVIDERS=audible,openlibrary,googlebooks,itunes,musicbrainz
SAMO_METADATA_USER_AGENT="SamoServer/0.1 (you@example.com)"
```

Routes:

- `GET /api/v1/metadata/providers`
- `GET /api/v1/metadata/search`
- `POST /api/v1/metadata/apply/preview`
- `POST /api/v1/metadata/apply`
- `GET /api/v1/metadata/overrides/{targetKind}/{targetId}`
- `DELETE /api/v1/metadata/overrides/{targetKind}/{targetId}`
- `PATCH /api/v1/metadata/overrides/{targetKind}/{targetId}`

Provider/search routes are authenticated user routes. Apply/preview and override routes are admin-only because they mutate shared catalog metadata.

Apply writes user-confirmed fields to `metadata_overrides`. Scanner and RSS ingestion skip overwriting guarded columns in SQLite; catalog load and podcast feed API reads project overrides for clients.

Override inspection example:

```text
GET /api/v1/metadata/overrides/music-artist/artist-1
```

Clear specific override fields:

```json
PATCH /api/v1/metadata/overrides/audiobook/book-1
{ "fields": ["title", "description"] }
```

Supported `targetKind` values: `music-artist`, `music-album`, `music-track`, `music-playlist`, `audiobook`, `podcast`, `podcast-episode`, `podcast-feed`.

Search examples:

```text
GET /api/v1/metadata/search?kind=audiobook&title=Signal+Manual&author=Ada+Archive&audibleAsin=B000SAMO
GET /api/v1/metadata/search?kind=audiobook&isbn=9780000000001&provider=openlibrary
GET /api/v1/metadata/search?kind=podcast&q=Night+Signals&provider=itunes
GET /api/v1/metadata/search?kind=music&musicType=track&track=Signal+One&artist=The+Static&provider=musicbrainz
GET /api/v1/metadata/search?kind=music&musicType=album&album=Night+Broadcasts&artist=The+Static&provider=musicbrainz
```

Supported initial providers:

- `audible`: audiobook candidates from Audible catalog + Audnexus (square cover art, narrators, series, ASIN)
- `openlibrary`: audiobook/book candidates from Open Library
- `googlebooks`: audiobook/book candidates from Google Books
- `itunes`: podcast candidates from Apple's iTunes Search API
- `musicbrainz`: music artist, album/release-group, and track/recording candidates from MusicBrainz

Search returns candidate metadata only. It does not write catalog changes.

## Music

- `GET /api/v1/music/artists`
- `GET /api/v1/music/artists/{id}`
- `GET /api/v1/music/albums`
- `GET /api/v1/music/albums/{id}`
- `GET /api/v1/music/tracks`
- `GET /api/v1/music/tracks/{id}`
- `GET /api/v1/music/genres`
- `GET /api/v1/music/playlists`
- `GET /api/v1/music/playlists/{id}`
- `GET /api/v1/music/playlists/{id}/tracks`
- `POST /api/v1/music/playlists`
- `POST /api/v1/music/playlists/import`
- `PATCH /api/v1/music/playlists/{id}`
- `DELETE /api/v1/music/playlists/{id}`
- `GET /api/v1/music/browse/favorites`
- `GET /api/v1/music/browse/starred`
- `GET /api/v1/music/browse/recently-played`
- `GET /api/v1/music/browse/recently-added`
- `GET /api/v1/music/search?q=`

Playlist import accepts local playlist metadata and rebuilds a server playlist
from matching catalog tracks. It does not download remote media. Supported
`sourceType` values are `auto`, `csv`, `m3u`, `plain`, `json`, and `youtube`.
Admins may pass `url` for server-side metadata fetches; anyone may paste
`content`.

Playlists can be private or public. Private playlists are visible only to
their owner. Public playlists are readable by other authenticated users, but
only the owner can edit, delete, or change visibility.

```json
{
  "name": "Imported Mix",
  "sourceType": "m3u",
  "content": "#EXTM3U\n#EXTINF:263,New Order - Ceremony\n/music/New Order/Ceremony.flac\n"
}
```

Music search supports optional filters on the same route: `genre`, `year`, `favorite`, `starred`, `recentlyPlayed`, `recentlyAdded`, `completed`, `minRating`, and `sort` (`relevance`, `title`, `added`, `played`). Playback-aware filters use the authenticated user's overlay.

List routes support `limit` and `offset`.

Browse routes return a `view` plus paginated `artists`, `albums`, `tracks`, and `playlists` slices. Each entity includes the authenticated user's playback overlay (`favorite`, `starred`, `lastPlayedAt`, progress, ratings, etc.). Recently-played is ordered by `lastPlayedAt` descending; recently-added uses entity `createdAt` / `addedAt`.

Playlist mutations require the authenticated owner. Successful `POST`, `PATCH`, and `DELETE` reload the in-memory catalog projection.

Music metadata is intentionally richer than a simple file browser:

- artist sort names, disambiguation, biography, country, genres, styles, moods, links, images, external IDs, counts, playback state
- album artists, track artists, release and original release dates, release type/status, label, catalog number, barcode, genres, styles, moods, tags, images, external IDs, playback state
- track artists, album linkage, disc/track totals, release data, lyrics, BPM, key, comments, audio technical metadata, images, external IDs, playback state
- audio file container, MIME type, codec/profile, bitrate, bit depth, sample rate, channels, duration, size, checksum, embedded tags

## Audiobooks

Audiobooks are a first-class domain — they have their own table (`audiobooks`), their own DTO (`AudiobookItem`), and their own URL namespace. They do **not** share an item model with podcasts.

- `GET /api/v1/audiobooks`
- `GET /api/v1/audiobooks/{id}`
- `GET /api/v1/audiobooks/search?q=`
- `GET /api/v1/contributors` — authors, narrators, etc.
- `GET /api/v1/contributors/{id}` — optional `?include=audiobooks` returns contributor + paginated audiobooks
- `GET /api/v1/contributors/{id}/audiobooks`
- `GET /api/v1/series`
- `GET /api/v1/series/{id}` — optional `?include=audiobooks` returns series + paginated audiobooks
- `GET /api/v1/series/{id}/audiobooks` — paginated audiobooks in series order
- `GET /api/v1/audiobooks/{id}/bookmarks` — bookmarks for one book
- `POST /api/v1/audiobooks/{id}/bookmarks` — create a bookmark
- `GET /api/v1/bookmarks` — every bookmark the current user has saved across all audiobooks
- `PATCH /api/v1/bookmarks/{id}`
- `DELETE /api/v1/bookmarks/{id}`
- `GET /api/v1/collections` — user-owned audiobook lists
- `POST /api/v1/collections`
- `GET /api/v1/collections/{id}`
- `PATCH /api/v1/collections/{id}`
- `DELETE /api/v1/collections/{id}`
- `GET /api/v1/audiobooks/{id}/sessions` — listening sessions for one audiobook (`limit`, default 50, max 500)
- `GET /api/v1/listening-sessions` — recent sessions for the authenticated user

Audiobook search supports optional filters: `genre`, `libraryId`, `favorite`, `starred`, `recentlyPlayed`, `recentlyAdded`, `completed`, `minRating`, and `sort` (`relevance`, `title`, `added`, `played`).

Bookmark create accepts `title`, `note`, `positionSeconds`, and optional `chapterId`. Collection create/update accepts `name`, `description`, and ordered `audiobookIds`. Playback `PUT`/`PATCH` on `audiobook` appends a listening session when progress or play count changes.

Audiobook metadata includes:

- item identity, library ID, filesystem path, inode, size, missing/invalid flags, cover, tags, genres, duration, progress, audio files, chapters
- book title, subtitle, sort title, authors, narrators, series sequence, publisher, published date/year, description, language, ISBNs, explicit/abridged flags, external IDs
- contributor and series summaries with audiobook counts, duration, images, and external IDs

Bookmarks, collections, and listening sessions are audiobook-only. Podcasts use show subscriptions (RSS) and per-episode progress instead — there is no shared "longform" parent model.

## Podcasts

Podcasts are a first-class domain — separate from audiobooks. A podcast is a show, and each show has many episodes.

- `GET /api/v1/podcasts` — list shows
- `GET /api/v1/podcasts/shows/{id}` — get one show
- `GET /api/v1/podcasts/shows/{id}/episodes` — paginated episodes for one show
- `GET /api/v1/podcasts/shows/{id}/cover`
- `GET /api/v1/podcasts/episodes` — list episodes across all shows
- `GET /api/v1/podcasts/episodes/{id}`
- `GET /api/v1/podcasts/episodes/{id}/stream`
- `GET /api/v1/podcasts/search?q=`
- `GET /api/v1/podcasts/feeds` — list RSS subscriptions
- `POST /api/v1/podcasts/feeds` — subscribe to a feed
- `GET /api/v1/podcasts/feeds/{id}`
- `PATCH /api/v1/podcasts/feeds/{id}`
- `POST /api/v1/podcasts/feeds/poll` — run one poll cycle for all due feeds
- `POST /api/v1/podcasts/feeds/{id}/refresh` — refresh one feed immediately
- `DELETE /api/v1/podcasts/feeds/{id}`

Shows and episodes are split into separate `/shows/` and `/episodes/` URL prefixes so the routes have unambiguous shapes.

Podcast search supports optional filters: `genre`, `libraryId`, `favorite`, `starred`, `recentlyPlayed`, `recentlyAdded`, `completed`, `minRating`, and `sort` (`relevance`, `title`, `added`, `played`).

Podcast metadata includes:

- show title, author, description, feed URL, site URL, language, explicit flag, categories, owner name/email, episode count, external IDs
- episode title, subtitle, description, published date, season/episode numbers, enclosure metadata, chapters, audio files, progress, external IDs

Podcast feeds are remote source records. `POST /api/v1/podcasts/feeds` accepts:

```json
{
  "url": "https://example.com/show/feed.xml",
  "title": "Optional Display Override"
}
```

Samo fetches the RSS feed, stores the feed source, creates or updates a podcast show, and creates or updates remote episodes with enclosure metadata. Local podcast files come from the scanner and write into the same `podcasts` / `podcast_episodes` tables, so clients see one consistent shape regardless of source.

Podcast feed source mutations (`POST`, `PATCH`, manual poll/refresh, and `DELETE`) are admin-only. Feed and episode reads are available to authenticated users.

Feed responses include a `poll` object: `pollEnabled`, `pollIntervalSeconds` (900–604800), `nextPollAt`, `lastPollStartedAt`, `lastPollFinishedAt`, and `consecutiveErrors`.

`PATCH /api/v1/podcasts/feeds/{id}` accepts optional `title`, `pollEnabled`, and `pollIntervalSeconds` without re-fetching RSS.

`POST /api/v1/podcasts/feeds/poll` runs one poll cycle for all due feeds and returns `{ checked, updated, failed, skipped, results[] }`.

When `SAMO_PODCAST_POLL=true` (default), the server also polls due feeds on a background ticker (`SAMO_PODCAST_POLL_TICK`, default `1m`).

## Radio

- `GET /api/v1/radio/stations`
- `GET /api/v1/radio/stations/{id}`
- `GET /api/v1/radio/stations/{id}/now`
- `GET /api/v1/radio/stations/{id}/schedule?from=2026-01-01T00:00:00Z&limit=24`
- `GET /radio/{id}/playlist.m3u`
- `GET /radio/{id}/stream`

The playlist and stream routes stay public so audio clients can open them directly.

## Internet Radio

Internet radio stations are user-added external streams. They are separate from Samo's programmed 24/7 radio stations.

- `GET /api/v1/internet-radio/stations`
- `POST /api/v1/internet-radio/stations`
- `GET /api/v1/internet-radio/stations/{id}`
- `DELETE /api/v1/internet-radio/stations/{id}`
- `GET /internet-radio/{id}/playlist.m3u`
- `GET /internet-radio/{id}/stream`

`POST /api/v1/internet-radio/stations` accepts:

```json
{
  "name": "Static FM",
  "streamUrl": "https://radio.example.com/live.mp3",
  "homepageUrl": "https://radio.example.com",
  "contentType": "audio/mpeg",
  "codec": "mp3",
  "bitrate": 128000,
  "tags": ["old time radio", "drama"]
}
```

The public playlist route writes an M3U pointing at the original stream URL. The public stream route redirects to the original stream URL.
Creating and deleting internet radio station records is admin-only; reading the station list/detail is available to authenticated users.

## Compatibility Direction

Navidrome compatibility mostly means OpenSubsonic/Subsonic behavior for music clients. Audiobookshelf compatibility mostly means bearer-token API access to library items with rich book and podcast media metadata. Samo's native API is deliberately shaped so those compatibility layers can map into it without flattening metadata.

### Subsonic / OpenSubsonic (music clients)

Samo exposes a Subsonic-compatible JSON API under `/rest/`. Clients such as DSub, Symfonium (Subsonic mode), and others can browse and stream music without a Samo-native app.

**Base path:** `/rest/{action}` or `/rest/{action}.view`

**Auth:** Pass the Samo username as `u` and either:

- a user API token or password as `p`, or
- Subsonic token auth (`t` + `s` with MD5 of `password+salt`)

Legacy `SAMO_API_TOKEN` still works as the password for the `server` user. When user accounts are disabled and no API token is set, `/rest` endpoints are open on the local network like many home Subsonic installs.

Per-user Last.fm scrobbling uses the authenticated Subsonic user (`u`).

**Supported v1 endpoints:**

- `ping`, `getLicense`, `getMusicFolders`
- `getIndexes`, `getArtists`, `getArtist`, `getAlbum`, `getAlbumList2`, `getMusicDirectory`
- `getSong`, `search2`, `search3`
- `getPlaylists`, `getPlaylist`
- `getOpenSubsonicExtensions`
- `stream`, `getCoverArt`

Use `f=json` for JSON responses. Samo IDs are passed through as Subsonic string IDs.

Example:

```http
GET /rest/ping.view?u=samo&p=<token>&v=1.16.1&c=MyClient&f=json
GET /rest/getAlbum.view?id=<albumId>&f=json&p=<token>
GET /rest/stream?id=<trackId>&p=<token>
```
