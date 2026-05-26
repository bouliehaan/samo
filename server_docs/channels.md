# Samo Channels

Channels are Samo's personal 24/7 programmed radio. A channel pulls
from a mix of source kinds (podcast subscriptions, local file pools,
internet radio cut-ins) and a scheduler decides what plays next based
on time-of-day rules. ffmpeg transcodes every source through a single
codec/bitrate so podcast → commercial → live NPR all mux into one
continuous output that feels like real radio — not a glorified
playlist.

Channels live alongside the existing `radio_stations` loop concept
but are a distinct domain: stations are deterministic rotations,
channels are intelligently programmed streams.

## Mental model

You compose a channel from three layers:

1. **Sources** — what the channel can play. Each source is one of:
   - `file-pool` — local files (commercials, bumpers, music libraries)
   - `podcast-subscription` — auto-rotate fresh episodes of a podcast
     already added under PODCASTS
   - `internet-station` — reuse an existing internet radio station
     (the station's URL is the source of truth)
   - `live-stream` — a raw HTTP/HTTPS stream URL (no catalog row)

2. **Schedule rules** — time windows that pin a specific source to a
   weekday + minute-of-day range. When a rule's window is active, the
   scheduler bypasses rotation and plays the rule's source until the
   window ends. Higher priority wins when multiple rules overlap.

3. **Rotation** — the fallback pool. Sources with
   `default_rotation = true` play when no rule is currently active.
   Weighted random selection biased away from recently-played items.

## Quick start

1. Open `/app#radio`, you'll land on **CHANNELS** (the default
   sub-mode). Click **+ NEW CHANNEL**, name it, pick a codec.
2. On the channel detail page, add at least one source.
   File-pool is the simplest — drop in `/srv/media/commercials`.
3. (Optional) Add a schedule rule. Pick the source, set the day mask
   (EVERY DAY / WEEKDAYS / WEEKENDS / single day), HH:MM start + end,
   and a priority. The 7-day timeline visualises rule windows in real
   time with a vertical NOW indicator.
4. Click **TUNE IN**. The bottom player dock connects to the channel
   stream. First listener spins up ffmpeg; last listener leaving tears
   it down.

## Source kinds

### file-pool

```json
{ "paths": ["/srv/media/commercials", "/srv/media/oldies/*.mp3"] }
```

Paths can be:

- Absolute file paths
- Directory paths (scanned one level deep, hidden files skipped)
- Shell globs (`*.mp3`, `[ab]*.flac`, etc.)

The scheduler prefers files not played in the lookback window
(default 4 hours). Once everything in the pool has been played, it
falls back to the longest-since-played file.

### podcast-subscription

```json
{ "podcastId": "podcast_abc123", "maxAgeDays": 30 }
```

The channel plays the freshest unplayed episode of the configured
podcast. Episodes older than `maxAgeDays` are skipped so the channel
doesn't resurface ancient back-catalog material. If a cached enclosure
is available (via `internal/podcastcache`), the local path is used;
otherwise the enclosure URL is streamed live.

### internet-station

```json
{ "stationId": "internet-radio_xyz789" }
```

References an existing internet radio station by id. The scheduler
resolves the station's `streamUrl` at play time so editing the
station automatically propagates to every channel using it. The item
is marked `live: true` so ffmpeg doesn't double-pace it.

### live-stream

```json
{ "url": "https://npr.example.com/live.mp3" }
```

A raw URL — no catalog row. Use this when you don't want to register
the station for general use (one-off, experimental, or restricted
streams). The catalog-backed `internet-station` kind is generally
preferred.

## Schedule rules

A rule has:

- **Source** — the source to play during the window
- **Days** — bitmask (Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32,
  Sat=64). Presets in the UI: EVERY DAY (127), WEEKDAYS (62),
  WEEKENDS (65), or any single day.
- **Window** — `start_minute` and `end_minute` (0–1440 minute-of-day).
  Cross-midnight? Add two rules (one per side).
- **Priority** — higher wins when windows overlap. Default 100.
- **Enabled** — disable without deleting.

When a rule fires, the scheduler caps the picked item's
`MaxDuration` at the time remaining in the rule window. A 60-minute
podcast picked at 16:30 inside a 17:00 boundary will play for 30
minutes then yield.

### On-the-hour preemption

While a rule's window is active, the streamer re-checks the scheduler
every 15 seconds. If a higher-priority rule has just become active
mid-track, the current ffmpeg subprocess is killed and the next pick
takes over. This is what makes "NPR cuts in at 16:00" feel live
instead of "NPR starts whenever the previous song happened to end."

Rule-driven items are exempt from their own preemption check (they
won't preempt themselves), and the watchdog ignores transitions where
the new pick has the same source as the current item (avoids audible
pops on rule changes that don't actually change content).

## Data model

```
channels                 channel_sources              channel_schedule_rules
  id                       id                           id
  name                     channel_id ──┐               channel_id ──┐
  description              kind         │               source_id ─→┐│
  codec / bitrate          label        │               label       ││
  sample_rate_hz           config_json  │               weekday_mask││
  enabled                  enabled      │               start_minute││
  created_at               weight       │               end_minute  ││
  updated_at               default_rotation              priority   ││
                           created_at                    enabled    ││
                           updated_at                    created_at ││
                                                                    ↓↓
channel_play_log
  id              ──ON DELETE CASCADE──┘ (when channel goes, all this goes)
  channel_id
  source_id
  item_ref           ← what the scheduler hands the streamer
  title / artist / kind
  started_at / ended_at
  duration_seconds
```

The scheduler reads recent `item_ref` values from `channel_play_log`
to suppress repeats. File-pool items use the absolute path as their
ref; podcast subscriptions use `episode:<id>`; internet stations use
`station:<id>`; raw live streams use `stream:<url>`.

Migration: [`migrations/020_channels.sql`](../migrations/020_channels.sql).

## Streaming pipeline

```
listener HTTP GET /channels/{id}/stream?stream_token=...
      │
      ▼
api.channelStream — attach to per-channel broadcaster
      │
      ▼ first listener wakes the goroutine
channelStreamer.loop:
   for {
     item := scheduler.NextItem(channel)
     ffmpeg -i <item.url> ... -c:a libmp3lame -b:a 192k -f mp3 -
        ↓ stdout
     broadcaster.fanOut → all attached listeners
        ↑ preemption watchdog (every 15s) kills ffmpeg
          when a higher-priority rule activates
   }
      ▲ last listener leaves → streamer teardown
```

One ffmpeg subprocess per channel. Slow listeners get dropped (a
non-blocking send into a buffered channel; if it fills, the listener
is removed). The broadcaster ships live bytes only — no historical
backfill on connect.

## API

Admin (requires admin role):

| Method | Path | Notes |
|---|---|---|
| `GET`   | `/api/v1/channels` | All users can list |
| `POST`  | `/api/v1/channels` | Create channel |
| `GET`   | `/api/v1/channels/{id}` | Hydrated with sources + rules |
| `PATCH` | `/api/v1/channels/{id}` | Restarts streamer on codec change |
| `DELETE`| `/api/v1/channels/{id}` | Cascades sources/rules/log |
| `GET`   | `/api/v1/channels/{id}/sources` | |
| `POST`  | `/api/v1/channels/{id}/sources` | |
| `PATCH` | `/api/v1/channels/{id}/sources/{sourceId}` | |
| `DELETE`| `/api/v1/channels/{id}/sources/{sourceId}` | |
| `GET`   | `/api/v1/channels/{id}/schedule` | |
| `POST`  | `/api/v1/channels/{id}/schedule` | |
| `DELETE`| `/api/v1/channels/{id}/schedule/{ruleId}` | |
| `POST`  | `/api/v1/channels/{id}/preview` | Run scheduler once without ffmpeg |

Stream (any authenticated user; `?stream_token=` supported for
browser `<audio>` tags):

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/channels/{id}/now` | Current item + listener count + recent |
| `GET` | `/api/v1/channels/{id}/recent?limit=N` | Play log |
| `GET` | `/channels/{id}/playlist.m3u` | M3U pointing at the stream |
| `GET` | `/channels/{id}/stream` | The audio bytes (one long pipe) |

## Example: "personal NPR drive time"

You want NPR's All Things Considered at 4–5pm on weekdays, your
favourite podcasts in rotation otherwise, and 2000s Twin Cities
commercials as filler.

1. Add an internet radio station for NPR's MP3 stream
   (`/app#radio` → INTERNET → + NEW STATION). Note its id.
2. Add a podcast feed for each podcast you like
   (`/app#podcasts` → + NEW PODCAST). Wait for the feed to poll.
3. Drop your commercials into `/srv/media/commercials`.
4. Create a channel "Drive Home".
5. Add sources:
   - **file-pool** "Commercials" pointing at `/srv/media/commercials`
     (rotation: ON, weight 1)
   - **podcast-subscription** for each podcast (rotation: ON, weight 3)
   - **internet-station** "NPR Live" picking the NPR station
     (rotation: OFF — only fires during its scheduled window)
6. Add schedule rule:
   - source: NPR Live
   - days: WEEKDAYS
   - 16:00 → 17:00
   - priority: 200
7. Click TUNE IN. The channel plays podcasts + commercials all day,
   then at 16:00 the preemption watchdog notices the rule fired and
   cuts to NPR. At 17:00 ATC's window closes and rotation resumes.

## Implementation notes

- **Package**: `internal/channels`. Owns types, store, scheduler,
  streamer, service. API handlers live in `internal/api/channel_handlers.go`.
- **No god types**: `Channel`, `Source`, `ScheduleRule`, `PlaybackItem`,
  `NowPlaying`, `PlayLogEntry` are all narrow. Source kinds are strings
  with constants in `types.go`; new kinds are added by extending the
  resolver switch in `scheduler.go`.
- **Dependency injection**: `Dependencies` bundles the catalog/cache/
  internet-station readers as interfaces. Nil readers degrade
  gracefully (the relevant source kind just fails to resolve and the
  scheduler moves on).
- **Timestamps**: `parseStoredTime` accepts both RFC3339 and the
  SQLite `CURRENT_TIMESTAMP` format so legacy rows survive.
- **Tests**: `scheduler_test.go` covers rule priority + weekday +
  window matching, recently-played suppression, podcast freshness,
  internet-station resolution, rule-vs-rotation precedence, and rule
  tagging (so the preemption watchdog can trust `IsRuleDriven` /
  `RuleID`).

## Future work

- **On-the-clock alignment** for live cut-ins (start exactly at
  16:00:00 rather than within 15s)
- **Bumper/transition** support — short audio between rule changes
- **HLS output** for clients that prefer it over raw MP3 over HTTP
- **Per-source dayparting** — finer-grained weight schedules without
  needing a full rule
- **Channel sharing / public flag** — drop the auth requirement so
  channels can be shared with friends as personal radio stations
- **Listener history view** — UI to browse the play log across days
