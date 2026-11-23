import { requireNativeComponent, type ViewProps } from 'react-native';

/**
 * What focus does to a control, drawn by the control itself on the UI thread
 * (`SamoTvFocusable.kt`): never React state, so a D-pad move costs no render.
 * Colours are processed ARGB ints (see `tvFocusLook`).
 */
export type TvFocusLook = {
    /** Fill under the control's content while focused. */
    fillColor?: number;
    /** How large the control stands while focused. */
    focusScale?: number;
    ringColor?: number;
    /** Ring and fill cover this much of the control's height, from the top. */
    ringHeight?: number;
    /** Gap between the control's edge and the ring. */
    ringOutset?: number;
    /** The control's own corner radius. */
    ringRadius?: number;
    ringWidth?: number;
};

/**
 * The TV's focusable host view. In a module of its own, like `TvFocusZone`:
 * Fast Refresh re-running a module that calls `requireNativeComponent`
 * registers the view twice.
 */
export const TvFocusable = requireNativeComponent<
    TvFocusLook &
        ViewProps & {
            /** Where focus puts this control in the scroll view around it,
             *  from that view's leading edge. Without one it scrolls only as
             *  far as `scrollMargin` needs. */
            anchorX?: number;
            anchorY?: number;
            hasTVPreferredFocus?: boolean;
            onClick?: () => void;
            pinDown?: boolean;
            pinLeft?: boolean;
            pinRight?: boolean;
            pinUp?: boolean;
            scrollMargin?: number;
        }
>('SamoTvFocusable');
