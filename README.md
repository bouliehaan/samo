# samo

A self-hosted listening client for music, audiobooks, podcasts, and radio — one library, one queue, one history, on the desktop and on Android.

samo is the client half of a pair. The server half is [samo-server](https://github.com/bouliehaan/samo-server) — a native media server, not a wrapper around other servers: the four media kinds are first-class domains that share playback state, recents, and browsing, instead of being stapled together in the client.

samo began as a fork of [Feishin](https://github.com/jeffvli/feishin) and keeps its GPL-3.0 licence. See [Credits](#credits).

## Status

Honest state of things, so nobody installs this expecting a finished product:

| Part | State |
|------|-------|
| **Android app** | The most actively developed surface. Native ExoPlayer engine, offline downloads, Chromecast, on-device catalog mirror. |
| **`@samo/core`** | samo-only. Shared server client, playback and media-detail mapping, covered by tests. |
| **Desktop (Electron)** | samo-only. Single API controller, no multi-backend abstraction. |

This is a personal project developed in the open. There is no stability promise and no migration guarantee between versions yet.

## Layout

```
src/            Desktop app (Electron: main, preload, renderer, shared)
apps/android/   Android app (React Native + Expo, bare workflow)
packages/core/  @samo/core — server client and media mapping shared by both
```

The Android app talks to the same `@samo/core` as the desktop, so server behaviour is defined once and both clients inherit it.

## Requirements

- Node 20+ and [pnpm](https://pnpm.io)
- A running [samo-server](https://github.com/bouliehaan/samo-server)
- For Android: JDK 17 and the Android SDK (Android Studio's bundled JDK works — the `android` scripts point at it)

## Getting started

```bash
pnpm install
```

### Desktop

```bash
pnpm dev
```

Package a build for the current platform:

```bash
pnpm run package:mac
```

`package:win` and `package:linux` are also available. The macOS build checks for a bundled mpv first (`pnpm run check:mpv:mac`).

### Android

```bash
cd apps/android
pnpm run android
```

That builds and installs a debug APK on the connected device or emulator. For a release APK:

```bash
cd apps/android
pnpm run android:release
```

## Checks

Everything below should be green before a change lands.

```bash
pnpm run lint
```

Runs typecheck, ESLint and Stylelint across the desktop app and `@samo/core`.

```bash
pnpm test
```

```bash
cd apps/android && pnpm run verify
```

Typecheck plus lint for the Android app specifically. `pnpm test` there runs the Android unit suite.

## Design notes

Some of the reasoning behind the client is written down rather than left in commit history:

- [`docs/ANDROID_ARCHITECTURE_STATUS.md`](docs/ANDROID_ARCHITECTURE_STATUS.md) — the Android layering: module stores, module-function handlers, self-subscribing hosts.
- [`docs/PERFORMANCE_AND_NETWORK.md`](docs/PERFORMANCE_AND_NETWORK.md) — where the app spends time and what it does about it.
- [`docs/MOTION_PRINCIPLES.md`](docs/MOTION_PRINCIPLES.md) — Disney's twelve principles, how each one maps to a screen, and where each lives in the code.
- [`apps/android/src/theme/motion.ts`](apps/android/src/theme/motion.ts) — the motion vocabulary and the constraints every animation is written against.
- [`apps/android/src/theme/choreography.ts`](apps/android/src/theme/choreography.ts) — how multi-part surfaces enter.

## Credits

samo began as a fork of **[Feishin](https://github.com/jeffvli/feishin)** by [Jeff Vialpando (jeffvli)](https://github.com/jeffvli), and would not exist without it. The desktop app still carries a great deal of Feishin's architecture and code.

Bundled typefaces:

- **Bricolage Grotesque** — SIL Open Font License 1.1 ([licence text](assets/fonts/BricolageGrotesque-OFL.txt))
- **Archivo**, **Office Code Pro** — see their respective licences

## Licence

[GPL-3.0-only](LICENSE), inherited from Feishin.
