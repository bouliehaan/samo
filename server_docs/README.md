# Samo Server

A unified self-hosted listening server for music, audiobooks, podcasts, and radio.

Samo Server is not a Navidrome wrapper.
Samo Server is not an Audiobookshelf wrapper.
Samo Server is a native media server built around unified listening history, playback state, devices, queues, and cross-media browsing.

## Initial scope

V0 focuses on:

- running as a small Ubuntu-friendly Go server
- SQLite-backed metadata storage
- running a deterministic 24/7 radio station from local media
- adding local library folders
- adding podcast RSS feeds
- adding internet radio stream URLs
- optional user-initiated metadata lookup providers
- scanning music files
- exposing a Samo-native API
- streaming original audio files
- accepting playback/scrobble events
- powering Samo-native recents

## First module: Samo Radio

The first server module is a 24/7 station that rotates configured podcasts, old radio, commercials, music, or other local audio into a streamable endpoint.

- Configure stations with `SAMO_RADIO_CONFIG` or the default `data/radio.json`.
- Open `/radio/{id}/playlist.m3u` in an audio client.
- Use `/api/v1/radio/stations/{id}/now` and `/api/v1/radio/stations/{id}/schedule` for Samo-native clients.

See [docs/radio.md](docs/radio.md) for the config format and current stream behavior.

## API

Samo exposes a native `/api/v1` surface for music, audiobooks, podcasts, radio, and catalog overview data. See [docs/api.md](docs/api.md) for the first route map and metadata contracts.

Music, audiobooks, podcasts, and radio are independent first-class domains. Each has its own URL namespace (`/api/v1/music`, `/api/v1/audiobooks`, `/api/v1/podcasts`, `/api/v1/radio`) and its own DTOs — there is no shared "shelf" / longform parent. Podcast RSS feeds are added through `/api/v1/podcasts/feeds`. Internet radio streams are added through `/api/v1/internet-radio/stations` and get public M3U/redirect links for audio clients.

External metadata lookup is disabled by default and can be enabled later with `SAMO_METADATA_PROVIDERS`. See [docs/metadata.md](docs/metadata.md) for provider names and search routes.

Last.fm scrobbling is configured with `SAMO_LASTFM_API_KEY` and `SAMO_LASTFM_SHARED_SECRET`. See [docs/lastfm.md](docs/lastfm.md) for account linking and playback/scrobble behavior.

## Storage and scanning

Samo stores catalog metadata in SQLite and scans configured music, audiobook, and podcast folders using bundled `ffmpeg`/`ffprobe` on Ubuntu. See [docs/install-ubuntu.md](docs/install-ubuntu.md) for deployment layout and [docs/storage-and-scanning.md](docs/storage-and-scanning.md) for scanner environment variables.

## Philosophy

- no jank
- no fake data
- no throwaway glue-server architecture
- small boring reliable pieces
- client talks to Samo-native concepts, not backend-specific hacks
