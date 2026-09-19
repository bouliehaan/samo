# The name is `samo`

**Lowercase. Always. Everywhere a person reads it.**

Never `Samo`. Never `SAMO`. Not in a wordmark, a window title, a launcher label,
a button, a heading, an error message, a permission prompt, a release title, a
repo description or a commit message.

## Why it is not a style preference

**SAMO©** was the graffiti tag of Jean-Michel Basquiat and Al Diaz in late-1970s
New York. This project is named in deference to that, not in imitation of it. We
are not as great. We are inspired by them. We are not the proper SAMO.

So capitalising it is not a typo — it is a claim the project has no right to make.
Treat it as a factual error, and fix it.

## Where this has actually been broken before

Prose is easy to keep right and was never the problem. Every real violation has
been somewhere nobody thinks to grep (all of these were live until 2026-09-04):

- `apps/android/.../res/values/strings.xml` → `app_name` — **the launcher icon**
- `apps/android/app.json` → `expo.name` — regenerates `strings.xml` on prebuild
- `electron-builder.yml` → `productName` — **overrides `package.json`**, which was
  already lowercase. Also drives `artifactName`, `shortcutName`, `uninstallDisplayName`
- `electron-builder.yml` → `NSLocalNetworkUsageDescription` — a macOS permission dialog
- `src/main/features/linux/mpris.ts` → `identity` / `name` — desktop media controls
- `samo.desktop.tmpl` → `Name=` / `Keywords=` — the Linux app menu
- `org.bouliehaan.samo.metainfo.xml` → `<name>` — appstream / software centres
- `src/remote/manifest.json`, `src/remote/index.html` — the remote web app + PWA
- `web.vite.config.ts` → PWA `name` / `short_name`
- `src/i18n/locales/*.json` — translated UI copy
- **GitHub release titles and release notes**, and repo descriptions
- `src/renderer/features/login/...` → a hardcoded `serverDisplayName = 'Samo'`

And the ones that survived that sweep, live until 2026-09-18, because the sweep
skipped `.kt` files wholesale on the grounds that Kotlin class names are
identifiers — and took the string literals inside them along for the ride:

- `SamoDownloadService.kt` → `setContentTitle("Downloading in Samo")` — **the
  download notification**
- `SamoCatalogSyncWorker.kt` → `setContentTitle("Samo Sync")` — the catalog sync
  notification
- `SamoPlaybackService.kt`, `SamoMediaNotificationProvider.kt` → `"Samo"` as the
  media notification's title before metadata lands
- `SamoAudioEngine.kt` (×5), `SamoCastSessionManager.kt` → `"Samo"` as the
  fallback track title on the lock screen, Bluetooth displays and the Cast
  receiver
- two `Log.*` lines — read by a person in logcat, so in scope too
- **the saved session's title** — `packages/core/src/server/server-samo.ts` writes
  `samo: <name>` at login, but a session is never re-titled after that, so every
  phone signed in before the sweep kept showing `Samo: jake` in Settings. No grep
  finds stored data; `normalizeAuthenticationResult` now rewrites the old prefix
  on load. When a template changes, ask where its old output is still stored.

## The one exception: identifiers

Code identifiers follow their language's convention, not the wordmark.

| keep | because |
|---|---|
| `SamoAudioEngine`, `SamoPlaybackService`, … (23 Kotlin classes) | PascalCase is Kotlin's rule — **the class name only**; a string literal inside the class is copy, see below |
| `ServerType.SAMO` (its value is `'samo'`) | UPPER_CASE is TypeScript's enum rule |
| `SamoRadioPanel`, `SamoRadioVolumeSlider` | PascalCase is React's rule |
| `bouliehaan.Samo` in `publish-winget.yml` | a package-registry ID; renaming orphans the published package |
| `rootProject.name` in `settings.gradle` | internal Gradle name, never rendered |
| `patches/expo-blur@*.patch` | must byte-match upstream or it stops applying |

**The test:** if a human reads it, it is lowercase. If a compiler reads it, it follows
the language.

That test is applied per *token*, not per file. A `.kt` file is not "code the
compiler reads": `class SamoDownloadService` is, and `"Downloading in Samo"` three
lines below it is a sentence the user sees in the notification shade. Every
`setContentTitle` / `setContentText`, notification channel name and description,
`Toast`, `Snackbar`, dialog string, media-metadata fallback and log message in
Kotlin or Java is copy, and the sweep covers it. Comments are prose, and prose was
never the problem.

## Checking it

`git grep -w` — **not** a `\b` regex in Python, which silently misses CJK-adjacent
text like `清除Samo快取` because CJK codepoints are word characters on both sides.

```sh
# Everything but Kotlin/Java, minus the ServerType enum: the lines that come
# back must all be in the exceptions table (winget id, rootProject.name, patch).
git grep -nw -e 'Samo' -e 'SAMO' -- ':!*.kt' ':!*.java' ':!docs/NAMING.md' \
  | grep -v -e 'ServerType\.SAMO' -e "SAMO = 'samo'"

# Kotlin/Java: the word inside a string literal. Identifiers never match -w
# (SamoAudioEngine is one word); this filter drops the comments. Must be EMPTY.
git grep -nw -e 'Samo' -e 'SAMO' -- '*.kt' '*.java' \
  | perl -ne 'print if /"(?:[^"\\]|\\.)*\b(?:Samo|SAMO)\b(?:[^"\\]|\\.)*"/'

# Android resources, the cast receiver, and app.json (regenerates strings.xml).
git grep -nw -e 'Samo' -e 'SAMO' -- apps/android/android/app/src/main/res \
  apps/android/cast-receiver apps/android/app.json

grep -rn 'Samo' src/i18n/locales/         # plain substring, for the CJK cases
gh api repos/bouliehaan/samo/releases --jq '.[] | .name'
gh repo view bouliehaan/samo --json description -q .description
```

Do not put `grep -v '\.kt$'` back. Excluding a file type because its *identifiers*
are exempt is how the download notification shipped capitalised for two weeks.

Release notes and repo descriptions live on GitHub, not in the tree — `git grep`
will never see them. Check them separately.
