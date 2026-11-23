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
- The TV stays on while samo plays, the way it does for live TV: no screensaver
  and no sleep. Pausing, the end of the queue, or a sleep timer hand it back to
  its own idle timers (`tv/tv-screen-awake.ts`, `SamoScreenAwake.kt`).
- Radio stations and samo-radio device controls: pause/resume, skip, volume,
  tuning, return to station, standby, and keeping an eligible airing track.
- A glyph rail: the samo mark, the destinations, the cover of what is playing
  (Now Playing, with a dot while it plays) and Settings. The page shown is lit;
  focus names its destination in a label beside the rail.
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
the IME, and media-session keys retain native handling; a text field's arrows
are still reported, so leaving it counts as the person's move. Every
control has an accessibility label and draws its own focus (see "Drawing focus
and moving the page"). The covered browse surface stays mounted but hidden, retaining scroll position and
filter and focus state. Back closes the menu, player, detail, or View All in
that order. From content it moves to the rail; from the rail it returns Home,
then lets Android background the task. The system keyboard
handles Back before app navigation, and a field's `next` moves on with the
keyboard's Next key, since an open keyboard owns the D-pad.

`TvFocusScope` places focus. Until the person moves, focus follows the scope's
`defaultFocus`, so a control that arrives late (a discovered server, a loaded
row) still gets it; once they move, their control is kept and restored when the
surface is shown again, such as closing a detail returns to the tile that
opened it. A detail page beneath a nested one keeps its place too (Back from an
album returns to the artist's album tile, from Go to Album to the track). A
placement is owed only until the person presses an arrow: one still waiting
for its control (a detail loading) is dropped rather than pulling focus back.
Home starts on the hero's action, else the first cover.

The rail and the content are each a `SamoTvFocusZone`, a native view that
D-pad focus leaves only through the invisible guide on the seam between them;
Up and Down never leave either side. The guide hands focus on to the content's
remembered control or the rail's current page. Inside a zone a sideways move
keeps to its line, so Left from a button beside a cover goes to the rail rather
than to a cover in the row below, and Up or Down stays in its list while the
list has somewhere to go. The player and the menus are outside both zones and
use Android's own search.

Eight things make all of that harder than it looks, and each has already cost a
bug:

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
- **It usually parks that focus on the seam guide**, the first focusable view
  left in the hierarchy. Opening or closing any detail does this. Read as a
  crossing, it sent focus to the rail while the detail placed its own, and the
  later of the two won. A crossing is now only a guide focus with a Left or
  Right press still landing; parked focus goes back to the side it belongs on,
  or waits on the rail's current page while a detail loads or after it fails.
- **Focus search is global geometry.** Up from a page's top row found the
  nearest rail icon, and Left from near the top edge found Search before the
  screen-tall guide, which is scored from its centre. The zones route every
  exit through the guide instead.
- **A covered surface ignores focus events.** Its controls only receive focus
  while Android clears it away from them; recording that would send Back to
  wherever Android happened to put it. The scope learns it is covered in a
  layout effect, before those events can arrive.
- **A React Native scroll view answers a focus search on its way up.** When the
  zone's choice lies outside the list, the list substitutes its own nearest
  control by geometry alone. `SamoTvFocusable` therefore asks its zone
  directly, without going through its parents.
- **A React Native list scrolls itself by jumps.** `ScrollView.arrowScroll` and
  its scroll-to-child moved the list in one frame on every press. The TV's
  lists no longer take the D-pad (`TV_LIST_PROPS`); each control reveals
  itself instead.
- **Rows a list has scrolled away keep their places** just off its edge, behind
  whatever is fixed there. Up from a row on Home found the filter pills, which
  looked nearer than the rows scrolled up under them, so an Up or Down move
  searches its list before the zone.

### Drawing focus and moving the page

Every control is a `SamoTvFocusable` (`TvFocusable.ts`; `TvPressable` and
`TvButton` in `TvControls.tsx`), a native view that draws its own focus on the
UI thread. The ring is silver and set off by a hair. Covers and buttons also
lift; rows fill instead and stay put. The looks are `tvFocus` in
`tv-styles.ts`. When focus moves, React re-renders only the rail's label and
the seek bar's hint. A control can keep a direction for itself with `pin`, as
the seek bar keeps Left and Right for scrubbing.

The ring is drawn outside the control. So a shelf reaches out under the rail,
pads its covers by `TV_ROW_BLEED` above and below, and starts them at the
keyline. A list edge that cuts into that margin cuts the ring, which is how a
focused cover once lost its left side at the row boundary.

Focus moves and the page follows. A control that gains focus smoothly scrolls
each list it is in to its anchor:

- Covers glide to the keyline (`anchorX` = `TV_GUTTER`), where the shelf's
  title starts, and the covers before it slide out under the rail.
- A shelf brings its covers to `TV_SHELF_ANCHOR_Y`, which puts its title at
  the top of the safe area, or to `TV_HOME_SHELF_ANCHOR_Y` beneath Home's
  filters. Grid rows use `TV_GRID_ANCHOR_Y`. A page's first row anchors to
  `TV_ANCHOR_TOP`, bringing the header back with it.
- A control without an anchor scrolls only as far as its `scrollMargin`
  needs.
- `TvTopFade` covers only the overscan (`TV_SAFE_Y`), above where a focused
  row's title sits.

Entering a shelf from above or below lands on the cover at the keyline
(`TvFocusGroup`'s `entryInset`), not on whichever cover is level with the
control that focus left.

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

The TV uses the app's typefaces: Bricolage for headings, Archivo for text, and
Office Code Pro for metadata. Its surfaces are the page's own dark, so the
covers supply the colour.

The player gives artwork and metadata their own columns. Shuffle, previous,
play/pause, next, and repeat sit centred under the seek bar. Until something
loads in a launch, the player shows what played last, with Play alone under
the title to resume it. Up Next swaps the artwork for the queue. Up Next and
More Options sit in a separate footer, so longer titles and enlarged system
text do not compete with secondary controls. Shuffle and repeat show a dot
while on. Only the seek bar subscribes to playback position updates.

Radio separates playback on this TV from control of a connected stereo. Device
cards group transport, volume, and the Stations/Options entry points in one strip.
Station and device menus render at the app root, within the activity's window,
so the existing remote key bridge, focus containment, and Back handling remain
available. Covered scopes remove their buttons and fields from Android's focus
graph, so a remote cannot land on a control behind an open panel. Closing a panel
restores the page's remembered control. Errors and keep-in-library feedback remain
visible in the panel.

Home, detail, and player presentations do not decode a second enlarged, blurred
cover as a backdrop. They use solid surfaces or a static native gradient, and
covers keep the shared image component's RGB decoding. There are no
continuously animated backgrounds, blur passes, or polling intervals. Station
menus, the queue, grids, and track lists remain virtualized, and Home's shelves
remain bounded previews.

Covers are fetched at their size. `ArtworkImage`'s `width` asks samo-server for
the rung of its resize ladder (64 to 1024 px) that covers the slot at the
screen's density (`utils/artwork-size.ts`). On a 1080p TV a 144dp cover asks
for 384px, where originals run to 3000px. The managed cover cache is warmed
with the whole library after a sync. On TV it stores that same 384px rendition
(`COVER_CACHE_WIDTH`) and records the width in its index (`coverWidth`). A
cache filled at another width is dropped once and refilled by the next sync.
Phones keep caching originals, because `COVER_CACHE_WIDTH` is unset there.

Frame costs, measured on an emulator with a debug build (the onn box is
slower):

- Mounting one cover costs about 4 to 5 ms: its text, its image view and first
  decode, and its focusable. So shelves mount six covers and then one per batch
  (`maxToRenderPerBatch={1}`), and grids one row of five per batch.
- Home mounts two shelves, then the rest one per batch once it has drawn
  (`windowSize={21}` spans every shelf). When a shelf mounted only as it
  scrolled into view, its title and six covers landed in the same frame as a
  move down's glide: 28 ms.
- While a list glides, React Native syncs its scroll position into Fabric's
  state every frame. That sync cannot be throttled without patching React
  Native. The JS scroll events can be, and are, to 100 ms
  (`scrollEventThrottle`): the native view animates the glide, and React needs
  positions only for windowing.

Clipped views remain attached for native D-pad navigation. The first mirror
paint also establishes Home's account identity, so the later saved-session
validation refresh keeps that page mounted; switching accounts still clears it,
and late reads cannot restore the previous account.

When checking visual changes on an onn box, also test its enlarged system text
setting (130%), long track titles, the bottom overscan margin, and a station menu
long enough to scroll. Verify Back and Done both restore the initiating control.
