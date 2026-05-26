# Samo Radio

Samo Radio is the first public module in the server. It exposes local media as a deterministic 24/7 station with API metadata, an M3U playlist, and a stream URL.

## Configuration

By default the server looks for `data/radio.json`. Set `SAMO_RADIO_CONFIG` to point somewhere else.

```sh
SAMO_RADIO_CONFIG=/srv/samo/radio.json go run ./cmd/samo-server
```

Each station contains a rotation of local audio files. `durationSeconds` is required because the scheduler uses it to decide what is live right now and to pace the stream.

```json
{
  "stations": [
    {
      "id": "late-night",
      "name": "Late Night Frequencies",
      "description": "Podcasts, old radio, commercials, and strange midnight archives.",
      "contentType": "audio/mpeg",
      "epoch": "2026-01-01T00:00:00Z",
      "media": [
        {
          "id": "art-bell-1997-10-23",
          "title": "Art Bell - October 23, 1997",
          "artist": "Art Bell",
          "kind": "old_time_radio",
          "path": "/srv/media/radio/art-bell-1997-10-23.mp3",
          "durationSeconds": 10800
        },
        {
          "id": "johnny-dollar-001",
          "title": "Yours Truly, Johnny Dollar",
          "kind": "old_time_radio",
          "path": "/srv/media/radio/johnny-dollar-001.mp3",
          "durationSeconds": 1800,
          "weight": 2
        }
      ]
    }
  ]
}
```

`weight` repeats an item in the rotation. A weight of `2` means the item appears twice per complete station loop.

## Endpoints

- `GET /` basic station status page
- `GET /health` process health
- `GET /api/v1/radio/stations` station list
- `GET /api/v1/radio/stations/{id}` station detail with upcoming slots
- `GET /api/v1/radio/stations/{id}/now` current slot
- `GET /api/v1/radio/stations/{id}/schedule?from=2026-01-01T00:00:00Z&limit=24` upcoming slots
- `GET /radio/{id}/playlist.m3u` M3U playlist
- `GET /radio/{id}/stream` live stream

Set `SAMO_API_TOKEN` to require `Authorization: Bearer <token>` or `X-Samo-Token: <token>` on `/api/v1/*` routes. Stream and playlist routes stay public so they can be opened directly by audio clients.

## Stream Notes

The first stream implementation is intentionally small and file-based. It opens the currently scheduled local file, seeks to an approximate byte offset based on duration, and throttles bytes so clients receive audio at roughly real time.

Use one station content type and compatible source files for now, such as MP3 files with `contentType` set to `audio/mpeg`. A later mixer/transcoder can replace the stream internals without changing the station API shape.
