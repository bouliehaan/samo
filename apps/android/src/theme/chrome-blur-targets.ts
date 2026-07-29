import { createRef } from 'react';
import type { View } from 'react-native';

/**
 * The two pieces of content the app's glass panes sample.
 *
 * A `BlurTargetView` records its own draw pass into a RenderNode so a `BlurView`
 * can reference it instead of redrawing the view hierarchy into a software
 * bitmap every frame. The pane and its target must be in DIFFERENT branches of
 * the tree — a blur inside the content it samples would be sampling itself — so
 * they are matched by these refs rather than by nesting. App.tsx is the only
 * place that mounts them.
 *
 * These are module-level refs rather than a prop or context for exactly the
 * reason they used to be module-level string ids: a pane is nowhere near its
 * target in the tree (BottomChromeBackdrop and SearchPullSurface are siblings
 * of the targets, not descendants), so the only shared ancestor is the shell
 * itself, and threading a value through it would re-render the whole app to
 * hand two leaves a value that never changes.
 *
 * There are two rather than one because the panes want different content:
 *
 *   The DOCK sits at the bottom over everything, so it samples the page, the
 *   overlays, both scrims AND the full-search results.
 *
 *   The TRAY slides down over the page and is itself above the search results,
 *   so it samples everything up to and including the search scrim, and stops
 *   short of the results list.
 *
 * The dock's target contains the tray's target, and contains the tray's own
 * BlurView too — which is fine and deliberate. A target may hold other targets
 * and other panes; the only rule is that it must not hold a pane that names it.
 */
export const DOCK_BLUR_TARGET = createRef<View>();
export const SEARCH_TRAY_BLUR_TARGET = createRef<View>();
