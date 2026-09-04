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

## The one exception: identifiers

Code identifiers follow their language's convention, not the wordmark.

| keep | because |
|---|---|
| `SamoAudioEngine`, `SamoPlaybackService`, … (23 Kotlin classes) | PascalCase is Kotlin's rule |
| `SamoRadioPanel`, `SamoRadioVolumeSlider` | PascalCase is React's rule |
| `bouliehaan.Samo` in `publish-winget.yml` | a package-registry ID; renaming orphans the published package |
| `rootProject.name` in `settings.gradle` | internal Gradle name, never rendered |
| `patches/expo-blur@*.patch` | must byte-match upstream or it stops applying |

**The test:** if a human reads it, it is lowercase. If a compiler reads it, it follows
the language.

## Checking it

`git grep -w` — **not** a `\b` regex in Python, which silently misses CJK-adjacent
text like `清除Samo快取` because CJK codepoints are word characters on both sides.

```sh
git grep -lw 'Samo' | grep -v '\.kt$'    # should list only the exceptions above
grep -rn 'Samo' src/i18n/locales/         # plain substring, for the CJK cases
gh api repos/bouliehaan/samo/releases --jq '.[] | .name'
gh repo view bouliehaan/samo --json description -q .description
```

Release notes and repo descriptions live on GitHub, not in the tree — `git grep`
will never see them. Check them separately.
