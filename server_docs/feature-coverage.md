# Feature Coverage

How Samo Server stacks up against the two products it's meant to
replace, plus what's intentionally out of scope.

## Replacing Navidrome (music)

| Feature                                | Samo |
|----------------------------------------|------|
| ID3 / Vorbis / MP4 tag scanning        | ✅   |
| Embedded chapter / cover extraction    | ✅   |
| Artists, albums, tracks, genres        | ✅   |
| Multi-disc albums                      | ✅   |
| Playlists (CRUD + ownership)           | ✅   |
| Search                                 | ✅ (in-memory index, multi-token, filtered) |
| Recently added / played, starred, favorites | ✅ |
| Cover art (embedded + sidecar)         | ✅   |
| Cover art download from external metadata | ✅ |
| Bit-perfect streaming with Range       | ✅   |
| Watch folders + incremental rescan     | ✅   |
| Multi-user accounts + per-user state   | ✅   |
| Subsonic / OpenSubsonic API            | ✅ JSON (ping, indexes, getArtist/Album/Song, getAlbumList(2), getRandomSongs, getStarred(2), star/unstar, getPlaylists/Playlist, search2/3, stream, download, getCoverArt, scrobble, updateNowPlaying) |
| Last.fm scrobbling                     | ✅ native + per-user account linking |
| Internet radio stations                | ✅ (with ICY metadata probing — Navidrome doesn't probe) |
| Smart playlists                        | ❌ deferred |
| ReplayGain normalization               | ❌ intentional (bit-perfect directive) |
| Transcoding                            | ❌ intentional |
| Lyrics                                 | ❌ deferred |
| Public share links                     | ❌ deferred |
| LDAP / OIDC / SSO                      | ❌ deferred |
| ListenBrainz                           | ❌ deferred (cheap to add — same shape as Last.fm) |

## Replacing Audiobookshelf (audiobooks + podcasts)

| Feature                                  | Samo |
|------------------------------------------|------|
| Audiobook library scanning               | ✅   |
| Multi-file audiobooks (disc subfolders)  | ✅ disc-aware stream selection |
| Authors, series, narrators               | ✅   |
| Embedded + sidecar chapters              | ✅ (ffprobe + `.cue` + `metadata.json` + OverDrive MediaMarkers) |
| Cover art (embedded + sidecar + remote)  | ✅   |
| Per-user progress tracking               | ✅   |
| Bookmarks                                | ✅   |
| Collections                              | ✅   |
| Listening sessions / history             | ✅   |
| Sidecar parsing (`.opf`, `desc.txt`, `reader.txt`, `metadata.json`, `book.nfo`) | ✅ |
| Podcast RSS subscriptions                | ✅   |
| Podcast episode caching                  | ✅ (size + age retention) |
| Podcast metadata search (iTunes)         | ✅   |
| Book metadata search (Audible/Audnexus, OpenLibrary, Google Books) | ✅ |
| User-applied metadata overrides          | ✅ (rescans + RSS refreshes don't clobber) |
| E-books (epub, pdf)                      | ❌ out of scope (audio-only) |
| Comics                                   | ❌ out of scope |
| Audiobookshelf API compatibility surface | ❌ deferred (use the native API) |
| Sleep timer / speed control              | N/A (client concern) |
| Stats UI                                 | ⚠️  raw data via API; no charts in the bundled UI |

## Samo-native extras (neither Navidrome nor Audiobookshelf has these)

- **Mixed library kind** — point at one folder, Samo classifies
  subfolders as music or audiobooks based on sidecar/extension/size
  signals.
- **Programmed 24/7 radio** — DB-backed stations that loop music
  tracks, audiobooks, podcast episodes, or explicit file paths.
- **ICY metadata probing for internet radio** — captures icy-name,
  codec, bitrate, and current StreamTitle.
- **Catalog-backed radio items** — radio stations reference catalog
  entities, so they update when the catalog changes.
- **Metadata override layer** — user edits live in a separate table
  that's projected onto reads; rescans can refresh source facts
  without losing manual corrections.
- **Single static binary install** — no Docker required, no glibc
  version pinning, no CGO.
- **Bundled ffmpeg** — `-tags bundled` embeds the toolchain.
- **Stream tokens** — short-lived credentials for `<audio src>` URLs
  so the bearer never leaks via Referer / server log.
- **First-run setup wizard** — browser-driven; no env vars required.
- **Setup directory browser** — pick library folders from the web UI
  instead of pasting paths.
- **Self-describing API manifest** at `/api/v1/catalog/manifest`.

## Intentionally out of scope

These are decisions, not gaps:

- **Transcoding** — direct file-bytes playback is a stated directive.
  Adding transcoded variants would be a separate alternate path with
  explicit headers; it will not become the default.
- **ReplayGain / loudness normalization** — same reason.
- **Federation / multi-server** — Samo is a single-instance,
  self-hosted server.
- **E-books / PDFs / comics** — Samo is audio-first.
- **Public share links** — every route is authenticated by design.
  Operators who want public links can put nginx in front and proxy
  specific stream URLs.

## Deferred (not blocking v1)

Easy adds if you want them later, in rough order of effort:

| Item | Estimated effort |
|------|------------------|
| ListenBrainz scrobbling | small (same shape as Last.fm) |
| Lyrics (LRC + plain) | small (scanner parses sidecars, API returns) |
| Smart playlists (rule-based) | medium |
| Transcoded alternate stream path | medium |
| Audiobookshelf API compat | medium |
| Public share links | medium (token scoping required) |
| LDAP / OIDC | medium-large |
| Federation | large |

## API surface checklist

The native API exposes everything a client needs. From
`docs/api-integration.md`:

- ✅ Auth (login + bearer tokens + stream tokens + setup wizard)
- ✅ Catalog overview + manifest
- ✅ Music (artists/albums/tracks/playlists/genres/search/browse views)
- ✅ Audiobooks (items, contributors, series, chapters, bookmarks,
   collections, listening sessions, search)
- ✅ Podcasts (shows, episodes, RSS feeds with polling, search)
- ✅ Radio (programmed + internet, public stream/playlist URLs)
- ✅ Playback state (PUT/PATCH on every catalog kind)
- ✅ Metadata search + apply with override management
- ✅ Last.fm (link, scrobble queue, history)
- ✅ Libraries + scan jobs (admin)
- ✅ Subsonic compatibility (`/rest/*` for existing music clients)

## Bottom line

For a household replacing both Navidrome and Audiobookshelf with one
server: yes, Samo covers it. The shipped UI handles browsing and
playback for everything; the native API exposes everything a custom
client needs.

The gaps (lyrics, smart playlists, e-books, federation) are not in
the way of "use it as your main music + audiobook + podcast server."
They're future polish.
