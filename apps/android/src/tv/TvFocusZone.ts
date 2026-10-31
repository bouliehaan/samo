import { type ReactNode } from 'react';
import { requireNativeComponent, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A region D-pad focus leaves only through a gate (`SamoTvFocusZone.kt`).
 * Android's focus search is global geometry, so without it Up from a page's
 * top row lands on whichever rail icon is nearest, and Left from near the top
 * edge on the rail's first icon. A move that would leave goes to the gate
 * given for its direction — a view's native tag — or nowhere.
 */
export const TvFocusZone = requireNativeComponent<{
    children: ReactNode;
    /** Under a menu or panel: nothing in here can take focus. */
    covered?: boolean;
    gateLeft?: number;
    gateRight?: number;
    style?: StyleProp<ViewStyle>;
}>('SamoTvFocusZone');
