import { type StyleProp, View, type ViewStyle } from 'react-native';

import { CircularDownloadGlyph, TrackDownloadedGlyph } from './Glyphs';
import { type DownloadIndicatorState } from '../hooks/use-download-indicator';

/**
 * The download badge, everywhere it appears. One badge at a time: the arc holds
 * the slot while anything is in flight and hands it to the tick when the last
 * track lands, so the two never fight over the same spot.
 *
 * Pair it with `useDownloadIndicator` — the caller owns the hook so it can also
 * decide whether the row that holds this badge is worth rendering at all.
 */
export const DownloadIndicator = ({
    ringSize = 16,
    state,
    tickSize = 12,
    tickStyle,
}: {
    ringSize?: number;
    state: DownloadIndicatorState;
    tickSize?: number;
    /** Wrapper for the tick only — the arc is never dimmed. */
    tickStyle?: StyleProp<ViewStyle>;
}) => {
    if (state.isDownloading) {
        return <CircularDownloadGlyph progress={state.progress} size={ringSize} />;
    }
    if (!state.isDownloaded) {
        return null;
    }
    const tick = <TrackDownloadedGlyph size={tickSize} />;
    // No wrapper unless one was asked for: these render inside recycled list
    // rows, where a spare View is a real cost.
    return tickStyle ? <View style={tickStyle}>{tick}</View> : tick;
};
