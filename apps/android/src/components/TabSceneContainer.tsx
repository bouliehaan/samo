import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Freeze } from 'react-freeze';
import { Animated, Easing } from 'react-native';

import { durations, travel } from '../theme/motion';
import { styles } from '../theme/styles';

/** Slack past the incoming scene's last animated frame before the outgoing one
 *  is dropped, so nothing is pulled out from under a dissolve still running. */
const REST_SLACK_MS = 30;
/** When the outgoing scene is provably invisible: fully covered by the
 *  incoming one, which is opaque and has finished dissolving in. */
const COVERED_MS = durations.sceneEnter + REST_SLACK_MS;

/**
 * One tab scene layer: a GPU-cheap dissolve (opacity + a few px of rise) on tab
 * switches.
 *
 * Scenes mount once and then rest FROZEN (react-freeze) while hidden: React
 * suspends the subtree, so background tabs pay nothing on store updates, their
 * native views are hidden by Suspense, and all state survives — revisiting a
 * tab is an instant thaw, never a remount.
 *
 * THIS IS THE ONLY NON-REANIMATED ANIMATION IN THE APP, and it is deliberate.
 * Reanimated applies animated props through the shadow tree, and its commit
 * hook re-applies ALL of them on every commit so React cannot clobber them —
 * so the cost of any commit scales with the total number of mounted
 * `useAnimatedStyle`s anywhere on screen, not with how many are moving. A tab
 * switch churns React state (`setResting`, the TabScenes re-render), and each
 * of those commits used to drag every other animated node in the app through
 * it. The native driver updates view properties directly on the UI thread and
 * never touches the shadow tree, so the dissolve no longer pays for anything
 * but itself: measured over four switches, ~48,000 Fabric mount instructions
 * → ~13,900 (-71%), and slow-UI-thread frames 69/75/85 → 19/21/19.
 * `opacity` and `translateY` are both native-driver-safe, and
 * `Easing.out(Easing.cubic)` is the identical curve to `easings.emphasized`.
 * Do not "modernise" this back onto Reanimated.
 *
 * Two rules guard old bugs:
 * - Resting is driven by a JS timeout cancelled on re-activation, never by an
 *   animation-completion callback. A completion callback lands on the JS queue
 *   asynchronously, so it can apply a stale "rest" AFTER the scene
 *   re-activated — blanking the visible tab.
 * - The wrapper holds pointerEvents:'none' whenever inactive: the outgoing
 *   scene stays visible through its brief fade-out, and an opacity-0
 *   ScrollView on Android lets taps fall through to its children (the
 *   historical "Home tap plays radio" bug).
 */
export const TabSceneContainer = memo(
    ({
        children,
        isActive,
        keepWarm,
        reducedMotion,
    }: {
        children: ReactNode;
        isActive: boolean;
        /** The tab we just came from — held thawed so going back is instant. */
        keepWarm: boolean;
        reducedMotion: boolean;
    }) => {
        const [resting, setResting] = useState(!isActive);
        const progressRef = useRef<Animated.Value | null>(null);
        if (progressRef.current === null) {
            progressRef.current = new Animated.Value(isActive ? 1 : 0);
        }
        const progress = progressRef.current;
        const dropRef = useRef<Animated.CompositeAnimation | null>(null);

        // PASS 1 — the thaw/rest gate. Activating ONLY thaws; the entrance
        // itself belongs to pass 2.
        useEffect(() => {
            if (isActive) {
                // Cancel a covered-drop queued by a previous deactivation, and
                // cancel ONLY that. Two traps here, both hit on the way in:
                //
                // - It cannot be left to be superseded. `Animated.delay`
                //   animates a throwaway value rather than this one, so while
                //   the sequence sits in its delay nothing is attached to
                //   `progress` — pass 2 starting the entrance does not stop it,
                //   and it fires afterwards and slams the now-visible scene to
                //   opacity 0. That is the historical blank-tab bug.
                // - It must NOT be a blanket `progress.stopAnimation()`. This
                //   effect re-runs on `keepWarm`, and TabScenes assigns
                //   `warmTab` in an effect AFTER the switch — so the tab that
                //   just became active sees keepWarm flip true→false mid-
                //   entrance. A blanket stop freezes the dissolve partway and
                //   the tab stays permanently dimmed.
                dropRef.current?.stop();
                dropRef.current = null;
                setResting(false);
                return;
            }

            // THE OUTGOING SCENE DOES NOT FADE. It holds full opacity and lets
            // the incoming scene — which carries its own opaque background —
            // dissolve in on top of it. Fading both is what put a dark flash in
            // the middle of every tab switch: two half-transparent layers over
            // the near-black app background composite to something darker than
            // either screen, so a switch read as a blink rather than a change.
            // Measured on Home → Playlists: 88 luma to 34 and back up to 41,
            // when neither screen is ever darker than 41.
            //
            // Not fading it also takes the exit off the critical path entirely.
            // The switch now costs exactly one enter, not an exit plus an enter.
            if (reducedMotion) {
                progress.setValue(0);
                if (!keepWarm) {
                    setResting(true);
                }
                return;
            }

            // Dropped only once it is provably covered — invisible either way,
            // but it stops a full-screen opaque layer from drawing behind the
            // active one. The whole sequence is handed to the native driver up
            // front, so it still lands on time even if the JS thread is busy;
            // re-activating stops it via the handle held above.
            const drop = Animated.sequence([
                Animated.delay(COVERED_MS),
                Animated.timing(progress, {
                    duration: 0,
                    toValue: 0,
                    useNativeDriver: true,
                }),
            ]);
            dropRef.current = drop;
            drop.start();

            if (keepWarm) {
                return () => drop.stop();
            }
            const restTimer = setTimeout(() => setResting(true), COVERED_MS);
            return () => {
                clearTimeout(restTimer);
                drop.stop();
            };
        }, [isActive, keepWarm, progress, reducedMotion]);

        // PASS 2 — the entrance dissolve, started only once the scene has
        // actually thawed and committed.
        //
        // `setResting(false)` lifts a react-freeze Suspense boundary, and
        // React only re-renders and re-commits that whole subtree on a LATER
        // pass. Starting the 170ms fade next to it — which is what this
        // component used to do — runs the dissolve against a subtree that is
        // still suspended: on a first visit to a heavy tab (a FlashList of
        // covers, a hero image) the thaw comfortably outlasts the fade, so
        // the dissolve finishes on nothing and the content appears fully
        // opaque a beat later. Revisiting the same tab is then perfectly
        // smooth, because it is already warm — which is exactly why this
        // reads as random flakiness rather than as a bug.
        //
        // Keyed on `resting`, the order is forced: thaw commits first, then
        // the clock starts, and the fade has real views to act on for its
        // whole duration. Switching back to a tab that never got as far as
        // resting re-runs this on the `isActive` dep and starts immediately —
        // correct, since nothing needs thawing.
        useEffect(() => {
            if (!isActive || resting) {
                return;
            }
            if (reducedMotion) {
                progress.setValue(1);
                return;
            }
            Animated.timing(progress, {
                duration: durations.sceneEnter,
                easing: Easing.out(Easing.cubic),
                toValue: 1,
                useNativeDriver: true,
            }).start();
        }, [isActive, progress, reducedMotion, resting]);

        // Memoised because `interpolate` allocates a new animated node every
        // time it is called, and under the native driver each one is a fresh
        // node graph pushed across the bridge. Rebuilding it on every render
        // would hand the dissolve a different node mid-flight.
        const animatedStyle = useMemo(
            () => ({
                opacity: progress,
                transform: [
                    {
                        translateY: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [travel.scene, 0],
                        }),
                    },
                ],
            }),
            [progress],
        );

        return (
            <Animated.View
                pointerEvents={isActive ? 'auto' : 'none'}
                style={[
                    styles.tabScene,
                    isActive ? styles.tabSceneOnTop : null,
                    animatedStyle,
                ]}
            >
                <Freeze freeze={resting}>{children}</Freeze>
            </Animated.View>
        );
    },
);

TabSceneContainer.displayName = 'TabSceneContainer';
