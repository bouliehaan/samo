# Performance & network (Samo mobile)

Where the Android client spends time, and what it does about it. Changes live in
**`@samo/core`** wherever the desktop benefits too.

## Network architecture

```text
Android services (home-content, media-detail, search-content)
    → @samo/core/mobile (loadMobileHomeContent*, loadMobileMediaDetail, search*)
        → server-http (getFetch → requestJson)
            → Samo Server /api/v1
```

**Caching is client-side, not HTTP cache:**

- Detail: `media-detail-cache.ts` plus an in-memory LRU, stale-while-revalidate
  (memory → disk → network refresh)
- Artwork: `artwork-cache.ts`, with a user-configurable size limit
- Catalog: an on-device SQLite mirror, synced by Kotlin, so Home and Library
  derive from local data rather than the network
- `in-flight-requests.ts` coalesces duplicate fetches, so a double tap or a
  boot-time refresh shares one promise

**Resilience:**

- `withRequestTimeout` in `getFetch()` (30s default), so a hung request fails
  fast instead of hanging a surface
- Health checks run in parallel per server
- `samo-http-errors` classifies failures, so React Query retries only what a
  retry can fix — a 401 or 404 fails immediately rather than after several
  pointless attempts

## Where the time goes

The JS thread is the scarce resource. A 2s heartbeat in `App.tsx` logs whenever
it fires late (`[jank] JS thread blocked ~Ns`), and `jank-trace.ts` names the
operation responsible instead of leaving it as "render/GC/native".

The heavy synchronous pass on the render path is `getHomeDisplaySections` — it
walks every shelf of a multi-thousand-item library, and is traced by name for
exactly that reason.

**Mitigations already in place:**

- Home is a vertical `FlashList` of shelves, so only visible ones mount. Item
  types keep recycling pools homogeneous.
- Tab scenes mount once and then rest frozen (`react-freeze`), so background
  tabs cost nothing on store updates and revisiting is a thaw, not a remount.
- Filter pills update urgently while the section rebuild follows a deferred
  copy, so a filter tap flips immediately instead of blocking on a re-render.
- Dense catalog grids decode artwork as RGB_565 (`decodeFormat="rgb"`), which is
  what took the big browse grids off the bitmap-upload jank.
- Post-sync derives run behind `InteractionManager`, and are deferred entirely
  while backgrounded, so a long listening session with the screen off never
  burns seconds of JS thread on surfaces nobody can see.
- Animation runs on the UI thread (see `theme/motion.ts`), so transitions are
  unaffected by whatever the JS thread is doing.

## Remaining hotspots

1. **Player store ticks** — 1s position polling re-renders anything reading the
   full playback state. Narrow selectors where it still happens.
2. **`getImageColors` on fullscreen open** — CPU-heavy. Defer past the expand
   animation, or cache by artwork URL.
3. **Abort on navigation** — request tokens are checked on arrival, but the
   fetch itself is not cancelled. Threading an `AbortSignal` through would stop
   paying for responses nobody will read.
4. **Retry idempotent GETs once** in `requestJson` on transient failures
   (timeout, network error), 300–800ms backoff. Mutations must not retry.

## Measuring

- `adb logcat -s ReactNativeJS` and watch for `[jank]`
- Android Studio profiler: CPU during a detail open
- Server logs: request count during a home load versus a detail open

## Files to know

| Topic | Path |
|-------|------|
| HTTP timeout + error classification | `packages/core/src/server/server-http.ts` |
| Detail loaders | `packages/core/src/mobile/mobile-media-detail.ts` |
| Home loaders | `packages/core/src/mobile/mobile-home.ts` |
| Jank breadcrumbs | `apps/android/src/services/jank-trace.ts` |
| In-flight dedup | `apps/android/src/services/in-flight-requests.ts` |
| Home rendering | `apps/android/src/screens/home/HomeContent.tsx` |
| Detail rendering | `apps/android/src/screens/MediaDetailLoaded.tsx` |
| Motion constraints | `apps/android/src/theme/motion.ts` |
