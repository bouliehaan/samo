# Samo Server — Client Integration Guide

This is the doc you read first when wiring a samo-client to a samo-server.
Everything below assumes you're talking to the **native** `/api/v1/*`
surface; the Subsonic `/rest/*` adapter is documented separately at the
bottom for clients that already speak Subsonic.

- Base URL: whatever the operator deployed (default `:6969`).
- Wire format: JSON in, JSON out.
- All non-public routes require a bearer token (or a stream token for
  media URLs that can't carry headers).

## Server-state lifecycle

There are three states a server can be in. A new client should probe
`/api/v1/setup/status` (public) before any other call so it can offer
the right UX:

```http
GET /api/v1/setup/status

200 {
  "needsSetup": true,
  "hasAdmin": false,
  "hasLibrary": false,
  "libraryCount": 0,
  "hasScanned": false,
  "currentStep": "admin"
}
```

| `currentStep` | Meaning                                                       |
|---------------|---------------------------------------------------------------|
| `admin`       | No admin user exists — server is brand new                    |
| `libraries`   | Admin exists, no libraries attached                           |
| `scan`        | Libraries attached, no scan run yet                           |
| `done`        | Server is ready; you can sign in and consume the API normally |

`needsSetup` is `true` for the first three. If it's `true`, your client
should either:

1. Walk the user through `/api/v1/setup/*` endpoints (see [Setup
   wizard](#setup-wizard) below), or
2. Tell the user to finish setup at `<server>/setup` in a browser.

Once `needsSetup` is `false`, all the normal endpoints become useful.

## Authentication

Samo has three tiers of credentials:

| Credential        | Lifetime    | Use                                            |
|-------------------|-------------|------------------------------------------------|
| Username/password | —           | Submitted to `/api/v1/auth/login`              |
| Bearer token      | Permanent   | Sent in `Authorization: Bearer <token>` header |
| Stream token      | 30 minutes  | Sent as `?stream_token=<token>` in media URLs  |

### Sign in

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "username": "jake", "password": "..." }

200 {
  "user": { "id": "user-...", "username": "jake", "displayName": "Jake", "role": "admin" },
  "token": "tok_...",
  "tokenMeta": { "id": "token-...", "label": "login", "createdAt": "..." }
}
```

Persist `token` on the client and send it on every subsequent request:

```http
GET /api/v1/users/me
Authorization: Bearer tok_...
```

Or, if you can't set Authorization (rare on web; common on some embedded
players), the same token can be sent as `X-Samo-Token: <token>`.

### Issue a long-lived device token

The `login` endpoint mints a token labeled `"login"`. For a real client
you probably want a device-named token so the user can revoke it later
from settings:

```http
POST /api/v1/users/me/tokens
Authorization: Bearer <login token>
Content-Type: application/json

{ "label": "Jake's iPhone" }

201 {
  "token": { "id": "token-...", "label": "Jake's iPhone", "createdAt": "..." },
  "secret": "tok_..."
}
```

Store `secret`, discard the login token, and use the new one from now on.
The user can revoke any device under Settings → Account in the web app
(or via `DELETE /api/v1/users/me/tokens/{id}`).

### Stream tokens (media URLs)

HTML5 `<audio src>` and `<img src>` can't send custom headers, so Samo
mints short-lived stream tokens that travel as a query parameter. Mint
one when your player boots and refresh it periodically (TTL is 30 min,
refresh well before that, e.g. every 20):

```http
POST /api/v1/auth/stream-token
Authorization: Bearer <token>

200 { "token": "smt_...", "expiresAt": "2026-05-23T16:48:00Z" }
```

Then build media URLs like:

```
/api/v1/music/tracks/<id>/stream?stream_token=smt_...
/api/v1/music/albums/<id>/cover?stream_token=smt_...
/api/v1/audiobooks/<id>/stream?stream_token=smt_...
/api/v1/audiobooks/<id>/cover?stream_token=smt_...
/api/v1/podcasts/shows/<id>/cover?stream_token=smt_...
/api/v1/podcasts/episodes/<id>/stream?stream_token=smt_...
```

Stream tokens authenticate the same user the bearer that minted them
belongs to. They're stored only in memory on the server — restart wipes
them and clients should re-mint.

If you can attach headers to your stream requests (native mobile HTTP
stack, custom audio engine), you can skip stream tokens entirely and
send `Authorization: Bearer <token>` on the stream URLs directly.

### Sign out

Token-based — just drop the token client-side. To kill it server-side
too (so it stops working from other devices):

```http
DELETE /api/v1/users/me/tokens/{id}
Authorization: Bearer <token>
```

## Common conventions

### Pagination

List endpoints accept `?limit=<n>&offset=<n>` and return:

```json
{ "items": [...], "total": 142, "limit": 50, "offset": 0 }
```

`limit` defaults to 50, max 500. `total` is the count of all matching
items (not just this page).

### Errors

All error responses are JSON with a single `error` field:

```http
400 { "error": "library kind must be music, audiobook, podcast, or mixed" }
401 { "error": "missing or invalid credentials" }
404 { "error": "audiobook not found" }
```

Status codes follow normal HTTP semantics. Stream/cover routes return
404 if the media doesn't exist or 403 if it sits outside a configured
library root.

### Times

All timestamps are RFC3339 UTC (`2026-05-23T16:48:00Z`). All durations
are integer seconds.

### IDs

Every entity has a stable string ID with a kind prefix:

| Prefix       | Entity                  |
|--------------|-------------------------|
| `library_`   | filesystem library      |
| `track_`     | music track             |
| `album_`     | music album             |
| `artist_`    | music artist            |
| `playlist_`  | music playlist          |
| `audiobook_` | audiobook               |
| `podcast_`   | podcast show            |
| `episode_`   | podcast episode         |
| `person_`    | contributor (author, narrator, etc.) |
| `series_`    | audiobook series        |
| `bookmark_`  | audiobook bookmark      |
| `collection_`| audiobook collection    |
| `mediafile_` | a single file on disk   |
| `cover_`     | cached cover image      |
| `feed_`      | podcast RSS feed source |
| `internet-radio_` | internet radio station |
| `radio_`     | programmed radio station |
| `ritem_`     | radio station item      |
| `scan_`      | scan job                |
| `user-`      | user account            |
| `token-`     | API token               |
| `tok_`, `smt_` | secret token values   |

IDs are deterministic where possible (a library at the same path
re-scanned produces the same library ID), so you can cache them.

## Setup wizard

Used only when `setup/status.needsSetup` is `true`. All routes in this
namespace are public during setup; they become admin-only after the
first admin exists.

| Method | Path                                | Purpose                          |
|--------|-------------------------------------|----------------------------------|
| GET    | `/api/v1/setup/status`              | Probe state (always public)      |
| POST   | `/api/v1/setup/admin`               | Create the first admin (returns a login response) |
| GET    | `/api/v1/setup/directories?path=`   | Browse filesystem for library folders |
| POST   | `/api/v1/setup/libraries`           | Attach a library (requires admin token) |
| POST   | `/api/v1/setup/scan`                | Run an initial scan              |
| POST   | `/api/v1/setup/complete`            | Finalize (no-op gate, returns done state) |

Create-admin example:

```http
POST /api/v1/setup/admin
Content-Type: application/json

{ "username": "jake", "password": "min-8-chars" }

201 { "user": {...}, "token": "tok_...", "tokenMeta": {...} }
```

The returned token is an admin token. Use it for the rest of the setup
calls. After setup, treat it like any other bearer token.

## Users

| Method | Path                       | Notes                            |
|--------|----------------------------|----------------------------------|
| GET    | `/api/v1/users/me`         | Profile of current user          |
| PATCH  | `/api/v1/users/me`         | Update display name / password   |
| GET    | `/api/v1/users/me/tokens`  | List your API tokens             |
| POST   | `/api/v1/users/me/tokens`  | Issue a new token (returns one-shot `secret`) |
| DELETE | `/api/v1/users/me/tokens/{id}` | Revoke a token              |
| GET    | `/api/v1/users`            | Admin: list users                |
| POST   | `/api/v1/users`            | Admin: create user (`role: "admin"` or `"user"`) |

## Catalog overview

```http
GET /api/v1/catalog/overview
```

```json
{
  "music":     { "artistCount": 142, "albumCount": 580, "trackCount": 9412 },
  "audiobook": { "audiobookCount": 84, "contributorCount": 41, "seriesCount": 12 },
  "podcast":   { "podcastCount": 12, "episodeCount": 1820 }
}
```

Each first-class domain (music, audiobook, podcast) reports its own
counts. Audiobooks and podcasts are intentionally separate — they have
nothing in common at the catalog level, so they each get their own
shape.

```http
GET /api/v1/catalog/manifest
```

Returns a self-describing JSON document with all top-level routes,
namespaces, and metadata sets. Useful for client devs as a discovery
endpoint.

## Music

### Reads

| Method | Path                                              |
|--------|---------------------------------------------------|
| GET    | `/api/v1/music/artists`                           |
| GET    | `/api/v1/music/artists/{id}`                      |
| GET    | `/api/v1/music/artists/{id}/albums`               |
| GET    | `/api/v1/music/albums`                            |
| GET    | `/api/v1/music/albums/{id}`                       |
| GET    | `/api/v1/music/tracks`                            |
| GET    | `/api/v1/music/tracks/{id}`                       |
| GET    | `/api/v1/music/genres`                            |
| GET    | `/api/v1/music/playlists`                         |
| GET    | `/api/v1/music/playlists/{id}`                    |
| GET    | `/api/v1/music/playlists/{id}/tracks`             |
| GET    | `/api/v1/music/browse/recently-added?limit=`      |
| GET    | `/api/v1/music/browse/recently-played?limit=`     |
| GET    | `/api/v1/music/browse/starred?limit=`             |
| GET    | `/api/v1/music/browse/favorites?limit=`           |
| GET    | `/api/v1/music/search?q=<query>&limit=`           |

Search returns three keyed arrays:

```json
{ "albums": [...], "tracks": [...], "artists": [...] }
```

### Streaming

```http
GET /api/v1/music/tracks/{id}/stream?stream_token=smt_...
```

- Returns the original file bytes (bit-perfect — no transcoding).
- Supports Range requests; serves `audio/<container>` content types.
- Adds `X-Samo-Media-File-Id` so clients can correlate multi-file albums.

Optional query params: `disc=<n>` to force a disc, `mediaFileId=<id>` to
force a specific linked file, `offsetSeconds=<n>` to resume at a byte
offset.

### Cover art

```http
GET /api/v1/music/albums/{id}/cover?stream_token=smt_...
```

Returns image bytes (jpeg/png/webp). Album covers also resolve for
artist covers when the artist has no dedicated image — pass an artist's
"first album" ID or use the Subsonic getCoverArt resolver if you want
the universal lookup.

### Playlist writes

| Method | Path                              |
|--------|-----------------------------------|
| GET    | `/api/v1/music/playlists/{id}/tracks` |
| POST   | `/api/v1/music/playlists`         |
| POST   | `/api/v1/music/playlists/import`  |
| PATCH  | `/api/v1/music/playlists/{id}`    |
| DELETE | `/api/v1/music/playlists/{id}`    |

Body for create:

```json
{ "name": "Late Night", "description": "...", "public": false, "trackIds": ["track_a", "track_b"] }
```

Private playlists are visible only to their owner. Public playlists are
readable by other authenticated users, which is the sharing model for family
playlists; edit/delete/visibility changes still require the owner.

Import rebuilds playlists from local matches only. Paste `content` for CSV,
M3U/M3U8, JSON, or plain `Artist - Title` lines, or let an admin provide a
YouTube Music / playlist URL for metadata extraction.

## Audiobooks

Audiobooks are a first-class domain with their own table
(`audiobooks`), DTO (`AudiobookItem`), and URL namespace. They do
**not** share a model with podcasts.

| Method | Path                                              | Notes                                    |
|--------|---------------------------------------------------|------------------------------------------|
| GET    | `/api/v1/audiobooks?limit=`                       | List audiobooks                          |
| GET    | `/api/v1/audiobooks/{id}`                         | Detail with chapters, audio files, progress |
| GET    | `/api/v1/audiobooks/search?q=`                    | Audiobook + contributor + series search  |
| GET    | `/api/v1/contributors?limit=`                     | Authors, narrators, etc.                 |
| GET    | `/api/v1/contributors/{id}?include=audiobooks&limit=` | Contributor + their audiobooks       |
| GET    | `/api/v1/contributors/{id}/audiobooks?limit=`     |                                          |
| GET    | `/api/v1/series?limit=`                           |                                          |
| GET    | `/api/v1/series/{id}?include=audiobooks&limit=`   | Series + ordered audiobooks              |
| GET    | `/api/v1/series/{id}/audiobooks?limit=`           |                                          |

### Bookmarks, collections, sessions

Audiobook-only. Podcasts have show subscriptions (RSS) and per-episode
progress instead — there is no shared bookmark/collection model.

| Method | Path                                                |
|--------|-----------------------------------------------------|
| GET    | `/api/v1/audiobooks/{id}/bookmarks`                 |
| POST   | `/api/v1/audiobooks/{id}/bookmarks`                 |
| GET    | `/api/v1/bookmarks`                                 |
| PATCH  | `/api/v1/bookmarks/{id}`                            |
| DELETE | `/api/v1/bookmarks/{id}`                            |
| GET    | `/api/v1/collections`                               |
| POST   | `/api/v1/collections`                               |
| GET    | `/api/v1/collections/{id}`                          |
| PATCH  | `/api/v1/collections/{id}`                          |
| DELETE | `/api/v1/collections/{id}`                          |
| GET    | `/api/v1/audiobooks/{id}/sessions`                  |
| GET    | `/api/v1/listening-sessions?limit=`                 |

Listening sessions are auto-recorded when you `PATCH` playback state on
an `audiobook` target (see [Playback state](#playback-state)).

### Streaming + covers

```
GET /api/v1/audiobooks/{id}/stream?stream_token=smt_...
GET /api/v1/audiobooks/{id}/cover?stream_token=smt_...
```

The audiobook stream picks the right file for multi-file audiobooks
based on saved progress. To force a specific file: `?mediaFileId=`. To
resume at an offset: `?offsetSeconds=`.

## Podcasts

Podcasts are a first-class domain — separate from audiobooks. A podcast
is a *show*, and each show has many *episodes*. The URL namespace is
split into `/shows/{id}` and `/episodes/{id}` so the routes have
unambiguous shapes.

| Method | Path                                              | Notes                                    |
|--------|---------------------------------------------------|------------------------------------------|
| GET    | `/api/v1/podcasts?limit=`                         | List shows                               |
| GET    | `/api/v1/podcasts/shows/{id}`                     | Show detail                              |
| GET    | `/api/v1/podcasts/shows/{id}/episodes?limit=`     | Episodes for one show                    |
| GET    | `/api/v1/podcasts/episodes?limit=`                | All episodes across all shows            |
| GET    | `/api/v1/podcasts/episodes/{id}`                  |                                          |
| GET    | `/api/v1/podcasts/search?q=`                      | Show + episode search                    |

### Podcast feeds (RSS-backed shows)

A podcast feed is the *source* row backing a podcast show in the
`podcasts` table. RSS-imported and locally-scanned podcasts both end
up in the same `podcasts` / `podcast_episodes` tables, so clients see
one consistent shape.

| Method | Path                                              | Notes                          |
|--------|---------------------------------------------------|--------------------------------|
| GET    | `/api/v1/podcasts/feeds?limit=`                   |                                |
| POST   | `/api/v1/podcasts/feeds` (admin)                  | Subscribe to a new RSS feed    |
| GET    | `/api/v1/podcasts/feeds/{id}`                     |                                |
| PATCH  | `/api/v1/podcasts/feeds/{id}` (admin)             | Update title or poll settings  |
| POST   | `/api/v1/podcasts/feeds/{id}/refresh` (admin)     | Force-refresh now              |
| POST   | `/api/v1/podcasts/feeds/poll` (admin)             | Run one poll cycle             |
| DELETE | `/api/v1/podcasts/feeds/{id}` (admin)             |                                |

Feed body:

```json
{ "url": "https://example.com/feed.xml", "title": "(optional, RSS provides it)" }
```

Feed poll settings:

```json
{ "pollEnabled": true, "pollIntervalSeconds": 3600 }
```

Interval must be between 900s (15 min) and 7d.

### Streaming + covers

```
GET /api/v1/podcasts/shows/{id}/cover?stream_token=smt_...
GET /api/v1/podcasts/episodes/{id}/stream?stream_token=smt_...
```

Episode streams prefer cached bytes (`X-Samo-Stream-Source: cache`)
before proxying the publisher (`X-Samo-Stream-Source: enclosure`). The
proxy forwards Range requests upstream.

## Radio

Two distinct systems share this namespace:

1. **Programmed stations** (`/api/v1/radio/*`) — Samo's own 24/7 loops
   built from local catalog items.
2. **Internet radio** (`/api/v1/internet-radio/*`) — registry of
   external Icecast/Shoutcast streams with ICY metadata probing.

### Programmed stations

| Method | Path                                                  |
|--------|-------------------------------------------------------|
| GET    | `/api/v1/radio/stations`                              |
| GET    | `/api/v1/radio/stations/{id}`                         |
| GET    | `/api/v1/radio/stations/{id}/now`                     |
| GET    | `/api/v1/radio/stations/{id}/schedule?from=&limit=`   |
| (admin) `GET/POST /api/v1/radio/admin/stations`                |
| (admin) `GET/PATCH/DELETE /api/v1/radio/admin/stations/{id}`   |
| (admin) `POST /api/v1/radio/admin/stations/{id}/items`         |
| (admin) `DELETE /api/v1/radio/admin/items/{itemId}`            |

Public streaming (no auth) — these are the URLs you hand to an external
audio player:

```
GET /radio/{id}/stream            # audio bytes
GET /radio/{id}/playlist.m3u      # M3U pointing at the stream
```

Station items can reference catalog entities (`music-track`,
`audiobook`, `podcast-episode`) or explicit file paths. The resolver
handles the lookup at hydration time.

### Internet radio

| Method | Path                                                |
|--------|-----------------------------------------------------|
| GET    | `/api/v1/internet-radio/stations?limit=`            |
| POST   | `/api/v1/internet-radio/stations` (admin)           |
| GET    | `/api/v1/internet-radio/stations/{id}`              |
| PATCH  | `/api/v1/internet-radio/stations/{id}` (admin)      |
| POST   | `/api/v1/internet-radio/stations/{id}/probe` (admin)|
| POST   | `/api/v1/internet-radio/stations/probe` (admin)     |
| DELETE | `/api/v1/internet-radio/stations/{id}` (admin)      |

Public streaming pass-throughs:

```
GET /internet-radio/{id}/stream         # 302 to upstream
GET /internet-radio/{id}/playlist.m3u   # M3U pointing at upstream
```

Each station carries a `nowPlaying` and `probe` block populated by the
background ICY prober. POSTing a new station also fires one immediate
probe so the first metadata arrives within seconds.

Add body:

```json
{
  "name": "WFMU",
  "streamUrl": "https://stream0.wfmu.org/freeform-128k",
  "homepageUrl": "https://wfmu.org",
  "tags": ["freeform", "left field"],
  "enabled": true
}
```

## Playback state

All catalog targets carry per-user playback state. The same shape works
across music, audiobook, podcast show, and podcast episode targets.

| Method | Path                                        |
|--------|---------------------------------------------|
| GET    | `/api/v1/playback/{kind}/{id}`              |
| PUT    | `/api/v1/playback/{kind}/{id}`              |
| PATCH  | `/api/v1/playback/{kind}/{id}`              |

`kind` is one of: `music-artist`, `music-album`, `music-track`,
`music-playlist`, `audiobook`, `podcast`, `podcast-episode`.

PATCH body (all fields optional, all merged):

```json
{
  "favorite": true,
  "starred": true,
  "rating": 4,
  "progressSeconds": 1245,
  "completed": false,
  "incrementPlayCount": true,
  "incrementSkipCount": false,
  "touchLastPlayedAt": true,
  "touchLastPositionAt": true
}
```

PUT replaces wholesale. Use PATCH for normal listening updates (it's
what the web player emits every ~20s during playback).

PATCHing an `audiobook` target automatically records a listening
session segment for the audiobook session history.

### Scrobbling events

Clients can also emit explicit scrobble events. These feed Last.fm
when an account is linked:

```http
POST /api/v1/scrobble/events
Content-Type: application/json

{ "trackId": "track_...", "playedAt": "2026-05-23T...", "completed": true }
```

## Metadata search + apply

Optional external metadata providers — disabled by default. The
operator turns them on with `SAMO_METADATA_PROVIDERS` (comma-separated
list of `openlibrary`, `googlebooks`, `itunes`, `musicbrainz`).

| Method | Path                                                              |
|--------|-------------------------------------------------------------------|
| GET    | `/api/v1/metadata/providers`                                      |
| GET    | `/api/v1/metadata/search?kind=&query=&provider=`                  |
| POST   | `/api/v1/metadata/apply/preview` (admin)                          |
| POST   | `/api/v1/metadata/apply` (admin)                                  |
| GET    | `/api/v1/metadata/overrides/{targetKind}/{targetId}`              |
| PATCH  | `/api/v1/metadata/overrides/{targetKind}/{targetId}`              |
| DELETE | `/api/v1/metadata/overrides/{targetKind}/{targetId}`              |

Apply preview returns a `before`/`after` diff and the list of fields
that would be touched. Apply requires an explicit `fields` array so
nothing changes by surprise.

## Libraries + scans (admin)

| Method | Path                                  |
|--------|---------------------------------------|
| GET    | `/api/v1/libraries`                   |
| POST   | `/api/v1/libraries`                   |
| GET    | `/api/v1/libraries/{id}`              |
| PATCH  | `/api/v1/libraries/{id}`              |
| DELETE | `/api/v1/libraries/{id}`              |
| POST   | `/api/v1/libraries/{id}/scan`         |
| POST   | `/api/v1/scan`                        |
| GET    | `/api/v1/scan/jobs?limit=`            |
| GET    | `/api/v1/scan/jobs/{id}`              |

Create body:

```json
{
  "name": "Music",
  "kind": "music",        // music | audiobook | podcast | mixed
  "path": "/srv/music"
}
```

`mixed` kind walks subfolders and dispatches per folder into the right
domain table (audiobooks, podcasts, or music tracks) based on content
signals (sidecars, `.m4b`, episode-naming patterns, etc.) — use it
when the user has a single mounted media root. A mixed library never
produces a "mixed-item" row; each subfolder lands in its native
domain.

Older clients may still send `kind="shelf"` plus `mediaType="book"` or
`mediaType="podcast"`; the server translates those to the new
`audiobook` / `podcast` kinds at create time. New code should not emit
the legacy form.

## Last.fm

| Method | Path                                  |
|--------|---------------------------------------|
| GET    | `/api/v1/lastfm/status`               |
| POST   | `/api/v1/lastfm/auth/begin`           |
| POST   | `/api/v1/lastfm/auth/complete`        |
| DELETE | `/api/v1/lastfm/auth/session`         |
| POST   | `/api/v1/lastfm/queue/flush`          |
| GET    | `/api/v1/lastfm/queue`                |
| GET    | `/api/v1/lastfm/history`              |

Enabled when an admin configures Last.fm API credentials in Settings or via
`SAMO_LASTFM_API_KEY` / `SAMO_LASTFM_SHARED_SECRET`. Auth flow is web-based:
`begin` returns an `authUrl` the user opens in a browser, then `complete`
exchanges the approval token for a session. Sessions, queues, and history are
scoped to the authenticated Samo user, so different Samo users can link
different Last.fm accounts.

## Public routes (no auth)

These bypass all auth so external audio players can consume them:

```
GET /health
POST /api/v1/auth/login
GET /api/v1/setup/status
GET /api/v1/setup/directories  (only while needsSetup=true)
POST /api/v1/setup/admin       (only while needsSetup=true)
GET /radio/{id}/stream
GET /radio/{id}/playlist.m3u
GET /internet-radio/{id}/stream
GET /internet-radio/{id}/playlist.m3u
```

## Subsonic compatibility surface

Samo speaks enough Subsonic/OpenSubsonic for existing clients (DSub,
Substreamer, Symfonium, etc.) to browse and stream music. JSON only
(`f=json`); XML is not implemented. Auth uses standard Subsonic
parameters or a Bearer header.

Implemented actions under `/rest/`:

- `ping`, `getLicense`, `getMusicFolders`
- `getIndexes`, `getMusicDirectory`, `getArtist`, `getAlbum`, `getSong`
- `getArtists`, `getAlbumList`, `getAlbumList2`
- `getRandomSongs`, `getStarred`, `getStarred2`, `star`, `unstar`
- `getPlaylists`, `getPlaylist`
- `search2`, `search3`
- `stream`, `download`, `getCoverArt`
- `scrobble`, `updateNowPlaying`

These all reuse the native catalog and files services, so Subsonic
clients see the same data your samo-client does. The Subsonic adapter
is for *other people's* clients; build samo-clients against the native
API.

## Versioning

The native API is `v1` and the route prefix is `/api/v1`. Breaking
changes will move to `/api/v2`. Within `v1`:

- Adding fields to responses: non-breaking.
- Adding new routes: non-breaking.
- Removing routes or fields: breaking — won't happen without a `v2`.

The server doesn't currently expose a version endpoint other than
`/health` (which returns the service name). The `User-Agent` in
outbound requests is `SamoServer/<semver>`; client devs can rely on
the `/api/v1` prefix as the version contract.

## Worked example: minimal client boot

```
1. GET  /api/v1/setup/status                  → needsSetup?
   true  → tell user to finish setup at /setup
   false → continue
2. POST /api/v1/auth/login {username, password} → store bearer token
3. POST /api/v1/users/me/tokens {label}        → store device-named token
                                                 (replace login token)
4. POST /api/v1/auth/stream-token              → store stream token
5. Refresh stream token every 20 minutes
6. GET  /api/v1/catalog/overview               → render initial counts
7. GET  /api/v1/music/browse/recently-added    → render home
8. Build media URLs as
   `/api/v1/music/tracks/<id>/stream?stream_token=<...>`
   `/api/v1/music/albums/<id>/cover?stream_token=<...>`
9. PATCH /api/v1/playback/music-track/<id> every ~20s during playback
```

That's the contract. Everything else is detail.
