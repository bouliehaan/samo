# Developing samo

Building the app from source. If you only want to *use* samo, you want the APK
or the DMG from [Releases](https://github.com/bouliehaan/samo/releases/latest) —
see the [README](../README.md). Nothing here is an install path.

## Building

Node 20+ and [pnpm](https://pnpm.io). For Android, JDK 17 and the Android SDK —
Android Studio's bundled JDK works, the `android` scripts point at it.

```bash
pnpm install
pnpm dev                              # desktop, in development
pnpm run package:mac                  # package for the current platform

cd apps/android && pnpm run android   # debug build onto a connected device
cd apps/android && pnpm run android:release   # release APK
```

Gates, all of which should be green before a change lands:

```bash
pnpm run lint                            # typecheck + ESLint + Stylelint
pnpm test
cd apps/android && pnpm run verify       # typecheck + lint for Android
```

## Layout

```
src/            Desktop app (Electron: main, preload, renderer, shared)
apps/android/   Android app (React Native + Expo, bare workflow)
packages/core/  @samo/core — server client and media mapping shared by both
```

Both clients talk to the same `@samo/core`, so server behaviour is defined once
and they inherit it together.
