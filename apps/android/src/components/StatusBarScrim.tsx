import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { STATUS_BAR_INSET } from '../theme/layout';

/**
 * The translucent veil behind the (transparent) Android status bar. The app
 * is edge-to-edge — scroll content runs all the way to physical y=0 — so this
 * is what keeps the clock/battery legible over busy artwork: a status-bar-
 * sized gradient of the app background, dense at the very top and dissolved
 * to nothing just below the bar. Over the flat near-black page background it
 * is effectively invisible (multiplying black into black), so it never reads
 * as a "bar" — it only exists when content scrolls beneath it.
 *
 * Deliberately NOT a solid strip and NOT opaque: an opaque block here is the
 * exact "huge black bar" look this replaced. No elevation either — plain
 * zIndex stacking (elevation changes how Android composites the layer).
 */
const SCRIM_TAIL = 12;

const styles = StyleSheet.create({
    scrim: {
        height: STATUS_BAR_INSET + SCRIM_TAIL,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 9500,
    },
});

// colors.background (#0e0f13) as rgba ramps — tinted, not pure black, so the
// veil reads as the page's own atmosphere rather than a foreign smoke layer.
const SCRIM_COLORS = ['rgba(14, 15, 19, 0.78)', 'rgba(14, 15, 19, 0.42)', 'rgba(14, 15, 19, 0)'];
// Fully transparent by the time the bar ends; the tail below is pure fade-out.
const SCRIM_LOCATIONS = [0, 0.62, 1];

export const StatusBarScrim = () => (
    <LinearGradient
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        pointerEvents="none"
        style={styles.scrim}
    />
);
