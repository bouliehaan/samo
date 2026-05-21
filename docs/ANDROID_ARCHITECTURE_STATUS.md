# Android + `@samo/core` architecture status (2026-05-20)

All items from the Android architecture pass are complete. Use this doc as a health snapshot, not a backlog.

## Health checks (should be green)

```bash
cd apps/android && pnpm run verify    # tsc + eslint (mobile app only)
pnpm run typecheck:core                 # @samo/core
pnpm test                             # core + renderer (includes player-queue-actions)
cd packages/core && pnpm test         # 20 core-only tests
cd apps/android/android && ./gradlew :app:compileDebugKotlin
```

Optional formatting (not in CI yet):

```bash
pnpm exec prettier --write "apps/android/src/**/*.{ts,tsx}"
```

If the IDE Problems panel still shows noise: **reload the window** after pulling.

## Architecture map

| Layer | Location | Role |
|-------|----------|------|
| **Shell** | `apps/android/App.tsx` (~1,500 LOC) | Connect/auth, tab layout, player chrome, modals |
| **Native playback** | `use-android-native-playback.ts` | Queue refs, play, events, polling, hydration |
| **Playback controls** | `use-android-playback-controls.ts` | Toggle/seek/skip/shuffle/navigate |
| **Cast / ABS** | `use-android-cast-sync.ts`, `use-android-abs-progress-sync.ts` | Cast state, progress flush |
| **Media actions** | `use-android-media-handlers.ts` | Detail, play, queue, download, favorites, playlists |
| **Context menu** | `use-android-context-menu.tsx` | `MediaContextMenuApi`, action list, presentation |
| **State** | `apps/android/src/state/*` | Navigation, auth session, downloads, playback store |
| **Core** | `packages/core` | Server HTTP, mobile playables, cast policy |

## Renderer (shared with desktop)

| Area | Status |
|------|--------|
| **F4 store factory** | `createSubscribedTraditionalStore` — `timestamp`, `auth`, `player` stores |
| **F7 compiler** | Redundant `useMemo` removed in AudioMotion settings (schema/general/color/preset) |
| **F16 env merge** | `mergeSettingsWithEnv()` |
| **Queue tests** | `player-queue-actions.ts` + tests |

## Deferred by design

| Item | Reason |
|------|--------|
| **F8 second persisted store** | Transport/queue slices in one store are enough unless independent hydrate is needed |
| **Strict Android Prettier in ESLint** | Run `prettier --write` on `apps/android/src` first, then re-enable quote/tab rules |

## `@samo/core` boundaries

- **Put here:** server HTTP, mobile playables, cast URL policy, audio-quality predicates.
- **Keep out:** React/Zustand, Android UI, renderer routes.
- **Do not re-expand** monolithic `SamoAudioModule.kt` or duplicate ABS HTTP outside `packages/core/src/server/server-audiobookshelf.ts`.

## Cast / playback

- **Local:** `format=raw` Subsonic when applicable.
- **Chromecast:** ~96 kHz FLAC ceiling → hi-res uses transcode leg on cast URL only.
- **Auth in URL:** Subsonic creds in query → no Cast `httpHeaders` block.
