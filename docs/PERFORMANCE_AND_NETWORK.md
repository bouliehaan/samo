# Performance & network review (Samo mobile)

This document captures a cross-platform pass focused on **Android**, with changes in **`@samo/core`** where they benefit macOS/desktop too.

## What we shipped in this pass

| Area | Change | Benefit |
|------|--------|---------|
| **Core HTTP** | `withRequestTimeout` in `getFetch()` (30s default) | Hung Subsonic/ABS requests fail fast on Android + desktop |
| **Artist detail** | Parallel `annotateSubsonicAlbumsQuality` for albums + appears-on | Shorter artist page load on Navidrome |
| **Android boot** | Single home fetch after health check (removed duplicate pre-health fetch) | One less full home fan-out on launch |
| **Android dedup** | `dedupeInFlight` for home + detail network loads | Duplicate taps / boot refresh share one in-flight promise |
| **Album detail UI** | `FlashList` for album/audiobook/podcast track lists | Large albums no longer mount hundreds of rows at once |
| **Detail artwork** | `ArtworkImage` + press-in prefetch (prior session) | Hero art reuses home disk cache |

## Android UI — remaining hotspots

1. **`App.tsx` monolith** — navigation, downloads, and home refresh still re-render five mounted tab scenes. Consider tab-level `React.memo` boundaries or moving tabs into a navigator with lazy screens.
2. **Home scroll model** — vertical `ScrollView` + per-section horizontal `FlashList` keeps inactive tabs alive. Consider one vertical `FlashList` of sections or unmounting inactive tabs after first visit.
3. **Player store ticks** — 1s position polling re-renders components using full `useAndroidPlaybackState()`. Narrow selectors (`status`, `positionMs`) in `PlayerSurface.tsx`.
4. **Download context** — global `Set` context invalidates all tiles on progress. Per-tile revision or ref-based lookups would reduce churn.
5. **`getImageColors` on fullscreen open** — CPU-heavy; defer until after expand animation or cache by artwork URL.

## Network architecture (current)

```text
Android services (home-content, media-detail, search-content)
    → @samo/core/mobile (loadMobileHomeContent*, loadMobileMediaDetail, search*)
        → server-http (getFetch → requestJson)
            → Subsonic REST / Audiobookshelf API
```

**Caching (client-side, not HTTP cache):**

- Home: `home-content-cache.ts` (disk, stale-while-revalidate)
- Detail: `media-detail-cache.ts` + in-memory LRU
- Android: `in-flight-requests.ts` coalesces duplicate fetches

**What works well:**

- Multi-server `Promise.allSettled`
- Subsonic home sections fetched in parallel
- Detail stale-while-revalidate (memory → disk → network refresh)
- Health checks parallel per server (Android 8s timeout on health only — now all REST calls have core timeout)

## Network — recommended next steps

### P0 — Resilience

1. **Retry idempotent GETs once** in `requestJson` on transient failures (timeout, network error). Exponential backoff 300–800ms. Skip for mutations.
2. **Abort on navigation** — pass `AbortSignal` from detail/home request tokens into fetch so stale responses are cancelled, not just ignored in UI.

### P1 — Efficiency

3. **Decouple hi-res badge scans from home critical path** — return home sections after list endpoints; run `annotateSubsonicHiResCollections` in a second phase and patch UI. Today `qualityScanLimit: 8` still blocks `loadAndroidHomeContent` completion.
4. **Cache quality annotations** by `(serverId, albumId)` in memory/disk to avoid re-scanning on every home refresh.
5. **Paginate `loadAllSubsonicAlbums`** with `Promise.all` on first N pages or cap concurrent page fetches.

### P2 — Speed

6. **Progressive artist detail** — return shell after `getArtist` + top songs; stream biography / appears-on / quality in follow-up state updates.
7. **HTTP/2 connection reuse** — ensure native fetch keeps connections alive per host (default on modern RN; verify no per-request custom agent breaking reuse).
8. **Smaller first paint for home** — optional `limit: 12` on cold start, then `limit: 36` refresh.

## Measuring

- Metro: filter `[nav-perf]` for overlay open, disk cache, first frame (debug instrumentation; remove when done).
- Android Studio profiler: CPU during album open (FlashList vs old `.map`).
- Server logs: count `getAlbum.view` during home load vs artist open.

## Files to know

| Topic | Path |
|-------|------|
| HTTP timeout | `packages/core/src/server/server-http.ts` |
| Artist detail | `packages/core/src/mobile/mobile-media-detail.ts` |
| Home loaders | `packages/core/src/mobile/mobile-home.ts` |
| Quality scan | `packages/core/src/mobile/mobile-subsonic-quality.ts` |
| Android detail cache flow | `apps/android/src/hooks/use-android-media-handlers.ts` |
| In-flight dedup | `apps/android/src/services/in-flight-requests.ts` |
| Album track list | `apps/android/src/screens/MediaDetailScreen.tsx` |
