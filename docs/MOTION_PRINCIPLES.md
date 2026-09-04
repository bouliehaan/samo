# Motion principles

Every animation in samo is written against Disney's twelve principles. This is the
rule, not an aspiration: if a motion cannot be justified against one of them, it is
decoration and it does not ship.

Most of them were already being followed before they were written down — the tokens
in [`theme/motion.ts`](../apps/android/src/theme/motion.ts) and the staging in
[`theme/choreography.ts`](../apps/android/src/theme/choreography.ts) arrived at them
from first principles. This document names them, says where each one lives, and is honest
about what each one cost. As of 2026-09-04 all twelve are implemented.

The twelve are Thomas and Johnston's, from *The Illusion of Life* (1981). They are
about drawn characters; a screen is not a character. The translation is what matters,
and each entry below states it.

---

## 1. Squash and stretch

*Mass deforms under force, and the amount it deforms tells you what it is made of.*

**In samo:** `presses` in `motion.ts`. A surface sinks and dims under a finger by an
amount calibrated to **what kind of object it is**, and the four values are explicitly
not interchangeable:

| surface | `scaleTo` | why |
|---|---|---|
| tile | 0.96 | a card you could pick up — the deepest sink |
| control | 0.90 | small round chrome, so it takes a larger ratio to read at all |
| hero | 0.985 | same weight of answer, a fraction of the travel |
| row | 1.00 | **no sink** — a row is part of a column, and scaling one breaks the column's edge |

The row case is the principle applied correctly rather than uniformly: the highlight
fill carries the whole response, because deforming one row would deform the column.

## 2. Anticipation

*A movement is preceded by a small preparation in the opposite direction.*

**In samo:** `anticipation` in `motion.ts`, wired into `PressableScale`.

A long press holds the finger down for 500ms, and the surface used to spend all of it
frozen at full press depth saying nothing. It now keeps loading across that window —
`pressed` travels past 1 to `anticipation.peak` (1.35) over `holdMs` (420ms), reaching
the peak and going **still** before the menu fires, so the release reads as caused by
the wind-up rather than coincident with it.

Because the press styles are linear in `pressed` (`scale: 1 - pressed * (1 - scaleTo)`),
this extends the depth that already exists rather than introducing a second scale to keep
in sync. At the tile preset it is the difference between a 4% and a 5.4% sink — near the
floor of what the eye registers, because it must read as *loading*, not as *more pressing*.

**It is confined to the held gesture, and that is the principle applied rather than
obeyed.** Winding up before a **tap** would spend the opening frames moving away from what
the user asked for — the exact frames where a tap gets confirmed. Principle 6 wins that
argument, which is why `emphasized` is ease-out and `durations.press` is 90ms. A long press
has no such conflict: the finger is already committed, and the wait was dead air. It also
answers "did my long-press register?" with no extra chrome.

## 3. Staging

*Direct the eye. One idea at a time, unmistakably presented.*

**In samo:** `travel` in `motion.ts`, and the whole stage hierarchy in `choreography.ts`.
Displacements are small on purpose — scene 6dp, screen 16dp, sheet 28dp — because
"a short displacement paired with an opacity ramp gives the eye a direction to follow
without ever making the user wait for a journey." Long slides read as the surface having
to *catch up* to the tap.

## 4. Straight ahead action, and pose to pose

*Draw frame-by-frame and discover the motion, or plan the key poses and fill between.*

**In samo:** this is the `springs` vs `timings` split, and the mapping is exact.

- **Straight ahead → springs.** Anything a finger can grab, interrupt or fling. A spring
  retargets from its **current velocity**; it has no plan, it resolves forces frame by
  frame. That is why an interrupted spring feels physical.
- **Pose to pose → timings.** Scripted transitions with known start and end poses. A
  timing curve restarts from zero, which is the "rubber band snapping" feel on a fast
  double-tap — and precisely why it must never be used on gesture-driven motion.

Choosing the wrong one is the single most common cause of an interaction feeling wrong
while every individual frame is correct.

## 5. Follow through, and overlapping action

*The parts of a body do not stop together. A hand moves before the fingers; the cloth
arrives last.*

**In samo:** `choreography.ts`, in full. This is the only principle that was already
named in the code, and the module exists entirely to serve it.

Stage windows **overlap on purpose** — `lead [0, 0.62]`, `follow [0.12, 0.78]`,
`trail [0.22, 0.88]` — because non-overlapping windows produce a mechanical one-two-three
march. And travel distances **increase** down the hierarchy (lead 10dp → trail 24dp),
which is the counter-intuitive half: the heavy part is the one being driven, so it barely
displaces, while the light parts trailing off it whip further.

## 6. Slow in and slow out

*Things accelerate and decelerate. Nothing in the world starts at full speed.*

**In samo:** `easings`, and the asymmetry is load-bearing.

- `emphasized` — ease-**out**. Everything the user is *waiting for*. An ease-in entrance
  spends its opening frames nearly motionless and reads as lag no matter how short it is.
- `exit` — ease-**in**. A surface leaving should commit to leaving; the frames near the
  end are the ones nobody needs to see.
- `standard` — symmetric, and **only** for continuous or looping motion.

The master choreography clock is the deliberate exception: it runs **linear**, and each
stage eases its own local 0→1. Ease the master instead and every later stage inherits a
distorted velocity profile, so parts that should arrive gently slam in at whatever speed
the clock happened to be travelling when their window opened.

## 7. Arc

*Living things move on curved paths. Only machinery travels in straight lines.*

**In samo:** `theme/arc.ts`, wired into `ArtworkZoomModal`.

The rule everywhere else still holds: single-axis motion travels straight, and bending a
sheet rising from the bottom edge would read as drift, not life. Arc earns its keep the
moment something moves **diagonally** — and there, both axes on one spring draws a
perfectly straight diagonal, the one path nothing physical takes. Zoomed artwork returning
to centre did exactly that.

**An arc is two eased channels, not a path.** The 60fps contract permits only `transform`
and `opacity`, so rather than sampling a parametric curve every frame, the two axes get
*different* springs — `ARC_LEAD_SPRING` (stiffness 300) and `ARC_TRAIL_SPRING` (210). While
x is most of the way home and y has barely started, the point is off the straight line
between start and end, and that displacement **is** the arc.

**The axis with further to travel leads.** That is how a thrown object behaves — it commits
to the direction it was thrown and the smaller component resolves late — so the bow always
opens the same way relative to the motion, and two dismissals from opposite corners feel
like one physics rather than two animations. Ties go to x, deterministically, because a
45° throw has no dominant axis and a float coin flip is worse than a consistent answer.

The two springs are kept within 2× stiffness of each other on purpose, and the trail is
never underdamped relative to the lead. Push them apart and it stops reading as one object
on a curved path and becomes two things landing near each other; underdamp the trail and
the curve turns into a bounce. Both are pinned by tests in `theme/arc.test.ts`.

## 8. Secondary action

*A supporting motion that reinforces the main one without competing with it.*

**In samo:** present but unnamed. `durations.scrim` (140ms) fades a backdrop while the
sheet itself rises on `springs.sheet` — two motions, one event, and the scrim is
deliberately a *timing* while the sheet is a *spring* so the backdrop never competes for
attention with the thing arriving.

**The rule, now written into `motion.ts`:** a secondary action must differ from its primary
in **both property and curve**.

- Different **property**, so the two are not the same gesture drawn twice. The scrim moves
  `opacity`; the sheet moves `transform`.
- Different **curve**, so they cannot phase-lock. The scrim is a `timing` and the sheet is a
  `spring` — one has a fixed duration, the other resolves out of its own velocity, so they
  never arrive on the same frame however the surface is dismissed.

Share either and the eye fuses them into one flat event, which is worse than having no
secondary action at all: the supporting motion becomes cost that makes the primary read as
heavier than it is.

There is deliberately **no token** for this. It is a constraint on how the existing tokens
are combined, and a `secondary` object would be a value nothing reads pretending to be a rule.

## 9. Timing

*How many frames a motion takes is what gives it weight and meaning.*

**In samo:** `durations`, and the enter/exit asymmetry is the whole point:

> The user is waiting on the thing arriving (so it must confirm their tap immediately)
> and has already moved on from the thing leaving (so it must get out of the way).
> Symmetric durations are what make an app feel sluggish on the back button.

screenEnter 200 / screenExit 120. sceneEnter 140 — the most-repeated transition in the
app, sitting at the fast end of the budget because it also has to pay for React thawing
the incoming scene, and enter + thaw together must land inside the ~220ms a caused
interaction gets.

`CHOREOGRAPHY_MS` is 320, and the ceiling is stated: past ~400ms an assembly stops
reading as physics and starts reading as waiting.

## 10. Exaggeration

*Push past the literal to make the intent read.*

**In samo:** `springs.sheet` (damping 22, mass 0.8) carries a touch of overshoot "so the
surface reads as having mass and momentum rather than being teleported into place."

Held deliberately tight everywhere else — `springs.settle` is critically damped-ish
because "wobble on a 24dp icon reads as jelly, not as quality." Exaggeration is spent on
large surfaces that should feel heavy, and withheld from small chrome that should feel
precise.

## 11. Solid drawing

*Weight, volume and balance that stay consistent from every angle.*

**In samo:** this one lives outside `motion.ts` — it is the elevation ladder and the
surface treatments in `theme/styles/`, plus the blur/glass work on the dock. The motion
system's contribution is that press depth is keyed to surface kind (principle 1), so an
object's apparent mass is the same whether it is sitting still or being touched.

## 12. Appeal

*The thing has to be worth looking at.*

**In samo:** the monochrome palette, the typeface pairing, the glass dock, the artwork
treatment. Not a motion concern, but it is the reason the motion budget exists at all.

---

## What this costs, and why it is still 60fps

None of the above is allowed to break the contract in
[`motion.ts`](../apps/android/src/theme/motion.ts):

1. Animate **only** `opacity` and `transform` — both GPU-composited. Animating
   width/height/margin/top re-runs Yoga layout on the shadow tree every frame.
2. Drive from a Reanimated shared value inside `useAnimatedStyle`, so interpolation runs
   on the UI thread and an animation in flight is immune to the JS thread.
3. Never `runOnJS` or `setState` per frame. Cross-thread hops are for edges only.
4. Pay mount cost **before** the animation, never during.

Choreography obeys this by using exactly **one** animated value per surface — a linear
clock — with each part deriving local progress through `stage()`, a pure worklet doing one
clamp and one interpolate. Twelve parts cost one animation and twelve trivial worklets.
Adding parts is free, and nothing can drift because there is only one source of time.

The cascade is capped at `CASCADE_MAX = 8` for the same reason: uncapped, row 300 of a
400-track album would be eighteen seconds into the future, still fading in long after the
user began scrolling.
