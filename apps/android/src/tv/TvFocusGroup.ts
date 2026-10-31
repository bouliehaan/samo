import { type ReactNode } from 'react';
import { requireNativeComponent, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A row of controls D-pad focus enters at its selected control, else its
 * first (`SamoTvFocusGroup.kt`), instead of whichever is nearest to where
 * focus came from. Moves within the row are Android's own.
 *
 * In a module of its own, like `TvFocusZone`: Fast Refresh re-running a
 * module that calls `requireNativeComponent` registers the view twice.
 */
export const TvFocusGroup = requireNativeComponent<{
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
}>('SamoTvFocusGroup');
