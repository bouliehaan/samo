# Bundled macOS MPV

samo macOS release builds bundle MPV so desktop music playback does not depend on Homebrew or any user-installed binary.

Current bundled version: `mpv v0.41.0` from the official `mpv-player/mpv` GitHub release.

Bundled release assets:

- Apple Silicon: `mpv-v0.41.0-macos-14-arm.zip`
  - SHA-256: `5c96f9b21355fc0a11d2e2161ad65f33031070e9fb3f6bd9865fb459b94587e6`
- Intel: `mpv-v0.41.0-macos-15-intel.zip`
  - SHA-256: `41003617ab4f7784394b5ddea7ce51b3e0838e8cfc8166ad1a378b2eda3b583c`

Layout — one directory per packaged architecture, named to match electron-builder's `${arch}` macro:

- `resources/bin/darwin/arm64/mpv`: Apple Silicon binary.
- `resources/bin/darwin/arm64/lib`: dynamic libraries used by the Apple Silicon binary.
- `resources/bin/darwin/x64/mpv`: Intel binary.
- `resources/bin/darwin/x64/lib`: dynamic libraries used by the Intel binary.

`electron-builder.yml` packs `resources/bin/darwin/${arch}` into `bin`, so each build carries **only** its own architecture and both resolve to the same packaged paths:

- `process.resourcesPath/bin/mpv`
- `process.resourcesPath/bin/lib`

Neither tree is a fallback for the other. The previous layout put arm64 at the darwin root and nested x64 beneath it as an "Intel backup", and shipped both into both DMGs — so every Apple Silicon build carried a 112 MB Intel mpv it could never execute. If you add an architecture, add a sibling directory named exactly as electron-builder spells that arch.

Do not blindly copy `/opt/homebrew/bin/mpv` into this directory. Homebrew MPV builds are commonly dynamically linked against `/opt/homebrew` or `/usr/local` libraries that will not exist on a user's machine. Use a portable/self-contained MPV build, then verify it with:

```sh
pnpm run check:mpv:mac
otool -L resources/bin/darwin/arm64/mpv
otool -L resources/bin/darwin/x64/mpv
```

The check script fails when either binary is missing, is not executable, has the wrong architecture, is missing required bundled libraries, uses unresolved `@rpath` dependencies, or links directly to Homebrew/local library paths.

The official macOS app bundle may contain build-environment `LC_RPATH` entries, but the actual linked libraries must resolve through `@executable_path/lib` or system paths. If a future MPV build links directly to `/opt/homebrew` or `/usr/local`, do not release it; use a portable/self-contained MPV build instead.
