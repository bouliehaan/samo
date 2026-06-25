# Desktop (Electron) → Samo-only conversion — follow-up plan

**Status:** NOT started (deferred 2026-06-19). Android + `packages/core` are DONE and verified
Samo-only; this doc is the remaining desktop work.

## Goal
Remove every non-Samo backend from the Electron desktop app (`src/`): **Audiobookshelf,
Jellyfin, Navidrome, Subsonic**. Leave **Samo only**. End state = `pnpm typecheck` green
(`tsconfig.web.json` + `tsconfig.node.json`) with zero `audiobookshelf|jellyfin|navidrome|subsonic`
references.

## Why it doesn't compile right now
The desktop re-exports core's `ServerType` (`src/shared/types/domain-types.ts:23`
`export { ServerType } from '@samo/core/server'`). Core's enum is now `{ SAMO }` only
(ABS + Jellyfin removed during the android work), so every desktop reference to
`ServerType.AUDIOBOOKSHELF` / `.JELLYFIN` is now a type error. Combined with Gemini's
half-finished navidrome/subsonic removal, that's **~122 errors (≈100 web + ≈22 node)**.
The desktop did **not** compile before this work either.

## ⚠️ The one non-mechanical part: long-form is built on ABS types
The desktop's audiobook/podcast subsystem is a Feishin legacy that uses
**Audiobookshelf-named types as its canonical shape**, with Samo bolted on. These files import
BOTH `audiobookshelfController` AND Samo helpers (`resolveSamoAudiobookPlaySession`,
`patchSamoPlayback`, `samo-audiobook-stream`) and branch on `server.type`/`isSamoLongFormServer`:

- `src/renderer/store/abs-playback.store.ts`  (base long-form playback store)
- `src/renderer/store/abs-playback-sync.ts`   (progress sync — Samo via `patchSamoPlayback`)
- `src/renderer/store/audiobook.store.ts`      (plays ABS **and** Samo audiobooks)
- `src/renderer/store/podcast.store.ts`        (ABS **and** Samo podcasts)
- `src/renderer/store/audiobook-chapters.ts`   (uses `AudiobookshelfChapter`)
- `src/renderer/features/audiobooks/routes/audiobooks-route.tsx`
- `src/renderer/features/podcasts/routes/{podcast-detail-route,podcasts-route}.tsx`
- `src/renderer/features/player/components/{audio-players,long-form-player-artwork}.tsx`

**Safe approach (rename, don't redesign):** the shared types in
`src/shared/api/audiobookshelf/audiobookshelf-types.ts` that the Samo path actually uses —
`AudiobookshelfLibraryItem`, `AudiobookshelfPodcastEpisode`, `AudiobookshelfChapter`,
`AudiobookshelfMetadata`, `AudiobookshelfMediaProgress` — should be **renamed to neutral names**
(`LongFormLibraryItem`, `LongFormPodcastEpisode`, `LongFormChapter`, …) and **relocated** to e.g.
`src/shared/api/long-form-types.ts`, **keeping the exact field shapes** (zero runtime change).
The pure ABS-REST types in that file (`AudiobookshelfLibrariesResponse`, `…LoginResponse`,
`…PlaybackSessionResponse`, `…PlaybackSessionSyncRequest`, `…PlaybackAudioTrack`,
`…LibraryItemsResponse`, `…Library`) are ABS-only → delete with the ABS controller. Then strip
the `audiobookshelfController` branches from the stores/routes, keep the Samo branches.

This part should be done **with the mapping workflow + adversarial verify** (saved script:
`.claude/.../workflows/scripts/desktop-samo-only-map-wf_331acee5-582.js`) once subagents are
off the session rate limit — blind solo re-typing of these stores is where a subtle Samo
desktop-playback regression would hide.

## Whole-delete (no Samo code inside — verified)
Dirs:
- `src/renderer/api/audiobookshelf/`
- `src/renderer/api/jellyfin/`
- `src/shared/api/audiobookshelf/`  *(after rescuing the shared long-form types above)*
- `src/shared/api/jellyfin/`
- `src/main/features/core/audiobookshelf/`  (ABS IPC + proxy)

Standalone backend-only files:
- `src/preload/audiobookshelf.ts`
- `src/renderer/features/home/components/home-abs-favorites.tsx`
- `src/renderer/features/search/components/abs-cover-image.tsx`
- `src/renderer/features/albums/components/{jellyfin,navidrome,subsonic}-album-filters.tsx`
- `src/renderer/features/songs/components/{jellyfin,navidrome,subsonic}-song-filters.tsx`

## Strip-to-Samo (remove non-Samo branches/imports/options, keep Samo)
- `src/renderer/api/controller.ts` — endpoints map → `{ [ServerType.SAMO]: SamoController }` only;
  drop `audiobookshelfController` + `JellyfinController` imports.
- `src/renderer/features/login/routes/login-route.tsx` — drop ABS/Jellyfin icon+label maps.
- `src/renderer/features/servers/components/{add-server-form,edit-server-form,server-list}.tsx`
- `src/renderer/features/action-required/components/server-required.tsx`
- `src/renderer/features/sidebar/components/{collapsed-sidebar,library-sidebar,server-selector,server-selector-items}.tsx`
- `src/renderer/store/auth.store.ts` (ABS/Jellyfin type guards)
- `src/renderer/store/{library-favorites,play-history}.store.ts`
- `src/renderer/features/player/hooks/{use-autosave,use-scrobble,use-remember-music-session,use-restore-last-playback-session}.ts`
- `src/renderer/hooks/{use-server-authenticated,use-now-playing}.ts`
- `src/renderer/features/discord-rpc/use-discord-rpc.ts`
- `src/renderer/features/shared/components/{list-filters,list-sort-by-dropdown}.tsx`
  (also has Gemini's `containerRef`/`source`/`*_LIST_FILTERS` codemod breakage to repair)
- `src/renderer/features/playlists/components/{create-playlist-form,update-playlist-form}.tsx`
- `src/renderer/remote/components/remote-container.tsx`
- `src/renderer/features/context-menu/context-menu-controller.tsx`
- `src/renderer/features/search/components/global-search-bar.tsx` + `…/hooks/use-unified-search.ts`
- `src/renderer/features/sharing/components/share-item-context-modal.tsx`
- `src/renderer/utils/linkify.tsx`
- `src/renderer/features/home/components/home-media-sections.tsx`
- `src/renderer/features/player/components/shuffle-all-modal.tsx`
- `src/renderer/features/albums/components/album-detail-content.tsx`
- `src/renderer/features/artists/components/album-artist-detail-content.tsx`
- `src/renderer/features/lyrics/api/lyrics-api.ts`
- `src/shared/api/utils.ts`
- `src/shared/types/{domain-types,types}.ts` — drop ABS/Jellyfin-specific type shapes/branches.

## Electron main + preload (IPC removed in all layers together)
- `src/main/features/core/index.ts`, `src/main/features/core/autodiscover/index.ts`
- `src/main/features/linux/mpris.ts`
- `src/preload/{index.ts,index.d.ts,ipc.ts,local-settings.ts}` — drop the `audiobookshelf` IPC bridge.

## Recommended execution order
1. Rescue + rename shared long-form types → `long-form-types.ts` (neutral), update importers.
2. Delete the whole-delete dirs/files.
3. `controller.ts` → Samo-only endpoints map.
4. Strip ABS+Jellyfin branches everywhere (compiler-guided: `tsc -p tsconfig.web.json --composite false`
   and `tsc -p tsconfig.node.json --composite false` as the worklist).
5. Repair Gemini's navidrome/subsonic codemod casualties (`list-sort-by-dropdown.tsx` missing
   `containerRef`/`source`/`ALBUM_ARTIST_LIST_FILTERS`/`PLAYLIST_SONG_LIST_FILTERS`,
   `playlist-query-builder.tsx`, dead `*Icon`/`*Filters` imports).
6. Remove ABS IPC across main↔preload↔renderer.
7. Green both typechecks; run the desktop test suite; adversarial-verify the Samo long-form path.

## Also: repo hygiene (root)
Gemini left throwaway codemod scripts at the repo root that should be deleted once the desktop is
done: `fix-*.js`, `nuke-renderer*.js`, `clean-unused-ts.js`, `final-cleanup.js` (all untracked).
