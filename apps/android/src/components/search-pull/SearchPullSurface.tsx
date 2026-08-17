import { BlurView } from 'expo-blur';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    type TextInput as TextInputType,
    TextInput,
    View,
} from 'react-native';
import Reanimated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
} from 'react-native-reanimated';

import chromeFinishTop from '../../../assets/chrome-finish-top.png';
import samoLogo from '../../../assets/samo-logo.png';
import { ClearGlyph, SearchGlyph } from '../Glyphs';
import { handleSearchOverlayQuery } from '../../handlers/search-handlers';
import { triggerImpact } from '../../services/haptics';
import {
    closeMediaDetail,
    setActiveUtilityScreen,
    useAppNavigationSelector,
} from '../../state/app-navigation';
import { finishImeControl, registerImeTarget } from '../../services/ime-control';
import { SEARCH_TRAY_BLUR_TARGET } from '../../theme/chrome-blur-targets';
import { chromeGlass, colors } from '../../theme/tokens';
import { styles } from '../../theme/styles';
import { useSearchPullContext } from './SearchPullContext';
import {
    SEARCH_PULL_HIDE_TRANSLATE,
    SEARCH_PULL_OVERSHOOT_DIP,
} from './search-pull-constants';

/** Past this reveal the surface is "open" — its scrim and field become tappable.
 *  High enough that a mid-drag reveal never steals the pull's own finger. */
const SURFACE_OPEN_AT = 0.85;

/** Reveal at which search reads as landed — the moment the arrival haptic fires.
 *  Short of 2 on purpose: the last sliver of a spring is invisible, and waiting
 *  for it is what made the tick feel late. */
const SURFACE_LANDED_AT = 1.94;

/**
 * The app-level search surface: one floating tray + field + samo-S that every
 * tab summons by over-pulling at its top, plus the scrim behind it. It is NOT
 * page content — it lives on its own layer above the tabs and reads the shared
 * `pull` value written on the UI thread by `useSearchPull`. That decoupling is
 * the whole point: it slides over the regular UI without disturbing it, and
 * without the page having to know it exists.
 *
 * It reuses the EXACT tray/field/logo styles the full-search overlay uses
 * (`homeSearchDrawer*`, `homeSearchField`), so committing into full search reads
 * as this bar coming alive on the same field row rather than a screen swap.
 */
export const SearchPullSurface = memo(function SearchPullSurface() {
    const { didSkipPeek, isPanDrivingIme, openFullSearch, pull } = useSearchPullContext();
    const [isOpen, setIsOpen] = useState(false);
    const isCommitted = useAppNavigationSelector((state) => state.isSearchOverlayOpen);
    // True from the instant the drag crosses the seat into stage two — NOT from
    // the release. Hysteresis so hovering on the threshold cannot flutter the IME.
    const [isKeyboardWanted, setIsKeyboardWanted] = useState(false);
    const query = useAppNavigationSelector((state) => state.searchOverlayQuery);
    const searchState = useAppNavigationSelector((state) => state.searchState);
    const inputRef = useRef<TextInputType>(null);
    /*
     * ANDROID 11 AND OLDER ONLY. On 12+ the tray names a BlurTarget and its
     * backdrop is a RenderNode reference, which costs nothing to keep live — so
     * `CHROME_GLASS_IS_HARDWARE` short-circuits this and the glass simply never
     * freezes.
     *
     * Below that there is no RenderEffect, so the pane falls back to the
     * software snapshot: a full redraw of the view hierarchy into a bitmap on
     * every window draw pass. This tray is mounted for the whole life of the app
     * but off the top of the screen for almost all of it, so on those devices it
     * was a second such redraw charged to every frame the app ever drew, on
     * every screen, for a surface nobody could see.
     *
     * The gate is `pull > 0` — on screen at all — rather than the app-wide "is
     * the world still" gate the dock uses, because a MOVING pane cannot be
     * frozen. The software snapshot is positioned from
     * `blurView.getLocationOnScreen()`, which tracks the animated translateY, so
     * a frozen tray keeps showing the strip it sampled when it froze; freeze it
     * while parked and it holds the region ABOVE the screen — nothing but the
     * window background — then snaps to real content the moment it thaws.
     *
     * So: nothing at rest, live while it travels.
     */
    const [isTrayOnScreen, setIsTrayOnScreen] = useState(false);
    useAnimatedReaction(
        () => pull.value > 0,
        (onScreen, previous) => {
            if (onScreen !== previous) {
                runOnJS(setIsTrayOnScreen)(onScreen);
            }
        },
    );
    // Tracks whether the keyboard was actually wanted, so the teardown below only
    // runs on a real down-transition — never at rest, and never in the window
    // between requesting control and being granted it.
    const wasKeyboardUp = useRef(false);

    // Hand the gesture a way to focus this field synchronously, so IME control is
    // always requested with an editor already focused.
    useEffect(() => {
        registerImeTarget(() => inputRef.current?.focus());
        return () => registerImeTarget(null);
    }, []);

    useAnimatedReaction(
        () => {
            'worklet';
            /*
             * Both bounds sit ABOVE the seat, and that is the whole point.
             *
             * These were 1.08 / 0.92, which straddled 1 — the bar's RESTING
             * position. Settling at the peek therefore landed inside the dead band
             * and this value latched at whatever it last was. Stuck true, the
             * field stayed focused, the teardown never ran, and the surface sat
             * there seated with a live scrim swallowing the next pull.
             *
             * A resting position must never be inside a hysteresis band.
             */
            return pull.value > 1.08 ? true : pull.value < 1.02 ? false : null;
        },
        (wanted, previous) => {
            if (wanted !== null && wanted !== previous) {
                runOnJS(setIsKeyboardWanted)(wanted);
            }
        },
    );

    useEffect(() => {
        /*
         * The keyboard belongs to the GESTURE, not to the release. It starts
         * rising the moment the drag crosses into stage two, alongside the search
         * screen the same drag is bringing in — and if the drag backs out, it goes
         * straight back down. Previously it waited for the release, so the single
         * biggest thing on screen appeared after the interaction was over, with no
         * way to change your mind about it.
         *
         * This is as close to the finger as this library reaches: it exposes the
         * IME's real position (useReanimatedKeyboardAnimation) and worklet-level
         * keyboard events, but no supported way to drive the IME open frame by
         * frame from a pan. That needs WindowInsetsAnimationController through a
         * native module of our own.
         */
        if (isCommitted && didSkipPeek) {
            /*
             * A fling that skipped stage two, or a tap on the resting bar. No IME
             * control session was ever opened for those, so there is nothing
             * holding the keyboard and it has to be raised the ordinary way.
             * `showSoftInputOnFocus` is true by now (isCommitted), so a fresh
             * focus brings it up with the system's own animation — which is the
             * right behaviour here precisely BECAUSE there was no finger tracking
             * it to match.
             */
            // No blur first: on this path the field was never focused, so a blur
            // is at best a no-op and at worst dismisses a keyboard that is already
            // correct. `editable` only turns true in THIS render, and focusing a
            // still-not-editable TextInput silently does nothing — hence the tick
            // of delay and the retry.
            const raise = setTimeout(() => inputRef.current?.focus(), 60);
            const retry = setTimeout(() => {
                if (!inputRef.current?.isFocused()) {
                    inputRef.current?.focus();
                }
            }, 240);
            return () => {
                clearTimeout(raise);
                clearTimeout(retry);
            };
        }
        if (isKeyboardWanted || isCommitted) {
            // Focus only to give the IME a TARGET — `showSoftInputOnFocus` is
            // false until commit, so this does not raise the keyboard. Its
            // position belongs to SamoImeControl, driven per frame by the pan.
            //
            // Guarded on isFocused(): a REDUNDANT focus is not free. The system
            // cancels an in-flight control session the instant anything else
            // touches the IME, so re-focusing on commit killed the session before
            // finish(true) could land, and the keyboard fell straight back down
            // after a drag that had just carried it all the way up.
            wasKeyboardUp.current = true;
            if (!inputRef.current?.isFocused()) {
                inputRef.current?.focus();
            }
            return;
        }
        if (isPanDrivingIme.value) {
            /*
             * A FINGER IS STILL ON THE GLASS AND OWNS THE KEYBOARD. Leave it alone.
             *
             * `isKeyboardWanted` going false does not distinguish "the user is
             * done" from "the drag dipped back under the seat on its way to
             * somewhere else", and this branch treated them identically: it
             * finished the IME session and blurred the field mid-gesture. Blurring
             * makes the system CANCEL a live control session, so the pan carried on
             * pushing fractions into a controller that no longer existed and the
             * keyboard went dead until the finger lifted — reproducibly, from the
             * second time you crossed the seat in one drag.
             *
             * The pan releases its own session on every terminal path, and on a
             * mid-gesture retreat too, so nothing leaks by deferring to it.
             */
            return;
        }
        if (!wasKeyboardUp.current) {
            /*
             * Nothing to tear down. This branch also runs at rest and on every
             * unrelated dep change, and it used to call finishImeControl()
             * unconditionally — which landed 78ms into a live gesture, right
             * between requesting control and being granted it. A finish() there
             * either no-ops (masking the problem) or destroys a session the
             * gesture is about to need.
             */
            return;
        }
        wasKeyboardUp.current = false;
        /*
         * ORDER MATTERS. Release control at HIDDEN first, then drop focus.
         *
         * Blurring while a control session is live makes the system CANCEL it,
         * and a cancelled session restores the IME to its pre-control state —
         * which, mid-dismiss, was shown. That is the flash: the keyboard springs
         * back up for a frame the instant it reaches the bottom, then the blur
         * puts it away again. Finishing explicitly at hidden means there is no
         * state left to restore.
         */
        finishImeControl(false);
        inputRef.current?.blur();
    }, [didSkipPeek, isCommitted, isKeyboardWanted, isPanDrivingIme]);

    // The bar is ONE object. It slides down from behind the top edge already
    // assembled — field, magnifier, label and samo-S are just parts of it, not
    // separate actors with their own entrances. Nothing scales, nothing pops,
    // nothing staggers.
    //
    // This used to be six independently choreographed `useAnimatedStyle`s (tray
    // fade, field scale-in, glyph pop, label slide, logo scale, scrim). That
    // reads as a showreel rather than a control, and it was six worklets
    // recomputing per frame instead of two. A search bar should behave like a
    // drawer being pulled: it tracks the thumb, and where you let go is where
    // it stays.
    // TRANSFORM ONLY — do not add `opacity` here. The tray below is a real
    // BlurView, and an animated opacity < 1 on an ancestor forces Android to
    // composite this subtree into an offscreen layer, which breaks the blur's
    // snapshot draw (the dock records the same hard rule, learned twice on
    // device). The surface starts fully off the top edge anyway, so it has
    // nothing to fade from: it slides, like a real object entering the frame.
    const surfaceStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateY: interpolate(
                    pull.value,
                    [0, 1, 2],
                    // Stage one carries the bar down to its seat. Stage two barely
                    // moves it: by then the bar has arrived, and the travel belongs
                    // to search coming in behind it.
                    [SEARCH_PULL_HIDE_TRANSLATE, 0, SEARCH_PULL_OVERSHOOT_DIP],
                    Extrapolation.CLAMP,
                ),
            },
        ],
    }));
    /*
     * The landing tick: search has ARRIVED. Fired on the reveal crossing rather
     * than on a spring's completion callback, because a critically damped spring
     * reaches numerical rest a long moment after it looks stopped — hanging the
     * haptic there made it fire late, after both the surface and the keyboard had
     * already settled. 1.94 is the point the motion reads as landed.
     *
     * Only on the way UP, and only from one place, so a retract or a re-entry
     * cannot double-tick.
     */
    useAnimatedReaction(
        () => pull.value >= SURFACE_LANDED_AT,
        (landed, previous) => {
            if (landed && previous === false) {
                runOnJS(triggerImpact)('medium');
            }
        },
    );

    // Flip interactivity once the surface is essentially open. Below that the
    // scrim and field stay untouchable so the page underneath — and the pull's
    // own finger — are never intercepted.
    useAnimatedReaction(
        () => pull.value > SURFACE_OPEN_AT,
        (open, previous) => {
            if (open !== previous) {
                runOnJS(setIsOpen)(open);
            }
        },
    );

    const openSettings = () => {
        triggerImpact('light');
        setActiveUtilityScreen('settings');
        closeMediaDetail();
    };

    return (
        <Reanimated.View
            pointerEvents={isOpen ? 'box-none' : 'none'}
            style={[styles.searchPullSurface, surfaceStyle]}
        >
            <View style={styles.homeSearchDrawer}>
                {/* The glass slab, same recipe as the bottom dock: real GPU
                    blur of the page beneath, then a breath of pure-black
                    smoke so the field and label stay legible over busy
                    artwork. Decoration only — pointerEvents="none". */}
                <View
                    pointerEvents="none"
                    style={[styles.homeSearchDrawerTray, styles.homeSearchDrawerTrayOverlay]}
                >
                    <BlurView
                        {...chromeGlass}
                        blurTarget={SEARCH_TRAY_BLUR_TARGET}
                        blurMethod="dimezisBlurView"
                        style={StyleSheet.absoluteFill}
                        tint="systemChromeMaterialDark"
                    />
                    <View style={[StyleSheet.absoluteFill, styles.chromeSmoke]} />
                    {/* The FINISH — warm gold breath, ivory edge sheen and
                        film grain, as one pre-dithered PNG (scripts/
                        gen-dock-finish.js). This is the third layer of the
                        dock's recipe and the one that was missing: blur and
                        smoke alone are just dark glass, this is what gives
                        the navbar and mini player their actual character.
                        fadeDuration 0 — otherwise Android fades it in over
                        300ms every time the surface mounts. */}
                    <Image
                        accessibilityIgnoresInvertColors
                        fadeDuration={0}
                        resizeMode="stretch"
                        source={chromeFinishTop}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
                {/*
                 * THE ONLY SEARCH FIELD IN THE APP. There is no second one on
                 * the overlay and nothing is ever handed over.
                 *
                 * It used to be a label here and a TextInput there, both at
                 * these same coordinates, crossfading — which is why the field,
                 * the magnifier and the samo-S all visibly doubled on the way
                 * into search. One element cannot crossfade with itself: at
                 * rest it is a disabled input showing its placeholder, and
                 * committing just makes it editable and focuses it. Same
                 * object, start to finish.
                 */}
                <View style={styles.homeSearchFieldWrap}>
                    <View style={styles.homeSearchField}>
                        <SearchGlyph color={colors.muted} />
                        <TextInput
                            autoCapitalize="none"
                            /* ALWAYS editable. Focus is what gives Android an
                               editor to animate, and a non-editable TextInput
                               cannot be focused — so gating this meant the
                               control request at the seat crossing was denied
                               for having no target. Stray taps are already
                               blocked by the Pressable covering the pill until
                               commit, and `showSoftInputOnFocus` keeps the
                               system from raising the keyboard on its own. */
                            /* False until commit so focusing during the drag
                               gives the IME a target without raising it — its
                               position belongs to SamoImeControl until then.
                               NOTE: tying this to didSkipPeek instead breaks
                               the fling path; measured, don't. */
                            showSoftInputOnFocus={isCommitted}
                            onChangeText={handleSearchOverlayQuery}
                            placeholder="Search your library"
                            placeholderTextColor={colors.muted}
                            ref={inputRef}
                            returnKeyType="search"
                            style={styles.searchOverlayInput}
                            value={query}
                        />
                        {isCommitted && searchState.status === 'loading' ? (
                            <ActivityIndicator color={colors.accent} size="small" />
                        ) : isCommitted && query.length > 0 ? (
                            <Pressable
                                accessibilityLabel="Clear"
                                hitSlop={8}
                                onPress={() => handleSearchOverlayQuery('')}
                            >
                                <ClearGlyph color={colors.muted} />
                            </Pressable>
                        ) : null}
                    </View>
                    {/* Before commit the input is inert, so the whole pill is
                        one tap target that opens search the same way the pull
                        does — rather than focusing the field early and raising
                        a keyboard nobody asked for. */}
                    {isCommitted ? null : (
                        <Pressable
                            accessibilityLabel="Search your library"
                            accessibilityRole="button"
                            onPress={openFullSearch}
                            style={StyleSheet.absoluteFill}
                        />
                    )}
                </View>
                <Pressable
                    accessibilityLabel="Settings"
                    accessibilityRole="button"
                    onPress={openSettings}
                    style={({ pressed }) => [
                        styles.homeSearchLogoButton,
                        pressed && styles.homeSearchFieldPressed,
                    ]}
                >
                    <Image source={samoLogo} style={styles.homeSearchLogo} />
                </Pressable>
            </View>
        </Reanimated.View>
    );
});
