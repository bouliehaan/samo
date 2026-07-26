import { memo, type ReactNode } from 'react';
import { type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { cascadeWindow, stage, stages, stageTravel } from '../theme/choreography';

/** Stage names a caller can ask for by hierarchy rather than by number. */
export type ChoreographyStage = 'follow' | 'lead' | 'trail';

/**
 * One part of a choreographed surface — it finds its own slice of the shared
 * clock and animates itself into place.
 *
 * Wrap the parts of an entrance in hierarchy order and the surface assembles
 * itself instead of arriving as a slab:
 *
 *     const clock = useChoreography(detail.id);
 *     <Choreographed clock={clock} stage="lead">   <Cover /></Choreographed>
 *     <Choreographed clock={clock} stage="follow"> <Title /></Choreographed>
 *     <Choreographed clock={clock} stage="trail">  <Actions /></Choreographed>
 *
 * The cost of one of these is a single `useAnimatedStyle` doing two clamps and
 * an interpolate on the UI thread. There is no animation of its own, no timer,
 * and no JS involvement after mount — which is what makes it safe to wrap
 * dozens of list rows in.
 */
export const Choreographed = memo(function Choreographed({
    cascadeIndex,
    children,
    clock,
    onLayout,
    stage: stageName = 'lead',
    style,
}: {
    /** List position. When set, the row takes a capped cascade slot instead of
     *  a named stage — see cascadeWindow for why the cap exists. */
    cascadeIndex?: number;
    children: ReactNode;
    clock: SharedValue<number>;
    /**
     * Forwarded to the wrapper, and it MUST be used that way whenever the
     * wrapped child previously carried an `onLayout` of its own.
     * `nativeEvent.layout.y` is measured against the direct PARENT, so moving a
     * child inside a new wrapper silently re-bases its y to ~0 — the wrapper
     * now occupies the child's old slot in the flex flow, so measuring here is
     * what keeps the number meaning what it used to mean. (Transforms never
     * affect layout, so an in-flight entrance does not perturb the reading.)
     */
    onLayout?: (event: LayoutChangeEvent) => void;
    stage?: ChoreographyStage;
    style?: StyleProp<ViewStyle>;
}) {
    // `isLead` decides whether this part also scales. Only the heavy element
    // gets it: a cover settling the last few percent toward the viewer reads as
    // depth, whereas scaling text is just blurry text — Android composites the
    // scaled layer from a texture rasterized at the pre-scale size, so animated
    // type visibly softens for the length of the transition.
    const isLead = cascadeIndex === undefined && stageName === 'lead';
    const window = cascadeIndex === undefined ? stages[stageName] : cascadeWindow(cascadeIndex);
    const distance = cascadeIndex === undefined ? stageTravel[stageName] : stageTravel.cascade;

    const animatedStyle = useAnimatedStyle(() => {
        const t = stage(clock.value, window);
        const translateY = (1 - t) * distance;
        return {
            opacity: t,
            transform: isLead ? [{ translateY }, { scale: 0.97 + t * 0.03 }] : [{ translateY }],
        };
    });

    return (
        <Reanimated.View onLayout={onLayout} style={[style, animatedStyle]}>
            {children}
        </Reanimated.View>
    );
});
