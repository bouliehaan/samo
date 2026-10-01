# Android TV

Android phone and TV use the same APK (`app.samo.android`). Android's TV device
mode selects `TvApp` through `Platform.isTV`; screen width is not used to identify
a television. MainActivity selects landscape on TV and retains portrait on phones.
The APK declares optional Leanback support, a TV launcher banner, and no required
touchscreen, location sensor, or Wi-Fi hardware.

## Shared behavior, separate presentation

```
macOS renderer ──────────────────────────────── @samo/core
                                                    │
Android App (session restoration, catalog sync, fonts, PlaybackEngine)
    ├── phone presentation                          │
    └── src/tv/ presentation ── Android handlers/services/stores
                                      │
                           Kotlin catalog + Media3 playback
```

TV is a presentation layer under `apps/android/src/tv`, not another copy of the
app or its server client. It uses the existing authentication, secure session
storage, catalog mirror, artwork component, search, media selection, queue,
resume/progress synchronization, and native playback engine. Phone gesture hosts,
bottom sheets, player dock, and onboarding overlays do not mount on TV.
`@samo/core` stays independent of React and either platform's navigation UI.

The TV screens include:

- Sign-in without typing: autodiscovery plus a pairing code (below), with a
  typed address and password as the fallback; saved-session restoration.
- Home uses the phone's shared home derive, with All/Music/Podcasts/Audiobooks/Radio
  filters, horizontal cover shelves, and the featured hero. Shelves have no page
  buttons; View All opens the complete, virtualized collection.
- Complete local collections for albums, artists, playlists, books, and podcasts.
- Search through the existing local/server search pipeline.
- Artwork-led media details, related shelves, and virtualized track/episode lists.
- Hold OK on media for Play, Shuffle, favorites, queue actions, downloads, and
  sending to a connected samo-radio. Details also expose Play and Shuffle.
- Full-screen Now Playing opens when playback starts and focuses Play/Pause.
  It includes previous/next, seeking with Left/Right, shuffle, repeat, and Up Next.
- Radio stations and samo-radio device controls: pause/resume, skip, volume,
  tuning, return to station, standby, and keeping an eligible airing track.
- A compact glyph rail and the samo S in the top-right corner.
- Disconnecting a server.

## Signing in

A remote is a miserable keyboard, so the TV asks for neither an address nor a
password:

1. **Discovery.** The same UDP probe the phone uses (`useServerDiscovery`,
   answered by samo-server on `7360/udp`) lists servers on the network. Focus
   moves to the first one the moment it appears.
2. **Pairing.** Selecting it asks the server for a code
   (`services/device-pairing.ts`, state in `state/device-pairing.ts`). The TV
   shows the code, the approval address, and a QR code of that address with the
   code in its fragment (`/pair#code=…`).
3. **Approval.** Someone signed in scans the QR code or opens the address,
   checks the code matches, and approves. The TV notices by polling, adopts the
   session through `acceptServerAuthentication` (the same ending a password
   login has), and opens the library without another press.

The TV receives a device token of its own, labelled `samo Android TV`, which
can be revoked from the account's tokens in the server's web UI; a revoked TV
returns to sign-in saying its session expired. The protocol and its limits are
in samo-server's `docs/api.md` ("Device pairing").

Polling holds while the app is in the background, backs off while the server
cannot be reached (the code stays on screen), and follows the server's pace
otherwise. An expired, declined, or failed code offers a new one; a server from
before pairing, which answers `405`, offers the password route instead, as
does a "Use a password instead" button throughout. A server still in first-run
setup is refused a code and the TV points at its `/setup` page.

## Focus

Controls use native Android spatial focus. MainActivity forwards TV key events
on `samoTvKey`; select is completed in JS on release, so a held OK opens a menu
without also clicking the item. Native key-repeat timing handles Android's hold
threshold, with a timer fallback for remotes that do not repeat. Text inputs,
the IME, and media-session keys retain native handling. Every
button and field has a visible focus border and accessibility label. The
covered browse surface stays mounted but hidden, retaining scroll position and
filter and focus state. Back closes the menu, player, detail, or View All in
that order. From content it moves to the rail; from the rail it returns Home,
then lets Android background the task. The system keyboard
handles Back before app navigation, and a field's `next` moves on with the
keyboard's Next key, since an open keyboard owns the D-pad.

`TvFocusScope` places focus. Until the person moves, focus follows the scope's
`defaultFocus`, so a control that arrives late (a discovered server, a loaded
row) still gets it; once they move, their control is kept and restored when the
surface is shown again, such as closing a detail returns to the tile that
opened it. Three things make that harder than it looks, and each has already
cost a bug:

- **`hasTVPreferredFocus` is sticky under Fabric.** `setNativeProps` values are
  kept on the node and re-applied with every later update, each time as a fresh
  `requestFocus()`. A button placed once would pull focus back whenever it
  re-rendered (its own blur restyles it), and two such buttons pass focus
  between themselves. `TvButton` withdraws the request as soon as focus arrives
  or leaves. View's imperative `focus()` would not linger, but it sits behind
  the `enableImperativeFocus` feature flag, which is off.
- **Android moves focus by itself** when a focused view is hidden or removed,
  through the same `onFocus` a D-pad press uses. A move only counts as the
  person's once the scope's own placement has landed.
- **A covered surface ignores focus events.** Its controls only receive focus
  while Android clears it away from them; recording that would send Back to
  wherever Android happened to put it. The scope learns it is covered in a
  layout effect, before those events can arrive.

Large grids and track lists virtualize rows without detaching clipped views, so
native D-pad focus can reach the next row before scrolling. Track selection
uses its original index in the displayed ordering. The TV uses the Android
color/font tokens, artwork, and glyphs.

## Build and validation

The existing Android 12 / API 31 minimum still applies. Older Android TV devices
need a separate compatibility decision; this foundation does not lower the
phone app's SDK floor or change the React Native runtime.

```bash
pnpm -C apps/android run verify
pnpm -C apps/android run test
pnpm -C apps/android run android:build

# Native tests (JDK 17+ / Android SDK required)
cd apps/android/android
./gradlew :app:testDebugUnitTest
```

Create an Android TV emulator with API 31 or later, or connect a TV over ADB.
Start Metro with `pnpm -C apps/android start`, install the debug APK, and open samo
from the TV launcher. The debug APK is at
`apps/android/android/app/build/outputs/apk/debug/app-debug.apk`. The existing
release command bundles JavaScript and enforces the existing signing policy.
No separate TV build flavor or dependency installation is needed.

An emulator reaches the Mac at `10.0.2.2`, so a server on the Mac is entered as
`10.0.2.2:<port>`. Discovery cannot be seen there: the emulator's NAT does not
carry UDP broadcasts, so on an emulator the server list stays empty and only a
real TV on the server's network exercises it. Drive the remote with
`adb shell input keyevent DPAD_UP|DPAD_DOWN|DPAD_LEFT|DPAD_RIGHT|DPAD_CENTER|BACK`.

Before shipping, run the following with a D-pad only:

1. Cold launch without a saved session, on the server's network: the server
   appears and takes focus. Select it, scan the QR code with a phone, sign in
   there if asked, and approve; the TV opens the library with no further press.
2. Decline a code, let one expire, and restart the server mid-code; each says
   so and offers a new code. With the server down, the code stays up with
   "Still trying". Enter an address by hand, and sign in with a password using
   the keyboard's Next and Go.
3. Navigate every rail destination and focus every actionable control, including
   items below the fold and later collection pages. Focus must never jump back.
4. Open an album, play a later-page track, then Back; confirm focus, page, and
   scroll position return to the selected browse item.
5. Exercise nested artist/album details, search, empty collections, loading, and
   server errors; refresh while the selected item disappears.
6. Play music, a book, a podcast, and a live station. Check resume positions,
   transport controls, physical remote media keys, and playback after Home/Back.
7. Relaunch with a saved session; revoke the TV's token in the web UI and
   relaunch (it returns to sign-in, saying the session expired); disconnect and
   sign in again.
8. Repeat on a phone to verify the original portrait shell and touch gestures.

The TV intentionally omits actions that would open a phone-only secondary
sheet. Playlist creation/editing sheets, information sheets, download management,
and the complete settings screens still need TV presentations. Playback,
shuffle, queue actions, favorites, download actions, and samo-radio control use
the same handlers as the phone.

Manifest requirements follow the [Android TV setup guide](https://developer.android.com/training/tv/get-started/create).

## TV visual design and resource budget

The player gives artwork and metadata their own columns, with shuffle, previous,
play/pause, next, and repeat on one transport row. Up Next and More Options live
in a separate footer so longer titles and enlarged system text do not compete
with secondary controls. Focus uses a light fill or an outline; shuffle and repeat
also carry a persistent selected dot. The seek bar alone subscribes to playback
position updates.

Radio separates playback on this TV from control of a connected stereo. Device
cards group transport, volume, and the Stations/Options entry points in one strip.
Station and device menus render at the app root, within the activity's window,
so the existing remote key bridge, focus containment, and Back handling remain
available. Covered scopes remove their buttons and fields from Android's focus
graph, so a remote cannot land on a control behind an open panel. Closing a panel
restores the page's remembered control. Errors and keep-in-library feedback remain
visible in the panel.

Home, detail, and player presentations do not decode a second enlarged, blurred
cover as a backdrop. They use solid surfaces or a static native gradient; covers
retain the shared image component's RGB decoding and cache behavior. There are
no new dependencies, continuously animated backgrounds, blur passes, or polling
intervals. Station menus, the queue, grids, and track lists remain virtualized.
Home shelves retain their existing bounded previews and focus animation.

Home virtualizes both its vertical shelves and their horizontal covers. It
mounts two shelves and six covers per shelf initially, then fills nearby content
in small batches as you scroll. There is no idle callback that mounts the entire
page after the first paint. Clipped views remain attached for native D-pad
navigation. The first mirror paint also establishes Home's account identity, so
the later saved-session validation refresh keeps that page mounted; switching
accounts still clears it, and late reads cannot restore the previous account.

When checking visual changes on an onn box, also test its enlarged system text
setting (130%), long track titles, the bottom overscan margin, and a station menu
long enough to scroll. Verify Back and Done both restore the initiating control.
