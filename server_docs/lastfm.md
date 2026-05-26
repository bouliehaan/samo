# Last.fm Scrobbling

Samo sends music listens to Last.fm from the server. Clients report playback through the native Samo API; Samo applies Last.fm listen rules, queues failures, and retries in the background.

## Enable

Create API credentials at [last.fm/api/account/create](https://www.last.fm/api/account/create), then add them in Settings -> Account -> Last.fm API Credentials. Operators can also set:

```sh
SAMO_LASTFM_API_KEY=your-api-key
SAMO_LASTFM_SHARED_SECRET=your-shared-secret
```

Optional:

```sh
SAMO_LASTFM_POLL=true
SAMO_LASTFM_POLL_TICK=1m
```

Startup logs show `last.fm scrobbling: enabled` when credentials are active. Credentials saved through the UI take effect without restarting.

## Link an account

All routes require the caller's Samo user token (`Authorization: Bearer ...` or `X-Samo-Token`). Each Samo user links their own Last.fm account; scrobbles and queue/history are scoped to that user.

1. `POST /api/v1/lastfm/auth/begin`

   Returns `{ "authUrl", "token" }`.

2. Open `authUrl` in a browser and approve Samo.

3. `POST /api/v1/lastfm/auth/complete`

   ```json
   { "token": "<token from step 1>" }
   ```

4. `GET /api/v1/lastfm/status` should report `"connected": true`.

Disconnect with `DELETE /api/v1/lastfm/auth/session`.

## How listens are submitted

Samo scrobbles using standard Last.fm thresholds:

- minimum listen time: 30 seconds, or full track length when shorter than 30 seconds
- scrobble threshold: half the track duration or 4 minutes, whichever is lower
- `completed: true` on a playback update scrobbles once the minimum listen time is met

### Automatic triggers

| Source | When |
|--------|------|
| `PATCH /api/v1/playback/music-track/{id}` | progress updates, play/skip counters, favorite/star changes |
| `PUT /api/v1/playback/music-track/{id}` | full playback state writes |
| `GET /api/v1/music/tracks/{id}/stream` | stream start / resume (now playing) |
| `GET /rest/stream` (Subsonic) | stream start / resume (now playing) |
| `POST /api/v1/scrobble/events` | explicit client events |
| Subsonic `scrobble` / `updateNowPlaying` | compatibility clients |

### Explicit scrobble events

```json
POST /api/v1/scrobble/events
{
  "trackId": "track-id",
  "event": "start",
  "progressSeconds": 0
}
```

Events:

- `start` — begin a listen session and send now playing
- `progress` — evaluate now playing / scrobble thresholds
- `complete` — scrobble when minimum listen time is met
- `skip` — abandon the current listen session without scrobbling

Optional fields: `durationSeconds`, `startedAt` (RFC3339 timestamp used for the scrobble time).

### Love / unlove

When a music track becomes favorited or starred through playback updates, Samo calls Last.fm `track.love`. Clearing favorite and starred calls `track.unlove`.

## Queue, history, and recovery

Failed upstream calls are stored in SQLite and retried by the background poller.

| Route | Purpose |
|-------|---------|
| `GET /api/v1/lastfm/queue` | pending submissions |
| `GET /api/v1/lastfm/history` | local audit log of submitted/queued/failed attempts |
| `POST /api/v1/lastfm/queue/flush` | manual retry |

If Last.fm rejects the stored session key, Samo clears the linked account and requires re-auth.

## Metadata

Scrobbles include artist, track, album, duration, and MusicBrainz recording ID when present on the catalog track.

## Current limits

- one linked Last.fm account per Samo user (not per device)
- scrobbling is music-track only (not audiobooks, podcasts, or radio)
- listen timing comes from client-reported progress or stream resume position, not byte-count inference mid-stream

See also [docs/api.md](api.md).
