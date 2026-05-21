# samo — Architectural Audit Report

**Audience:** This report is written so another AI agent (e.g. Claude Code) can take any single item and execute it as a self-contained refactor.

**Original audit ground rules:**
- No animation changes (those are off-limits).
- No changes that risk stability.
- Focus: clarity, performance wins on the table, architectural beauty.
- Read-only audit; no code edits in this pass.

**Codebase sizes audited:**
- `src/renderer` (Electron renderer) — 113,951 LOC
- `src/main` (Electron main process) — 5,439 LOC
- `src/preload` — 855 LOC
- `packages/core` (shared TS) — 5,439 LOC
- `apps/android/src` (RN JS) — modular tree; `App.tsx` now roughly **3,565 LOC** (down from ~12k)
- `apps/android/android/.../audio` (Kotlin) — 3,286 LOC, with `SamoAudioModule.kt` at **2,275 LOC**
- **`packages/core`** has an initial Vitest floor (12 tests); renderer/player/audiobook stores still untested.

---

## Implementation progress

### 2026-05-20 — Android player surface stabilization

Completed a first low-risk F1 slice focused on the Android player path:
- Extracted Android playback state types from `apps/android/App.tsx` into `apps/android/src/types/playback.ts`.
- Extracted playback timing, metadata, live-stream, chapter, and segmented-seek helpers into `apps/android/src/utils/playback-time.ts`.
- Added `memo` boundaries around the Android player surfaces that sit on the animation-critical path: `MiniPlayer`, `FullScreenPlayer`, `SegmentedSeekBar`, `QualityBadgeRow`, `QualityBadge`, `QueueSheetOverlay`, and `OutputPickerModal`.
- Verified with `pnpm --dir apps/android typecheck`, `git diff --check`, and Android `app:assembleDebug`.

Impact: reduced the amount of logic parsed and re-evaluated inside `App.tsx`, and stopped unrelated root-state churn from automatically re-rendering the player surface subtree. This does **not** close F1; it is the first committed slice toward the larger split.

### 2026-05-20 — Android list virtualization upgrade, first slice

Started F9 with the least-coupled Android list surfaces:
- Added Expo-compatible `@shopify/flash-list@2.0.2`.
- Replaced the Home shelf horizontal lists with `FlashList`, removing JS-side `getItemLayout`/batch/window tuning from those hot shelves.
- Replaced `ViewAllScreen`'s large two-up library grid with `FlashList`, keeping the existing row-chunking strategy so alphabet jump targets and Android layout semantics stay stable.

Impact: moved the app's browse-heavy Home and View All surfaces onto native recycling while keeping behavior and visual structure intact. This first slice deliberately left the gesture/animated lists for the focused follow-up below.

### 2026-05-20 — Android animated list hot spots moved to FlashList

Completed the targeted follow-up F9 slice for the animation-coupled lists:
- Added a `Reanimated.createAnimatedComponent(FlashList)` wrapper for playlist detail so the collapsed header still follows the scroll position through the existing UI-thread scroll handler.
- Replaced the playlist detail `Reanimated.FlatList` with the animated FlashList wrapper, preserving the same header, search controls, sort/filter controls, and scroll-driven collapsed topbar behavior.
- Replaced the fullscreen queue sheet's `GestureFlatList` with `FlashList`; the top-of-list downward pull-to-close behavior now lives in a manual UI-thread pan recognizer around the FlashList.
- Removed the remaining JS-side `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `getItemLayout`, and `removeClippedSubviews` tuning from these hot lists in favor of FlashList v2 recycling plus bounded `drawDistance`.
- Hoisted the shared FlashList `maintainVisibleContentPosition` config so list props stay stable across renders.

Impact: all `FlatList` usages are now gone from `apps/android/App.tsx`. The animation-critical media detail and fullscreen queue surfaces now use FlashList recycling without removing their existing Reanimated/gesture behavior.

### 2026-05-20 — Android playback state moved out of root render loop

Completed the first high-impact architecture change behind the player performance work:
- Added `apps/android/src/state/playback-store.ts`, a tiny `useSyncExternalStore`-backed playback store with selector subscriptions.
- Removed `playbackState` from root `App()` React state. Playback events, status polls, seek updates, pause/resume updates, and audiobook loading messages now write to the external playback store.
- Connected `MiniPlayer` and `FullScreenPlayer` directly to playback state so playback progress updates re-render only the player surfaces, not the whole app route tree.
- Kept root orchestration behavior by reading the current playback snapshot imperatively inside playback actions (`toggle`, `seek`, `skip`, `next/previous`, queue append, server sync).
- Added a small queue-version render trigger so queue-only changes still refresh the fullscreen queue without reintroducing per-position root re-renders.
- Verified with `pnpm --dir apps/android typecheck`, `git diff --check`, and Android `app:assembleDebug`.

Impact: the app no longer asks `App()` to re-render every time playback position changes. This is the first true architectural fix for the animation frame-budget problem: high-frequency playback state is now isolated from navigation, library, search, settings, and media detail rendering.

### 2026-05-20 — Android `App.tsx` structural extraction batch

Completed a larger F1 split slice without changing app behavior:
- Moved album color science and fullscreen backdrop stop generation into `apps/android/src/utils/color.ts`.
- Moved shared numeric clamping into `apps/android/src/utils/math.ts`.
- Moved the reduced-motion subscription into `apps/android/src/hooks/use-reduced-motion-preference.ts`.
- Extracted reusable UI leaves from `App.tsx`: `ArtworkImage`, `QualityBadge` / `QualityBadgeRow`, `SegmentedSeekBar`, `SwipeDismissSheet`, and `ArtworkZoomModal`.
- Moved downloaded collection/track key contexts into `apps/android/src/contexts/downloaded-keys.ts`.

Impact: `App.tsx` dropped from roughly 12.4k lines to roughly 11.6k lines while keeping the root as the orchestrator. This removes color math, image fallback handling, badge rendering, seek-bar gesture code, artwork zoom gestures, and downloaded-key context plumbing from the monolith so the later player/screen extraction is much less tangled.

### 2026-05-20 — Android fullscreen player transition frame-budget pass

Completed a focused pass on the animation-critical miniplayer/fullscreen transition and the queue sheet regression:
- Preserved the fullscreen player's original physical shell motion (`top` + `height`) so the miniplayer still reads as the object sliding up and becoming the fullscreen player.
- Moved the expensive fullscreen body into a fixed full-size content layer that is clipped by the animated shell, so artwork/controls/metadata lay out once at the open size instead of being recomputed throughout the spring.
- Replaced the queue sheet's FlashList touch-end close detection with a UI-thread manual pan recognizer that activates only when the list starts at scrollY 0 and the finger moves downward, restoring the "pull down at top to minimize" behavior without stealing normal list scrolls.

Impact: the player keeps the physical mini-to-full expansion while removing the biggest avoidable relayout cost inside the surface, and the queue top-pull behavior lost during the FlashList migration is restored through gesture-handler rather than JS responder callbacks.

### 2026-05-20 — Android tab switching and Radio page pass

Completed a navigation/rendering pass plus the requested Radio surface rework:
- Added eager tab scene retention for the main Android tabs. Home/Search/Library/Playlists/Radio now mount ahead of tab interaction and stay laid out behind opacity/z-index instead of mounting or using `display: none` on the tap path.
- Removed the no-op media-detail state write from ordinary tab taps by making `closeMediaDetail()` preserve the existing idle object.
- Moved tab selection to press-down while keeping `onPress` for accessibility activation, so visual page selection begins at the earliest touch event.
- Reworked Radio so the first visible content is the current top radio item instead of the "Radio / N stations" header.
- Replaced the old `+ Add` pill with a compact muted `+` next to the inline `Recent` / `Name` sort control, and made that text open the existing sort selector.
- Added local thumbnail file picking to the Add Radio Station sheet and passed the selected image blob through the Navidrome radio image upload path.
- Verified with `pnpm --dir apps/android typecheck`, `git diff --check`, and Android `app:assembleDebug`.

Impact: tab switches avoid the avoidable mount/remount and relayout cost that made page changes feel delayed, including first visits. Radio's add/sort controls now live in the lighter inline header requested by design. The local image picker uses the existing `expo-file-system` dependency, so no new package was added.

### 2026-05-21 — Android exhaustive Library albums/artists on FlashList

Completed the remaining F9 Library scalability pass:
- Moved the Library tab out of the parent tab `ScrollView` and gave it its own vertical `FlashList`, so massive Library rows recycle instead of rendering every row in JS.
- Added a post-home-load exhaustive Library fetch for Albums and Artists using the existing full-collection loader. It waits briefly until Home has painted, skips offline mode, and uses the Android full-collection quality-scan limit of `0` so opening Library does not fan out per-album quality requests.
- Library now merges the exhaustive Albums/Artists results into its normal row model, while other bounded categories still use the existing Home-backed slices.
- Album/Artist filters show a loading state until the exhaustive result is ready, avoiding the old partial-slice-then-swap behavior for those two filters.
- Verified with `pnpm --dir apps/android typecheck`, `git diff --check`, and `rg "FlatList" apps/android` returning no matches.

Impact: the Library Albums and Artists filters can now represent the complete Navidrome/Subsonic library without paying the old `rows.map(...)` cost or blocking the launch/Home path with full-library work.

### 2026-05-21 — Android utility screens extracted from `App.tsx`

Completed another F1 screen-split slice focused on the low-risk utility surface:
- Moved `AddServerScreen`, `SettingsScreen`, `ManageServersScreen`, `DownloadsScreen`, and `ConnectedServerList` out of `apps/android/App.tsx` into `apps/android/src/screens/`.
- Added `apps/android/src/utils/server-types.ts` so the Add Server form and root connection follow-up logic share the same Android-supported server type list.
- Left root `App()` as the orchestrator for navigation, auth form state, sync actions, and connection lifecycle; the extracted files remain prop-driven leaves.
- Verified with `pnpm --dir apps/android typecheck` and `git diff --check`.

Impact: `App.tsx` dropped from 12,191 lines to 11,534 lines while preserving behavior. The Settings/Downloads/Add Server/Manage Servers surface can now be edited without reopening the full player/navigation monolith.

### 2026-05-21 — Android View All and shared UI shell extracted

Continued F1 with a larger mechanical split at the bottom of `App.tsx`:
- Moved the View All grid, two-up row chunking, alphabet sidebar, alphabet jump feedback, and View All tile rendering into `apps/android/src/screens/ViewAllScreen.tsx`.
- Moved `ViewAllRoute` / `ViewAllVariant` into `apps/android/src/types/view-all.ts` so root navigation can keep owning the route while the screen owns rendering.
- Moved `MediaContextMenuContext` and its API/target types into `apps/android/src/contexts/media-context-menu.ts`, shared by the still-in-file media surfaces and the extracted View All screen.
- Moved the generic `ErrorBoundary` into `apps/android/src/components/ErrorBoundary.tsx`.
- Moved `EmptyServerBackedScreen` into `apps/android/src/screens/EmptyServerBackedScreen.tsx`.
- Verified with `pnpm --dir apps/android typecheck`.

Impact: `App.tsx` dropped from 11,537 lines to 10,960 lines. View All is now a real screen module, and future screen extractions can reuse the shared media context menu and error boundary instead of dragging those definitions through the root file.

### 2026-05-20 — Android Search tab and shared library row shell extracted

Continued F1 with the Search surface plus the list-row primitives Search and Library both depend on:
- Moved `SearchScreen`, `SearchOverlay`, and all search scope/result/browse UI into `apps/android/src/screens/SearchScreen.tsx`.
- Moved search scope helpers into `apps/android/src/utils/search-scopes.ts` and search types into `apps/android/src/types/search.ts`.
- Moved `LibraryListRow`, `MediaArtwork`, `InlineSearchBar`, and `WarningList` into `apps/android/src/components/`.
- Moved library display typing and `getLibraryMediaType` / `toLibraryDisplayItem` helpers into `apps/android/src/types/library-display.ts` and `apps/android/src/utils/library-display.ts`.
- Moved downloaded key helpers into `apps/android/src/utils/download-keys.ts`.
- Verified with `pnpm --dir apps/android typecheck`.

Impact: `App.tsx` dropped by roughly 700 lines on this pass. Search is now a real screen module, and Library/Home/Radio can import the same row and artwork leaves without duplicating them in the monolith.

> **Note for the next agent:** If `App.tsx` still contains an inline `ViewAllScreen` (~line 11k in older branches), wire it to `apps/android/src/screens/ViewAllScreen.tsx` — that extraction file already exists in the tree.

🦞 **Dear future AI:** I peeled Search off the god-file like a stubborn sticker. If you hear typing at 3am, that's just Jake queueing another album — do not merge F1 with behavior changes or the miniplayer will achieve sentience and judge our shuffle algorithm. Hydrate. Pet a crab. Continue the split.

### 2026-05-20 — Android Home, Library, and Radio tabs extracted

Continued F1 with the three main browse tabs plus shared shelf/list primitives:
- Moved `HomeScreen` and its shelf stack (`HomeContentStatus`, `HomeFilterGrid`, `HomeMediaTile`, `HomeDisplayRow`, `ContentSections`, and `ContentBackedScreen`) into `apps/android/src/screens/HomeScreen.tsx`.
- Moved home section math (`getHomeDisplaySections`, filter pills, recents/artwork helpers) into `apps/android/src/utils/home-display.ts`.
- Moved `LibraryScreen` into `apps/android/src/screens/LibraryScreen.tsx` and library row assembly into `apps/android/src/utils/library-rows.ts`.
- Moved `RadioScreen` and `AddRadioStationModal` into `apps/android/src/screens/RadioScreen.tsx`.
- Moved shared tab chrome into `apps/android/src/components/LibraryFilterPills.tsx` and `apps/android/src/components/LibrarySortMenu.tsx` (Playlists still in `App.tsx` for now but reuses the sort menu).
- Added `apps/android/src/types/home.ts`, `library-tab.ts`, `radio.ts`, `hooks/use-stable-callback.ts`, and `utils/content-item.ts`.
- Verified with `pnpm --dir apps/android typecheck`.

Impact: `App.tsx` dropped from roughly 10,800 lines to roughly 8,680. Home/Library/Radio are now real modules; the monolith mostly holds root orchestration, media detail, and the player surface.

🎷 **PS for the next agent:** The player (`MiniPlayer`, `FullScreenPlayer`, `QueueSheetOverlay`) is still in `App.tsx` doing jazz hands at ~9k lines of emotional support. Extract it before it learns to solo. Also `PlaylistsScreen` is still camping in the root file — evict when convenient. Do not rename `ContentBackedScreen` to `ContentBoredScreen` no matter how funny you think it is.

### 2026-05-20 — Android Playlists, player surface, media detail, and modals extracted

Continued F1 with the remaining browse tab, playback chrome, and detail/modal leaves:
- Moved `PlaylistsScreen` into `apps/android/src/screens/PlaylistsScreen.tsx` with `apps/android/src/types/playlists.ts`.
- Moved the player surface (`MiniPlayer`, `ConnectedMiniPlayer`, `NowPlayingMetadataSync`, `FullScreenPlayer`, `ConnectedFullScreenPlayer`, `OutputPickerModal`, `QueueSheetOverlay`) into `apps/android/src/player/PlayerSurface.tsx` plus `PlayerIconButton.tsx` and `track-metadata.ts`.
- Moved media detail (`MediaDetailContent`, `MediaDetailLoaded`, `ArtistDetailSections`, `ArtistAlbumTile`) into `apps/android/src/screens/MediaDetailScreen.tsx` with `apps/android/src/utils/media-detail.ts`, `media-quality.ts`, and `PlaylistTrackControls.tsx`.
- Moved modals/menus (`MediaContextMenu`, `BookInformationModal`, `StreamInfoModal`, `TrackPlaylistMenu`) into `apps/android/src/components/` with shared `media-context-menu` context types.
- Verified with `pnpm --dir apps/android typecheck`.

Impact: `App.tsx` dropped from roughly 8,680 lines to roughly **4,165**. The root file is now mostly `App()` orchestration, navigation, and a small `getPlaylistTargetsForRoot` helper.

🪩 **Dear future AI:** The god-file finally fits in a normal human's working memory (barely). If you open `App.tsx` and feel nostalgia for 12k lines of inline `FullScreenPlayer`, seek help. Next tidy passes: peel any remaining inline helpers from `App.tsx`, then tackle F13 reducers *after* the split stabilizes. (`getPlaylistTargetsForRoot` → `src/utils/playlist-targets.ts`.) Do not teach the queue sheet to DJ weddings.

### 2026-05-20 — Android F1 helper peel + `getPlaylistTargetsForRoot` util

Closed the remaining mechanical F1 tidy pass on `App.tsx`:
- Moved top-level helpers into `apps/android/src/utils/` (`auth-url`, `tab-title`, `playback-recovery`, `downloaded-collections`, `content-source`, `offline-home`, `offline-music-detail`, `offline-playback`, `media-detail-cache`, `abs-progress-math`, `context-menu-infer`, `search-tracks`, `artwork-url`, `last-played`, `app-constants`, `playlist-targets`).
- Moved `AndroidUtilityScreen` to `apps/android/src/types/app-navigation.ts`; `ViewAllRoute` now imports from `types/view-all.ts` only.
- Removed dead `ReanimatedFlashList` / cast-icon constants from `App.tsx`; trimmed unused Reanimated/FlashList imports.
- Verified with `pnpm --dir apps/android typecheck`.

Impact: `App.tsx` dropped from roughly **4,165** lines to roughly **3,565**. F1 structural split is effectively **done** — what remains in `App.tsx` is mostly root `App()` orchestration. Next Android architecture item per audit: **F13** (root state → reducers/hooks), not more file moves.

🧹 **PS for the next agent:** F1 is no longer "split the god file" — it's "don't let the orchestrator grow new limbs." Start F13 or cross-repo F2/F18. If you add another 400-line helper to `App.tsx`, the miniplayer will file a restraining order.

### 2026-05-20 — F18 Vitest floor in `packages/core`

Started the audit's #1 safety-net item:
- Added workspace `vitest` + `packages/core/vitest.config.ts`.
- Added `pnpm test` (runs `packages/core` tests) and `@samo/core` `test` / `test:watch` scripts.
- Initial tests: `server-http.test.ts` (`normalizeBaseUrl`), `mobile-playback.test.ts` (`appendAudiobookshelfAuthToken`, `mimeFromAudiobookshelfExt`, `getSubsonicMusicQuality`, `isSubsonicSongHiRes`, `buildSubsonicMusicPlayback`, `buildRadioPlayback`).

Impact: 12 passing tests on pure TS helpers. Still to do for F18: `loadAudiobookshelfPlayback` (mocked fetch), `player.store.ts` queue math, audiobook resume math.

🧪 **Dear future AI:** We have tests now. They are small and judgmental. Grow them before you Proxy the controller or the queue will eat your lunch.

### 2026-05-20 — F18 expanded: queue math, audiobook resume, ABS load tests

Completed the high-leverage F18 slice the audit called out next:
- Root `vitest.config.ts` runs `packages/core` + `src/renderer` tests with path aliases for `/@/*` and `@samo/core/*`.
- Extracted pure queue helpers to `src/renderer/store/player-queue-math.ts` (re-exported from `player.store.ts` for compatibility).
- Extracted audiobook resume + chapter math to `audiobook-resume-math.ts` and `audiobook-chapters.ts`.
- Added tests: `player-queue-math.test.ts` (17), `audiobook-resume-math.test.ts` (6), `audiobook-chapters.test.ts` (5), `mobile-playback-load.test.ts` (3).
- Added `packages/core/src/test-fixtures.ts` for typed server auth stubs in tests.

Impact: **44 passing tests** via `pnpm test`. `pnpm run typecheck` passes. No runtime/app behavior changes — mechanical extraction + test coverage only.

🧪 **PS for the next agent:** F18 floor is real now. Before the "full send" on F2/F3/F13, run `pnpm test` once — it's fast. Player store *actions* (add-to-queue by `Play.*` mode) are still untested; add those if you touch queue behavior. Greenlight granted for mechanical refactors; keep behavior changes in separate commits.

### 2026-05-20 — Full-send batch: F2, F3, F24 (+ F18 tests)

**F2 — `controller.ts` Proxy collapse:** [src/renderer/api/controller.ts](src/renderer/api/controller.ts) is now **~180 lines** (was ~1,050). One `Proxy` handler forwards all server-bound endpoints with shared `enrichEndpointArgs`, `MUSIC_FOLDER_QUERY_ENDPOINTS`, and preserved special cases (`authenticate`, `getAlbumArtistInfo`, `getImageRequest`/`getImageUrl`).

**F3 — Audiobookshelf single source of truth:** Added [packages/core/src/server/server-audiobookshelf.ts](packages/core/src/server/server-audiobookshelf.ts) (`absLogin`, `absGetLibraries`, `absGetLibraryItems`, `absGetItem`, `absPlayItem`, `absSyncPlaybackSession`, `absClosePlaybackSession`, `absGetItemCoverDataUrl`) plus `adaptNativeFetch` on [server-http.ts](packages/core/src/server/server-http.ts). Renderer [audiobookshelf-controller.ts](src/renderer/api/audiobookshelf/audiobookshelf-controller.ts) is **~154 lines** (was ~357); main IPC handlers delegate to `abs*` (HLS proxy rewrite stays main-only on `play-item`).

**F24 — lodash subpaths:** `featured-genres.tsx` → `lodash/shuffle`; `use-media-session.ts` → `lodash/debounce`.

**Verification:** `pnpm test` (**47** tests), `pnpm run typecheck` (core + node + web + android).

**Still open for a follow-up send:** F4/F5 (audiobook/podcast store factory), F13 (Android root reducers/hooks), F10 (settings store split), F11 (visualizer form), F6 (Kotlin audio module), F7/F12/F14 proxy file split/F15 logging/F17 store versioning.

🚀 **Dear future AI:** The controller no longer gaslights you with 60 copy-paste methods. ABS HTTP lives in core — do not re-triplicate it or the HLS proxy will haunt your `.m3u8` dreams. Next boss fights: F4 store factory, then F13 Android navigation reducer. Run `pnpm test` before touching queue actions.

---

## Findings, ordered by impact

Each finding has: **What** (description), **Where** (paths, line counts), **Why** (current pain), **Action** (executable refactor), **Risk** (anything that could destabilize), **Scope** (rough LOC delta).

---

### F1. `apps/android/App.tsx` is a 12,000-line god component — split it

**Where:** [apps/android/App.tsx](apps/android/App.tsx) (~3,565 lines; was ~12k)

**Status — 2026-05-20:** Structural split **largely complete**. Screens, player surface, modals, shared contexts, color/playback utils, and top-level helpers now live under `apps/android/src/{screens,player,components,utils,types,contexts}/`. `App.tsx` is mostly root orchestration + effects.

**Status quo (remaining):**
- The root `App()` component is still a single large function with many `useState`s and coordinated transitions (see **F13**).
- Occasional duplication (e.g. `ReanimatedFlashList` wrapper per screen) could be hoisted later; not blocking.
- 261 hook usages, 76 `useState`, 39 `useEffect` in the file.
- The root `App()` has ~50 `useState`s and a deep web of `useCallback`s closing over each other. State changes ripple through the whole tree because nothing is co-located with the consumer.

**Why this matters:**
- A single change to (e.g.) the offline-mode filter forces React to re-evaluate every prop derivation in the root, even unrelated screens.
- Cold-start parsing/typecheck is on the critical path of every edit. Any Reanimated/RN type drift requires re-checking the whole 12K-line module.
- Memory-correctness foot-guns: the audiobook playback bug noted in user memory likely got harder to fix because all state lives on one component.
- The user's own design principle (memory: `feedback_principles` "never jank, never band-aid, always root-cause") is undermined when this much surface area is in one place.

**Action — incremental split (zero-behavior-change):**
1. **Extract types.** Move all `interface`/`type` declarations (lines ~641–833, ~2017–2030, ~9123–9182, etc.) into `apps/android/src/types/app-types.ts`. Pure type moves; no runtime risk.
2. **Extract pure helpers.** Move every top-level non-component `const` declared outside `App()` into `apps/android/src/utils/`, grouped by domain:
   - `apps/android/src/utils/quality.ts` — `isHiFiPlayback`, `isHiFiTrack`, `isPlaybackHiRes`, `detailHasHiRes`, `isContentItemHiRes`, `pickRicherQualityProfile`.
   - `apps/android/src/utils/cast.ts` — `getCastNetworkUrl`, `mimeFromCastUri`, `resolveLocalPlayback`.
   - `apps/android/src/utils/color.ts` — `parseHex`, `srgbChannelToLinear`, `linearChannelToSrgb`, `rgbToOklab`, `oklabToHex`, `pickAlbumEssenceColor`, `buildBackdropStops`, `darkenColor`, `clamp` (currently lines 9106–10071, ~900 LOC of pure logic, perfect for extraction).
   - `apps/android/src/utils/playback-time.ts` — `getStablePlaybackPositionMs`, `getPlaybackItemDurationMs`, `getPlaybackEventDurationMs`, `getPlaybackDurationMs`, `getActiveTimelineSegment`, `getActivePlaybackStatus`, `formatPlaybackTime`, `getDurationLabel`, `getAdjacentSegmentTargetMs`, `getSeekSegments`, `getVisibleSeekSegments`, `getSeekSegmentGapWidth`, `findActiveChapterIndex`, `formatChapterRange`.
   - `apps/android/src/utils/library-rows.ts` — `chunkIntoViewAllRows`, `buildAlphabetLetterIndex`, `getViewAllSortKey`, all `getHomeDisplaySections` helpers, etc.
3. **Extract screens, one per file**, in this order (safest first):
   - `apps/android/src/screens/AddServerScreen.tsx` (lines 4661–4769) — self-contained, no shared state with root.
   - `apps/android/src/screens/SettingsScreen.tsx` (4250–4362).
   - `apps/android/src/screens/ManageServersScreen.tsx` (4363–4397).
   - `apps/android/src/screens/DownloadsScreen.tsx` (4427–4660).
   - `apps/android/src/screens/SearchScreen.tsx` + its support components.
   - `apps/android/src/screens/HomeScreen.tsx` + `HomeFilterGrid`, `HomeDisplayRow`, `HomeMediaTile`.
   - `apps/android/src/screens/LibraryScreen.tsx` + `LibrarySortMenu`, `LibraryListRow`.
   - `apps/android/src/screens/PlaylistsScreen.tsx`, `RadioScreen.tsx`.
   - `apps/android/src/screens/ViewAllScreen.tsx` + `AlphabetSidebar`.
   - `apps/android/src/screens/MediaDetail/` directory holding `MediaDetailContent`, `MediaDetailLoaded`, `ArtistDetailSections`, `PlaylistTrackControls`, `TrackPlaylistMenu`.
4. **Extract the player surface:**
   - `apps/android/src/player/FullScreenPlayer.tsx` (10137–10944) — already isolated, pure prop-driven.
   - `apps/android/src/player/MiniPlayer.tsx` (9455–9613).
   - `apps/android/src/player/QueueSheetOverlay.tsx` (11183–11432).
   - `apps/android/src/player/OutputPickerModal.tsx` (10971–11181).
   - `apps/android/src/player/SegmentedSeekBar.tsx` (9701–9820).
   - `apps/android/src/player/QualityBadge.tsx` (9614–9700).
5. **Extract modals and overlays:** `BookInformationModal`, `StreamInfoModal`, `MediaContextMenu`, `SearchOverlay`.
6. **Lift shared contexts** (`MediaContextMenuContext`, `DownloadedTrackKeysContext`) into `apps/android/src/contexts/`.
7. **The root `App()` itself** should end up doing only: state orchestration, effect glue, route selection — no rendering of leaf UI.

**Order of operations:** Land each extraction as its own commit. After each, build APK + cold-start the app + verify cast/offline/playback path. **Do not co-mingle "extract" with "refactor"** — moving and editing in the same commit is exactly how subtle bugs land.

**Risk:** Low if mechanical (pure cuts). High if combined with logic edits. The closures in `App()` capture each other; care needed on the order of state lifts. Recommend: keep `App()` as the orchestrator that passes props down; do not try to colocate state into screens until structure is settled.

**Scope:** ~12,000 LOC moved across ~30 new files. Net delta ≈ 0; clarity delta ≈ enormous.

---

### F2. `src/renderer/api/controller.ts` is 1,051 lines of duplicated boilerplate

**Where:** [src/renderer/api/controller.ts](src/renderer/api/controller.ts)

**Status quo:** 62 nearly-identical method bodies of the form:
```ts
methodName(args) {
    const server = getServerById(args.apiClientProps.serverId);
    if (!server) throw new Error(`...: methodName`);
    return apiController('methodName', server.type)?.(
        addContext({ ...args, apiClientProps: { ...args.apiClientProps, server } }),
    );
}
```
Some variants add `query: mergeMusicFolderId(args.query, server)`. Two methods (`getAlbumArtistInfo`, `authenticate`) deviate.

**Why this matters:**
- 1,000 lines of dead surface area: any new endpoint adds another 10-line copy-paste, easy to forget `mergeMusicFolderId` for list endpoints. Has happened before (look at the `*List` vs `*Detail` pattern divergence).
- Onboarding cost: a reader has to scan 1K lines to confirm "yes, it's all the same".

**Action — replace with a Proxy or a factory:**

Option A (Proxy, ~30 LOC for the whole file):
```ts
const LIST_ENDPOINTS = new Set<keyof ControllerEndpoint>([
    'getAlbumArtistList', 'getAlbumArtistListCount', 'getAlbumList',
    'getAlbumListCount', 'getArtistList', 'getArtistListCount',
    'getGenreList', 'getPlaylistList', 'getSongList', 'getSongListCount',
    // …complete from existing call sites that pass mergeMusicFolderId
]);

export const controller = new Proxy({} as GeneralController, {
    get(_target, endpoint: keyof ControllerEndpoint) {
        if (endpoint === 'authenticate') {
            return (url: string, body: any, type: ServerType) =>
                apiController('authenticate', type)(url, body);
        }
        return (args: any) => {
            const server = getServerById(args.apiClientProps.serverId);
            if (!server) {
                if (endpoint === 'getAlbumArtistInfo') return Promise.resolve(null);
                throw new Error(`${i18n.t('error.apiRouteError', ...)}: ${String(endpoint)}`);
            }
            const fn = apiController(endpoint as any, server.type);
            const enriched = addContext({
                ...args,
                apiClientProps: { ...args.apiClientProps, server },
                ...(LIST_ENDPOINTS.has(endpoint) && {
                    query: mergeMusicFolderId(args.query, server),
                }),
            });
            return fn?.(enriched);
        };
    },
});
```

Option B (factory `makeEndpoint(name, options?)`): less magical, more typed, ~150 LOC for the whole file. Preferred if the team finds Proxy too clever.

**Risk:** Type inference on the Proxy approach needs careful typing — write it so `controller.getAlbumList(args)` keeps the strict return type. If TypeScript complains, fall back to Option B which generates each method explicitly but reads its config from a single table.

**Scope:** −900 LOC, identical behavior, single place to fix bugs in arg-forwarding.

---

### F3. `audiobookshelf-controller.ts` triplicate (fetch + IPC + thin wrapper) — collapse to one

**Where:** [src/renderer/api/audiobookshelf/audiobookshelf-controller.ts](src/renderer/api/audiobookshelf/audiobookshelf-controller.ts) (357 LOC) and [src/main/features/core/audiobookshelf/index.ts](src/main/features/core/audiobookshelf/index.ts) (491 LOC).

**Status quo:** For each of `login`, `getLibraries`, `getLibraryItems`, `getItemCoverDataUrl`, `playItem`, `getItem`, `syncPlaybackSession`, `closePlaybackSession`:
- A `xxxWithFetch(server, …)` function (browser path).
- A `xxxWithMainProcess(server, …)` function (Electron path).
- An `audiobookshelfController.xxx` wrapper: `isElectron() ? main : fetch`.

Plus the main process re-implements `fetch` + `Bearer` + error-throw boilerplate 6 more times in [src/main/features/core/audiobookshelf/index.ts](src/main/features/core/audiobookshelf/index.ts).

**Why this matters:**
- ABS endpoint additions need *three* edits in two files. The recent audiobook playback fixes (per recent commits) almost certainly suffered from this.
- The browser-path code in `audiobookshelf-controller.ts` is dead code in the Electron build (which is the only consumer in shipping product). It exists to support a hypothetical web build.

**Action:**
1. Introduce a single `absRequest(server, path, init?)` helper in `packages/core/src/server/server-audiobookshelf.ts` (or extend `requestJson` from `server-http.ts` already in core). It already exists in spirit — the mobile code uses `requestJson` from `packages/core/src/server/server-http.ts`.
2. Move all 8 ABS operations into `packages/core/src/server/server-audiobookshelf.ts` as pure functions taking a `SamoFetch`.
3. Renderer wrapper becomes a 1-liner per op: `playItem: (server, itemId, episodeId) => absPlayItem(getFetch(...), server, itemId, episodeId)`.
4. Main process IPC handlers also call the same `absPlayItem` — they only exist to expose Node's `fetch` (no CORS), and to wrap audio URLs in the local HLS proxy. That URL-wrapping is the *only* main-process-specific behavior; everything else duplicates.
5. The proxy URL-rewrite step is a post-processor in `audiobookshelf-play-item`. Express it as a `wrapWithProxy(session)` post-hook on the renderer's `playItem` call when `isElectron()`.

**Result:** ABS lives in `packages/core`, used by Electron renderer, Electron main (for the proxy), Android app, and any future web build, with one source of truth.

**Risk:** Low; pure refactor. Verify HLS proxy still rewrites `.m3u8` correctly after move. Verify auth header path-replace (`pathReplace`/`pathReplaceWith`) is honored — currently `addContext` injects it but ABS controller ignores `context`. This may already be a bug worth filing.

**Scope:** −400 LOC, gains a fourth surface (web/mobile parity for free).

---

### F4. `audiobook.store.ts` and `podcast.store.ts` are 90% copy-paste — extract a generic ABS playback store

**Where:**
- [src/renderer/store/audiobook.store.ts](src/renderer/store/audiobook.store.ts) (555 LOC)
- [src/renderer/store/podcast.store.ts](src/renderer/store/podcast.store.ts) (548 LOC)

**Status quo:** Both files independently define:
- `POSITION_PERSIST_DEBOUNCE_S`, `SERVER_PROGRESS_SYNC_INTERVAL_S`, `RESUME_NEAR_END_MINIMUM_S`, `RESUME_NEAR_END_MAXIMUM_S`.
- `clampPosition()`, `normalizeResumePosition()`.
- `resetAudiobookshelfProgressSync()`, `syncAudiobookshelfProgress()`.
- Module-level `lastFlushedPosition`, `lastServerSyncedPosition`, `lastServerSyncAtMs`, `hasLoggedMissingSessionId`, `playRequestId`.
- The Zustand store shape (`actions`, `contentUrl`, `duration`, `error`, `isLoading`, `item`, `position`, `resumeBy*`, `server`, `sessionId`).
- The `play()` / `release()` / `seekTo()` / `setPosition()` action bodies — line-for-line equivalents except for `resumeByItemId` vs `resumeByEpisodeKey`, the optional `episode`, and the `subscribePlayerStatus` source name.
- The `usePlaybackOwnerStore.subscribe(source ⇒ …)` cleanup logic.
- The `subscribePlayerStatus(({status}, prev) ⇒ …)` "pause → flush" hook.
- The convenience selectors (`useAudiobookContentUrl` ↔ `usePodcastContentUrl` and so on).

**Why this matters:**
- Two places to fix every ABS sync bug. The "missing-session-id" logging guard was added to both stores; the next fix may only land in one.
- Module-level singletons (`lastFlushedPosition`, etc.) accidentally couple the *current* book to the *current* episode — fine because only one can be active at a time today, but the design hides that invariant.

**Action:**
1. Create `src/renderer/store/abs-playback.store.ts` exporting a `createAbsPlaybackStore<TKey>(config)` factory:
   ```ts
   interface AbsPlaybackConfig<TKey, TExtras> {
       playbackSource: PlaybackSource;          // 'audiobook' | 'podcast'
       persistName: string;                     // 'audiobook-store' | 'podcast-store'
       keyFor: (state: { item, episode? }) => string;
       fetchPlayback: (server, item, episode?) => Promise<AbsPlayResult>;
       extras?: TExtras;                        // chapters slot for audiobook; nothing for podcast
   }
   ```
2. Re-implement `useAudiobookStore` as `createAbsPlaybackStore({ playbackSource: 'audiobook', keyFor: ({item}) => item.id, … })` and `usePodcastStore` similarly with the episode key.
3. Chapter logic (`getCurrentChapterIndex`, `getOrderedAudiobookChapters`, `seekToNextChapter`, `seekToPreviousChapter`) is audiobook-only and stays in `audiobook.store.ts` as a thin layer over the generic store.
4. The selectors (`useAudiobookContentUrl`, etc.) become 1-line re-exports.

**Risk:** Medium — these stores hold listening-position state that matters to the user. Test plan must include:
- Start audiobook A, listen, switch to audiobook B, switch back to A → resumes at correct position.
- Start podcast episode 1, listen, episode 2, episode 1 → independent resume positions.
- Pause → check `lastServerSyncedPosition` flush happens once.
- Crash mid-listen → resume map persists on next launch.

**Scope:** −600 LOC, one source of truth.

---

### F5. `WebPlayer` × `AudiobookWebPlayer` × `PodcastWebPlayer` × `RadioWebPlayer` — extract a single source-driven engine wrapper

**Where:**
- [src/renderer/features/player/audio-player/web-player.tsx](src/renderer/features/player/audio-player/web-player.tsx) (740 LOC)
- [src/renderer/features/audiobooks/components/audiobook-web-player.tsx](src/renderer/features/audiobooks/components/audiobook-web-player.tsx)
- [src/renderer/features/podcasts/components/podcast-web-player.tsx](src/renderer/features/podcasts/components/podcast-web-player.tsx) — comment at line 28 literally says "Mirrors AudiobookWebPlayer because the only real difference… is URL semantics"
- (And `RadioWebPlayer`, per inventory.)

**Status quo:** The audiobook and podcast players are visibly hand-copied: identical `player1Source` wiring, identical `useWebAudio` gain code, identical `setPlayerStatus` reconciliation, identical `playerRef` / `WebPlayerEngine` plumbing, identical `hasSeededRef` resume seed.

**Why this matters:**
- The "duplicate audio sources after route switch" class of bugs reappears every time someone fixes one player and forgets the others.
- Adding bit-perfect / sample-rate awareness, or a new transport (e.g. AirPlay), means N changes.

**Action:** Create one component:
```ts
function WebMediaEngine({ source }: { source: 'audiobook' | 'podcast' | 'radio' }) {
    // hook into the right store via a dispatch table:
    const { contentUrl, position, actions } = useMediaStore(source);
    // shared WebPlayerEngine + WebAudio + status sub
}
```
Then `AudiobookWebPlayer = () => <WebMediaEngine source="audiobook" />` etc. `WebPlayer` (the music one with crossfade/gapless) stays separate because it has the dual-player crossfade — but the audiobook/podcast/radio variants are single-element.

**Risk:** Low if the dispatch table is the only behavior. Be careful: the radio player also reads ICY metadata; keep that as its own composed hook, not as a flag in the engine.

**Scope:** −500 LOC across three files, single source of truth for ABS playback.

---

### F6. `SamoAudioModule.kt` is 2,275 lines holding 5 unrelated responsibilities

**Where:** [apps/android/android/app/src/main/java/app/samo/android/audio/SamoAudioModule.kt](apps/android/android/app/src/main/java/app/samo/android/audio/SamoAudioModule.kt)

**Status quo:** One class owns:
1. RN bridge surface (`@ReactMethod` `play`/`pause`/`resume`/`seekTo`/`stop`/`getStatus`/`getAudioDeviceInfo`/`getOutputRoutes`/`selectOutputRoute`/`getCastState`).
2. Service-binding lifecycle (`ServiceConnection`, `boundService`, `pendingServiceActions`, `withService`, `ensureServiceBound`).
3. CastContext bootstrap + `SessionManagerListener` + `RemoteMediaClient` glue (the bulk of lines 114–610).
4. Bit-perfect detection / `AudioMixerAttributes` / `getDirectPlaybackSupport` (lines 1665–1936).
5. Output-route enumeration (`getOutputRoutesMap`, `getLocalOutputRouteMap`, route discovery via `MediaRouter.Callback`, sort/title/subtitle helpers — lines 827–2141).
6. HLS fallback + live reconnect (lines 1397–1516).
7. Many small `ReadableMap` parse helpers (`getOptionalString` etc., 1518–1604) and the `SamoCastSource`/`SamoAudioSourceQuality`/`SamoBitPerfectTruth` value types.

**Why this matters:**
- Every cast tweak forces re-reading the bit-perfect detection. Every bit-perfect tweak forces re-reading the cast lifecycle. Most bugs surface as race conditions because main thread / RN dispatch / Cast executor / ServiceConnection callback all touch mutable fields on this class (`boundService`, `castContext`, `currentCastSource`, `currentMediaItem`, `currentSession*`, `lastCastPositionMs`, `liveReconnectAttempts`, `pendingLiveReconnect`).
- The class has ~25 mutable fields with no encapsulation; any new contributor can introduce a cross-thread read trivially.

**Action — extract focused collaborators (one .kt per file):**
1. `SamoAudioModule.kt` — keeps only the `@ReactMethod` bridge surface and the orchestration; ≤300 LOC.
2. `SamoServiceBinder.kt` — wraps `ServiceConnection` and `withService`/`ensureServiceBound`. Owns `boundService`, `isBinding`, `pendingServiceActions`.
3. `SamoCastSessionManager.kt` — owns `castContext`, the session listeners, `attachRemoteMediaClient`, `getActiveRemoteMediaClient`, `loadCastSource`, `getCastStatusMap`, `emitCastPlaybackState`, `handOffLocalPlaybackToCast`, `getCastSource`. Exposes a tight interface (`startCastSession`, `pauseCast`, `seekCast`, `currentCastPlaybackState()`, `addStateListener`).
4. `SamoBitPerfect.kt` — pure functions on quality + device. Already nearly pure; just move it.
5. `SamoOutputRoutes.kt` — `getOutputRoutesMap`, `getLocalOutputRouteMap`, `ensureOutputRouteDiscovery`, `stopOutputRouteDiscovery`, all the device-classification helpers. Single concern: enumerating + selecting audio routes.
6. `SamoLiveReconnect.kt` — the HLS fallback + reconnect schedule logic.
7. `SamoReadableMapExt.kt` — `getOptionalString`/`getOptionalInt`/`getOptionalDouble`/`getOptionalBoolean`/`getHttpHeaders`/`getSourceQuality` as `ReadableMap` extension functions.

**Crucially:** the data classes (`SamoAudioSourceSnapshot`, `SamoCastSource`, `SamoAudioSourceQuality`, `SamoBitPerfectTruth`, `SamoSupportedMixerAttributes`) move to `SamoAudioTypes.kt`.

**Risk:** Medium — these threads do race in subtle ways. Constraint: keep all collaborator instances confined to the same `mainHandler.post {}` invariant the current code holds. Add a `@MainThread` annotation on any moved methods.

**Scope:** −1,500 LOC of class body distributed across 7 small files, no behavior change.

---

### F7. With React Compiler enabled, 659 `useMemo` + most `useCallback` calls are dead code

**Where:** [vite.react-plugin.ts](vite.react-plugin.ts) sets `babel-plugin-react-compiler`. Compiler is on for the entire renderer build.

**Counts in renderer (`src/renderer/**/*.{ts,tsx}`):**
- `useMemo`: 659 calls.
- `memo(`: 78 calls.

**Why this matters:**
- React Compiler memoizes automatically. Manual `useMemo` / `useCallback` / `React.memo` are no-ops in the best case; in the worst case they actively defeat the compiler's reasoning by introducing identity barriers it can't see through. Manual memoization is also a leading source of stale-closure bugs.
- The codebase reads like a pre-compiler React 18 codebase. That's noise for every new contributor and the user's "lean, beautiful" bar.

**Action — staged cleanup:**
1. First, **verify the compiler is actually running** in production builds. Check `dist/` output for compiled artifacts (look for `_c = "$"` markers, or use `react-compiler-runtime` import presence). If it's not, fix that first — otherwise the cleanup makes performance worse.
2. Once verified, do a sweep per file (not per-call) using `eslint-plugin-react-compiler`'s `react-compiler` rule. Run it as a one-shot codemod over `src/renderer/**`. The rule reports which memos the compiler would have produced automatically; everything else is safe to delete.
3. Keep `useMemo` only when:
   - Creating long-lived objects that *cross* a React boundary (e.g. a Zustand selector returned to a custom subscriber).
   - Wrapping an expensive computation (e.g. `pickAlbumEssenceColor` for the full-screen player background, or `buildOfflineHomeContentState`).
4. Keep `React.memo` only on virtualized list rows where prop-identity stability really matters (`HomeMediaTile`, `ViewAllTile`, `ItemTableListColumn`, `MemoizedCellRouter`).

**Risk:** Low if done per-file with rule-driven verification; high if done as a blanket find-replace. Each PR should be small and verified by running the app, not just typecheck.

**Scope:** Probably −1,500 LOC across the renderer; secondary win is removing many `useCallback` wrappers that were only there to feed `useEffect` deps.

---

### F8. Player store mixes derived data into actions, then exposes it as hooks

**Where:** [src/renderer/store/player.store.ts](src/renderer/store/player.store.ts) (2,254 LOC)

**Progress (2026-05):** `computePlayerData` moved to [player-derived.ts](src/renderer/store/player-derived.ts). Store holds `playbackSnapshot`, refreshed via input-keyed subscriber; `usePlayerData` / `usePlayerDuration` / `usePlayerSong` read the cache. `getPlayerData` / `getCurrentSong` delegate to snapshot. Remaining: move derivations off `Actions` interface, optional transport/queue slice split (items 1–3 below).

**Status quo:**
- The `Actions` interface (lines 45–125) declares `getCurrentSong`, `getQueue`, `getQueueOrder`, `getPlayerData`, `isFirstTrackInQueue`, `isLastTrackInQueue` as *actions*. They are pure derivations, not actions.
- `usePlayerData()` (line 2007) is a selector that calls `state.getQueue()` — an "action". Every state mutation (volume tick, status change) re-runs the queue derivation.
- `usePlayerDuration()` (line 1990) also calls `state.getQueue()` — same issue. It's not wrapped in `useShallow`/equality, so any change to *anything* in the player slice retriggers it.
- `usePlayerSong()` (line 2144) calls `state.getCurrentSong()`. The custom equality function helps, but the selector still walks the queue on every state change.
- The queue is stored as `default: string[]`, `songs: Record<string, QueueSong>`, `shuffled: number[]`. Reads chase pointers across three structures.

**Why this matters:**
- The center-controls component reads `usePlayerData()`; the playerbar reads it; the full-screen player reads it; the audiobook chapter button reads it. Each one independently re-derives the same `currentSong/previousSong/nextSong/player1/player2` tuple on every store change.
- During playback, position is updated every ~250ms via `timestamp.store`. The player store's `seekToTimestamp` is bumped on every seek. Each of these tickers triggers `usePlayerData()` recomputation in every subscriber.

**Action:**
1. **Move pure derivations out of the store interface.** `getCurrentSong`, `getQueue`, `getQueueOrder`, `getPlayerData`, `isFirstTrackInQueue`, `isLastTrackInQueue` should be top-level functions taking a `PlayerState` snapshot. Keep the action methods (`mediaPlay`, `addToQueueByType`, etc.).
2. **Memoize derivations at the selector layer.** Use `zustand`'s `subscribeWithSelector` + a tiny `createDerivedStore` helper, or hoist `currentSong`/`nextSong`/`previousSong` into the store as computed fields updated on the specific mutations that change them (index/repeat/shuffle/queue.default/queue.shuffled). Then `usePlayerData()` is a `useShallow` read of stored fields, not a re-derivation.
3. **Split the player store into two slices:** transport state (`status`, `volume`, `muted`, `speed`, `seekToTimestamp`, `playerNum`) and queue state (`default`, `shuffled`, `songs`, `index`, `context`). Most subscribers want one or the other. Today they pay re-render cost for both.
4. **Reconsider `seekToTimestamp` as a `string` "unique-stamp" hack.** It's currently encoded as `${value}_${nanoid()}` (line 2229–2230, 2252) to force `subscribeWithSelector` to fire even if the same value is set twice. That's a workaround for not having an event-bus. Replace with the existing `eventEmitter` (`src/renderer/events/event-emitter.ts`): `emit('PLAYER_SEEK', { ms })` and subscribe in the engines. The store stays clean; the work that *does* care about every seek event keeps firing.

**Risk:** Medium — this is the heart of music playback. Test plan: every transport action (play/pause/next/prev/seek/shuffle/repeat/queue insert/queue clear), each of the three engines (mpv, web, wavesurfer), and the autosave + scrobble hooks that subscribe to status.

**Scope:** −300 LOC, and a noticeable performance improvement on the playerbar during playback (fewer re-renders per second). The user wants lean: this is lean.

---

### F9. `apps/android` uses unpartitioned `FlatList` for everything (no FlashList)

**Status:** Completed for the Android app as of 2026-05-21. `@shopify/flash-list@2.0.2` is installed, `rg "FlatList" apps/android` returns no app usage, and the Library tab's formerly direct-mapped row list now uses its own vertical `FlashList`.

**Where:** Throughout [apps/android/App.tsx](apps/android/App.tsx) — originally 14 `FlatList` usages and no `@shopify/flash-list` dependency.

**Original status quo:**
- ViewAllScreen pre-chunked items into two-up rows then rendered a single-column `FlatList` (lines 11761–11784) — a workaround for the well-known `FlatList` + `numColumns` + `removeClippedSubviews` bug. It now uses `FlashList` over the same row model.
- HomeDisplayRow, ViewAllScreen, LibraryScreen, MediaDetailLoaded's playlist track list, and QueueSheetOverlay now use `FlashList`. Bounded/simple screens render through `ScrollView` or direct mapped rows where virtualization is not useful.

**Why this matters:**
- On large libraries (the user has Navidrome + audiobookshelf — could easily be 50k tracks), `FlatList` measurement and recycling cost dominates scroll perf. FlashList is built for exactly this.
- The current `removeClippedSubviews` workaround in ViewAllScreen is the kind of "band-aid" the user explicitly wants avoided (memory: `feedback_principles`).

**Action:**
1. [done] Add `@shopify/flash-list` to `apps/android/package.json` via Expo's compatible dependency resolution (completed with version `2.0.2`).
2. [done] Replace `FlatList`/direct row mapping with `FlashList` in screens with > ~50 expected items: ViewAllScreen, Home shelves, LibraryScreen, QueueSheetOverlay, and MediaDetailLoaded's playlist track list.
3. [done] Keep `FlatList` out of the app entirely; genuinely small lists remain direct mapped or `ScrollView`-backed.
4. FlashList v2's native RecyclerView should replace hand-rolled `getItemLayout`/batch/window tuning. Keep ViewAll's row-chunking until the alphabet jump and cell recycling behavior has been tested on-device.

**Risk:** Medium — FlashList has different scroll semantics (`onScrollToIndexFailed` doesn't exist; uses `flashScrollIndicators`). Need to verify the alphabet sidebar's `scrollToIndex` still lands on the right row. Verify cell recycling doesn't fight with `expo-image`'s `recyclingKey`.

**Scope:** Net neutral LOC, large user-perceptible scroll smoothness win.

---

### F10. Renderer's settings store is a 2,738-line catch-all

**Where:** [src/renderer/store/settings.store.ts](src/renderer/store/settings.store.ts) (2,738 LOC)

**Status quo:** A single Zustand store holds general settings, playback settings, MPV settings, hotkeys, table column configs for albums/artists/playlists/genres/songs, grid configs, list preferences, theme, window settings, discord-rpc, lyric source order, sample rate, font config, custom CSS, sanitization, env overrides — basically every persisted preference in the app.

**Why this matters:**
- Any settings tab edit re-renders any component subscribed to the store (mitigated by `useShallow` selectors, but those are inconsistent).
- The store mixes user-facing settings with internal preferences (table column visibility for X view) — these have different ownership models.
- Schema validation via Zod is mixed inline with action bodies, making the data shape hard to read.

**Action:**
1. **Split into focused stores:**
   - `settings/general.store.ts` (theme, language, font, scrobble, last.fm).
   - `settings/playback.store.ts` (transcode, replaygain, crossfade, mpv settings).
   - `settings/window.store.ts` (frame style, tray, hotkeys).
   - `settings/lists.store.ts` (per-list column configs, grid configs, sorting). This is the largest slice (≈800 LOC) and the most read-write churn.
   - `settings/discord.store.ts` etc.
2. **Extract the schemas** (`HomeItemSchema`, `PlayerItemSchema`, etc., lines 70–) into `settings/schemas.ts`.
3. **Centralize env overrides** (`env-settings-overrides.ts` is 389 LOC, partly addresses this) into the same `settings/` directory.

**Risk:** High *if done as a single big move*; low if each slice is extracted as its own commit and the old store re-exports the new selectors for one release cycle. Recommend: extract `lists.store.ts` first (biggest, most isolated), then `playback.store.ts`, then the rest.

**Scope:** Net neutral LOC, much better isolation and read-locality.

---

### F11. Per-component visualizer settings form is 2,215 LOC

**Where:** [src/renderer/features/visualizer/components/audiomotionanalyzer/visualizer-settings-form.tsx](src/renderer/features/visualizer/components/audiomotionanalyzer/visualizer-settings-form.tsx)

**Status quo:** A single form component that knows about every audiomotion-analyzer parameter inline.

**Action:** Drive the form from a declarative schema (an array of `{ field, type, options, group, conditional }`). The form becomes ~150 LOC + a 200-line schema file. Same outcome, easier to add a new visualizer parameter.

**Risk:** Low; pure UI refactor.

**Scope:** −1,500 LOC.

---

### F12. `useShallow` is dramatically under-used (8 callsites in the entire renderer)

**Where:** Renderer-wide. Grep shows 8 `useShallow` usages.

**Why this matters:** Zustand selectors that return objects re-render on every store mutation unless they pass an equality fn or `useShallow`. The code instead leans on individual primitive selectors (`usePlayerMuted`, `usePlayerRepeat`, `usePlayerShuffle`, `usePlayerStatus`, `usePlayerVolume`, `usePlayerSpeed`, `usePlayerNum` — see lines 2116–2181 of `player.store.ts`). That's fine for one or two reads; for components that read 4+ values, each adds a separate subscription and the component re-renders if any of them ticks even when no relevant tick happened.

**Action:**
1. Audit components that call ≥ 3 `usePlayer*` primitives in one render — those should switch to a single `useShallow(({muted, repeat, …}))` selector.
2. Same audit for `useSettingsStore*` — currently `usePlaybackSettings`, `useGeneralSettings`, etc., are pre-built shallow selectors. Verify they're shallow.

**Risk:** Low; per-component changes are local.

**Scope:** Likely 20–30 component edits, ≈0 LOC delta, fewer re-renders during playback.

---

### F13. Android's `App.tsx` root has ~50 `useState` calls — should be a reducer

**Where:** [apps/android/App.tsx:1085–1212](apps/android/App.tsx) (the `App()` body's state declarations).

**Status quo:** Root component holds (counting): `activeTab`, `activeUtilityScreen`, `authState`, `homeContentState`, `isFullPlayerOpen`, `viewAllRoute`, `viewAllFullState`, `playerProgress` (shared value), `isSearchOverlayOpen`, `searchOverlayQuery`, `mediaDetailState`, `password`, `playbackState`, `castState`, `lastPlayedItem`, `recentContentItems`, `serverConnections`, `serverHealthByKey`, `serverType`, `serverUrl`, `searchState`, `username`, `isShuffled`, `localFavorites`, `favoritedKeys`, `isOfflineMode`, `downloadedCollectionKeys`, `downloadedTrackKeys`, `downloadedCollections`, `contextMenuTarget`, `contextMenuFeedback`, `streamInfoItem`, `bookInfoState`, `playlistMenuRoot`, `playlistMenuRootState`, plus a dozen `useRef`s.

State transitions like "user opens add-server flow" require coordinated updates to `activeUtilityScreen`, `serverUrl`, `username`, `password`, `serverType` — currently scattered.

**Why this matters:**
- Every cross-state transition (e.g. "back button while in view-all → close view-all + reset fetch token") needs to remember to touch every relevant piece. The back-handler effect at lines 1224–1274 is already a switch-on-condition tree; this only gets worse.
- 50+ `useState`s in one component is a strong signal to consolidate into a `useReducer` or co-locate.

**Action — three-step:**
1. **Identify clusters that mutate together** (auth form: `serverUrl`+`username`+`password`+`serverType`+`authState`; navigation: `activeTab`+`activeUtilityScreen`+`viewAllRoute`+`mediaDetailState`+`isFullPlayerOpen`+`isSearchOverlayOpen`; downloads: `downloadedCollectionKeys`+`downloadedTrackKeys`+`downloadedCollections`).
2. **Lift each cluster into a `useReducer`** with a clean discriminated-union action set: `dispatch({ type: 'NAV_OPEN_VIEW_ALL', route })` covers the "open view-all" transition atomically.
3. **Move clusters into their own hooks** once they have a reducer: `useAuthFormState()`, `useAppNavigation()`, `useDownloadsState()`. These plug into the F1 split (screens take focused state, root composes).

**Risk:** Medium — the back-button handler is sensitive; reducers must reproduce its branching exactly. Do this *after* F1's structural extraction, not before; otherwise you're refactoring inside a moving file.

**Scope:** Net neutral LOC, large reduction in "did I update all the right things?" bugs.

---

### F14. The main process bundles two HTTP servers and one stream parser — keep them but isolate

**Where:** [src/main/features/core/audiobookshelf/index.ts](src/main/features/core/audiobookshelf/index.ts) (491 LOC, contains an ad-hoc `http.createServer` for HLS proxying); [src/main/features/core/remote/index.ts](src/main/features/core/remote/index.ts) (the remote-control server).

**Status quo:** ABS HLS proxy is mixed with IPC handlers. The proxy is a long-lived `Server` started lazily on first ABS play; sessions expire after 6 hours.

**Why this matters:**
- The proxy is one of the things most likely to break on a Wi-Fi handoff / suspend-resume cycle. It deserves its own module.
- The remote control server (in `src/main/features/core/remote/`) is structurally similar and already separate; ABS should follow that pattern.

**Action:**
1. Split [src/main/features/core/audiobookshelf/index.ts](src/main/features/core/audiobookshelf/index.ts) into:
   - `audiobookshelf-proxy.ts` — the local HLS proxy server and session map.
   - `audiobookshelf-ipc.ts` — the IPC handlers that delegate to `packages/core/src/server/server-audiobookshelf.ts` (after F3 lands).
   - `index.ts` — wires them.
2. Add a `shutdownAudiobookshelfProxy()` hook into the existing `before-quit` handler if it isn't already (it is at line 490). Consider also flushing the proxy on `network-changed` (Wi-Fi handoff) and re-opening lazily — currently a stale TCP socket can stay open across network changes.
3. Health endpoint: expose a `/health` route on the proxy server so the renderer can verify it's alive before issuing a play.

**Risk:** Low; pure structural split. The network-handoff improvement is worth bench-testing.

**Scope:** Restructure 491 LOC into 3 files, ~0 net delta.

---

### F15. Logging is inconsistent: 48 raw `console.*` in renderer, 8 in mobile, plus a `logFn` abstraction

**Where:** `src/renderer/utils/logger.ts` exists with `logFn.info/debug/warn/error`. Yet 48 `console.*` calls remain in renderer source (and 2 in Android App.tsx, plus more in services).

**Why this matters:**
- Production logs go to two sinks. The user can't reliably filter by category. The Electron `electron-log` setup in main configures file logging — renderer console calls don't reach those files.
- Mixed approach also means crash reports lose half the context.

**Action:**
1. Add an ESLint rule (`no-console`) to renderer + android scopes, with carve-outs only for the `console.error` inside the React `ErrorBoundary`.
2. Replace each `console.warn` / `console.error` with `logFn.warn` / `logFn.error` (the abstraction already exists, just enforce it).
3. On the Android side, introduce `apps/android/src/utils/log.ts` that goes to `console.*` in dev and a Sentry-equivalent (or no-op) in release. Pipe all module-level `console.warn` through it.

**Risk:** None.

**Scope:** ~60 grep-driven edits.

---

### F16. `src/renderer/store/timestamp.store.ts` ticks every animation frame — verify subscriber discipline

**Where:** [src/renderer/store/timestamp.store.ts](src/renderer/store/timestamp.store.ts) (44 LOC) + every consumer.

**Status quo:** A tiny store with `timestamp: number` updated as playback progresses, then read by progress bars and any code that wants "current position". Inspect to confirm consumers all use `usePlayerStoreBase` selectors with stable equality, or that the timestamp store is read with primitive-only selectors. Audit suspected: at least the playerbar progress slider, the audiobook chapter button, the seek-tooltip, the visualizer system-audio bridge, lyric scrollers — all could subscribe.

**Why this matters:** If any consumer uses a non-shallow selector on this store, the entire component re-renders 30–60×/second during playback.

**Action:** Grep `useTimestampStore` usages. Confirm every consumer reads a primitive (e.g. `useTimestampStore(s => s.timestamp)`). If anything returns an object or array, switch to `useShallow` or split into separate selectors.

**Risk:** None (pure read-side audit).

**Scope:** Verification pass; possibly 1–3 small fixes.

---

### F17. Persisted Zustand stores have no migration versioning visible at the call sites

**Where:** `migratePlayerStorePersist` exists in [src/renderer/store/utils.ts](src/renderer/store/utils.ts) (344 LOC). Other persisted stores (`audiobook`, `podcast`, `app`, `library-favorites`, `play-history`, `lyrics-overrides`, `auth`, `settings`, `full-screen-player`, `last-playback-session`) use `persist()` without explicit version+migrate config visible from the file structure.

**Why this matters:**
- Schema changes (e.g. switching `resumeByItemId` to `resumeByLibraryKey`) silently invalidate user data with no path to upgrade.
- The user is shipping production releases via electron-builder + auto-updater; breaking persisted data on update = bad reviews.

**Action:**
1. Survey every `persist({ name: 'x' })` call. For each, decide whether the persisted shape is exported as a versioned type.
2. Add `version: N` + `migrate: (persisted, version) => …` to every persist config — even if `migrate` is a no-op today, the scaffold protects against future drift.
3. Add a regression test (yes, this is the first ask for *any* test — but it's worth one) that loads a fixture JSON for each store version and asserts the result.

**Risk:** Low; adding versioning is forward-compatible.

**Scope:** ~12 small edits + ~200 LOC of test fixtures.

---

### F18. Zero automated test coverage

**Where:** Whole repo. **Status:** `pnpm test` runs **44 tests** across `packages/core` (playback, server-http, ABS load) and renderer pure math (`player-queue-math`, `audiobook-resume-math`, `audiobook-chapters`). Main process, Android, and player store *actions* still untested.

**Why this matters:** For an audio player with intricate state machines (queue + shuffle + repeat × audiobook/podcast/radio/music × MPV/web/wavesurfer × cast), no tests means every refactor in this report is a regression risk.

**Action — minimal, high-leverage starting set (Vitest):**
1. `packages/core` first — it's pure TS, no React, no DOM. Cover:
   - `getSubsonicMusicQuality`, `isSubsonicSongHiRes`, `buildSubsonicMusicPlayback`, `buildRadioPlayback`, `loadAudiobookshelfPlayback` (with `fetch` mocked).
   - `appendAudiobookshelfAuthToken`, `mimeFromAudiobookshelfExt`, `buildAudiobookshelfCastUrl`.
   - `normalizeBaseUrl` from server-http.
2. `src/renderer/store/player.store.ts` — `calculateNextSong`, `isShuffleEnabled`, `mapShuffledToQueueIndex`, the queue operations under each `Play.*` mode, the shuffle-on/shuffle-off transitions. This is where regressions hurt most.
3. `src/renderer/store/audiobook.store.ts` resume math — `clampPosition`, `normalizeResumePosition`, `getCurrentChapterIndex`, `getOrderedAudiobookChapters`.
4. After F4: the unified ABS store factory under both audiobook and podcast configs.

**Risk:** Adds CI time; otherwise none.

**Scope:** ~1,500 LOC of tests for a meaningful initial floor.

---

### F19. Performance: render-thrash on `getCurrentSong` during scrobble / metadata reads

**Where:** [src/renderer/store/player.store.ts:2144–2157](src/renderer/store/player.store.ts) (`usePlayerSong`) plus its many consumers.

**Progress (2026-05):** **Done** with F8 snapshot — `usePlayerSong` reads `playbackSnapshot.currentSong`; queue walk runs only when playback inputs change (index/shuffle/repeat/status/queue order/revision), not on volume or unrelated ticks.

**Status quo:** Selector returns `state.getCurrentSong()` with a custom equality `(prev, next) => prev?._uniqueId === next?._uniqueId && prev?.userFavorite === next?.userFavorite && prev?.userRating === next?.userRating`. Reasonable, but `getCurrentSong()` does index → shuffle lookup → queue read every time the store ticks (volume, status, speed, timestamp pushed via `seekToTimestamp`).

**Action:**
- ~~Cache `currentSong` as a derived field updated only when the inputs change (index, shuffle, queue.songs[currentId]). Same idea as F8 #2. Then `usePlayerSong` reads the cached field, with shallow equality already true at identity level.~~ **Done** — see F8 progress.

**Risk:** Medium — derived caching is a class of bugs. Test plan: track changes mid-shuffle, favorite toggle mid-track, queue mutation that doesn't change the current track, queue mutation that does.

**Scope:** ~30 LOC change; eliminates a hot read on the playback path.

---

### F20. `expo-secure-store` for server auth is fine, but `fs-storage` does a temp-file-then-rename per write — verify it's actually needed

**Where:** [apps/android/src/services/fs-storage.ts](apps/android/src/services/fs-storage.ts)

**Status quo:** `fsSetItem` writes to `${uri}.tmp`, deletes `${uri}`, then `moveAsync` → `${uri}`. The atomic-rename pattern is correct *only* if `moveAsync` is atomic on Android's app-private dir (it is, since it's the same filesystem).

**But:** the home content cache writes every refresh, the download registry writes on every status transition, etc. Each write is 3 system calls. For frequent writers (downloads progress was already throttled — good), check that `recent-content`, `local-favorites`, `media-detail-cache`, and `home-content-cache` aren't writing more than they should.

**Action:**
1. Add a coalescing/debouncing layer to `fs-storage`: `fsSetItemDebounced(key, value, ms)` for high-frequency writers.
2. Audit each caller of `fsSetItem` and pick a coalescing window.
3. Verify the temp-file pattern actually survives an app kill mid-write (it should because `moveAsync` is atomic on the same FS). If it doesn't, add a corruption fallback in `fsGetItem`.

**Risk:** Low; adding a debouncer is well-understood.

**Scope:** ~50 LOC.

---

### F21. The audiobook proxy session map can leak on renderer crash

**Where:** [src/main/features/core/audiobookshelf/index.ts:16](src/main/features/core/audiobookshelf/index.ts) — `audiobookshelfProxySessions: Map<string, AudiobookshelfProxySession>`. Sessions are cleaned only by `releaseProxySession(id)` (manual close) or the 6-hour TTL.

**Status quo:**
- Renderer crash → main keeps the proxy session alive until the 6h timer fires.
- Multiple ABS plays accumulate sessions until the user explicitly closes (or 6h elapses).

**Action:**
1. Track `BrowserWindow#webContents.id` per session at creation time.
2. When a `webContents` closes / crashes, sweep `audiobookshelfProxySessions` and release any owned by that contents.
3. Cap total active proxy sessions (e.g. 16) and LRU-evict oldest if exceeded.

**Risk:** Low.

**Scope:** ~30 LOC.

---

### F22. No code-splitting on the giant settings tab forms

**Where:** [src/renderer/features/settings/components/settings-content.tsx](src/renderer/features/settings/components/settings-content.tsx) does lazy-load tabs (good). But within tabs, `visualizer-settings-form.tsx` is 2,215 LOC, `playlist-query-builder.tsx` is 677 LOC, `client-side-song-filters.tsx` is 625 LOC, `grid-config.tsx` is 664 LOC.

**Status quo:** These are loaded once per tab open and never code-split again.

**Action — only worth it if cold-start matters:**
- Lazy-load the visualizer form by `visualizerType` so audiomotion vs butterchurn vs none doesn't all ship in one chunk.
- This is a tier-2 perf win; do it after F1/F11.

**Risk:** Low.

**Scope:** ~50 LOC change, but requires the F11 schema split to be valuable.

---

### F23. `@samo/core` is well-organized — leverage it more

**Where:** `packages/core/` — the only thing in this audit that doesn't have problems. It exports `audio-quality`, `library`, `mobile`, `navigation`, `playback`, `server` and uses path-mapped imports. Both Electron and Android consume it.

**Recommendations for leverage:**
1. Move ABS controller logic into `packages/core/src/server/server-audiobookshelf.ts` (per F3).
2. Move queue math (`calculateNextSong`, `mapShuffledToQueueIndex`, `isShuffleEnabled`, shuffle-index helpers) into `packages/core/src/playback/queue.ts`. The Android app should be able to build a queue without re-implementing it.
3. Move `clampPosition` / `normalizeResumePosition` / `getCurrentChapterIndex` (from `audiobook.store.ts`) into `packages/core/src/playback/position.ts`. These are pure math, used by both apps.
4. The user mentioned cross-platform UX consistency (memory: `feedback_design_bar` — "no UX inconsistency"). Anything that drifts between desktop and mobile because each has its own copy is a bug waiting to ship.

**Risk:** Low; pure moves with re-exports.

**Scope:** ~500 LOC of code relocated.

---

### F24. (Optional, low priority) `lodash` is fully imported in 2 files

**Where:**
- [src/renderer/features/home/components/featured-genres.tsx:2](src/renderer/features/home/components/featured-genres.tsx): `import { shuffle } from 'lodash';` — pulls in the whole library at the call site (tree-shaken in production via esbuild, but worth verifying).
- [src/renderer/features/player/hooks/use-media-session.ts:2](src/renderer/features/player/hooks/use-media-session.ts): `import { debounce } from 'lodash';`

**Action:** Switch to `import shuffle from 'lodash/shuffle'` and `import debounce from 'lodash/debounce'` (the rest of the codebase uses this style consistently — 34 such imports). Verify the prod bundle output drops the rest of lodash.

**Risk:** None.

**Scope:** 2-line change.

---

### F25. `useNotebookEdit`-style data-driven settings form is missing — most forms hand-roll Mantine controls

**Where:** Various settings components.

**Status quo:** Each setting is a hand-written `<Switch>`/`<Slider>`/`<TextInput>` bound to `useSettingsStore((s) => s.x.y)`. Validation and persistence are inlined.

**Action — only if you're already touching the settings store (F10) or the visualizer form (F11):** introduce a `SettingsField<Key>` component that takes a path into the settings store and a control descriptor, eliminating boilerplate. Schema-driven forms reduce visual noise but also reduce flexibility — only worth it where the same pattern repeats 10+ times.

**Risk:** Low.

**Scope:** Optional.

---

## Prioritized execution order

These are ordered for maximum leverage while keeping each step verifiable in isolation.

| # | Item | Lines saved | Risk | Notes |
|---|---|---|---|---|
| 1 | **F18** — add Vitest + tests for `packages/core` and queue math | +1,500 (tests) | low | **Floor done** (47 tests); extend before risky queue refactors |
| 2 | **F2** — collapse `controller.ts` to Proxy/factory | −900 | low | **Done** (~180 LOC) |
| 3 | **F3** — move ABS API into `packages/core` | −400 | low-medium | **Done** — unlocks F4 |
| 4 | **F4** — unify audiobook + podcast stores | −600 | medium | Needs F3 |
| 5 | **F5** — unify ABS / podcast / radio web players | −500 | medium | Needs F4 |
| 6 | **F11** — schema-drive visualizer form | −1,500 | low | Isolated |
| 7 | **F1** — split `apps/android/App.tsx` | 0 | low-medium per step | **~done** — F13 reducers/hooks next for Android |
| 8 | **F13** — Android root state → reducers | 0 | medium | Do *after* F1 |
| 9 | **F9** — FlashList in Android | 0 | medium | Big UX win |
| 10 | **F8 + F19** — player store derivations + computed-field cache | −300 | medium | **F19 done**; F8 snapshot + hooks done; slice split / Actions cleanup remain |
| 11 | **F6** — split `SamoAudioModule.kt` | −0 (re-distributed) | medium | Concurrency review needed |
| 12 | **F10** — split settings store | 0 | high | Incremental; do `lists` slice first |
| 13 | **F7** — remove dead `useMemo`/`useCallback`/`memo` | −1,500 | low if rule-driven | Verify compiler is live first |
| 14 | **F17** — version every persisted store | +200 (scaffolding) | low | Forward-compatible |
| 15 | **F14** — split ABS proxy from IPC | 0 | low | After F3 |
| 16 | **F21** — proxy session leak cleanup | +30 | low | Pair with F14 |
| 17 | **F12, F15, F16, F20, F23, F24** | small | low | Tidy passes |
| 18 | **F24** — lodash subpath imports | −0 | none | **Done** |
| 19 | **F22, F25** | small | low | Only if relevant context |

**Approximate total LOC delta:** roughly **−5,000 LOC** of meaningful code reduction, plus **+1,700 LOC** of tests, net **−3,300**. Excludes the gigantic `App.tsx` split which moves rather than deletes.

---

## What I deliberately did NOT recommend

- **Switching the queue from `string[] + songs: Record` to a single `QueueSong[]`.** It looks tempting but the current normalization is what lets `updateQueueFavorites` / `updateQueueSong` mutate in O(1) without touching the `default`/`shuffled` order. Don't change it.
- **Replacing `nanoid` with `crypto.randomUUID`.** `nanoid` is fine, smaller, and used everywhere consistently.
- **Migrating off Zustand.** Zustand fits this app's shape; the issues are with selectors and store sizing, not the library.
- **Animation overhauls anywhere.** Per user instruction.
- **Touching the bit-perfect / direct-PCM detection logic.** It's load-bearing, hard to verify on every device, and a regression here means broken audio. Split it (F6) but do not edit it.
- **Switching from MPV to anything else** for desktop local playback. MPV is the reason the desktop experience can claim bit-perfect — keep it.
- **Adding state-management libraries** beyond Zustand + React Query. No need.
- **Replacing `react-window` / `react-window-v2`.** Already mixing two; the v2 migration looks in-flight. Let it finish before evaluating alternatives.
- **Big rewrites of the WebPlayer crossfade math.** The crossfade and gapless logic is intricate and the kind of thing where "elegant rewrite" usually introduces clicks/pops.
