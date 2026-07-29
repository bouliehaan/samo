import { type ReactNode, useEffect, useRef } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

import { claimSheetId, removeSheet, upsertSheet } from '../state/sheet-layer';

/**
 * The one way a sheet or menu enters and leaves in this app.
 *
 * Before this, nine surfaces presented nine ways: five `animationType="fade"`,
 * three `animationType="slide"`, and the context menu hand-rolling the legacy
 * `Animated` API with its own spring constants. `fade` and `slide` are the
 * PLATFORM's generic modal transitions — they know nothing about this app's
 * motion, so a sort menu and the context menu that open from adjacent rows
 * arrived with visibly different weight. Worse, both are opacity/position-only
 * and neither has any spring in it, which is what made the menus feel pasted on
 * rather than lifted out.
 *
 * Two shapes, one physics:
 * - `menu` — scales and rises into place. For surfaces anchored to the middle
 *   of the screen (sort, context actions, info panels).
 * - `bottom` — rises from the bottom edge. For surfaces that belong to the
 *   thumb (output picker, sleep timer, playlist edit).
 *
 * This component renders NOTHING itself. It registers into the sheet layer and
 * SheetPortalHost draws it at the top of the app root — see state/sheet-layer.ts
 * for why a sheet cannot simply paint where it is declared, and why the native
 * `Modal` this used to open was costing ~380ms per sheet. Keeping the element
 * here rather than moving every sheet to a root host means a sort menu still
 * lives next to the sort state it reads.
 *
 * Presence lives in the host too, not here: the surface has to stay mounted
 * through its exit animation, and it has to be committed at progress 0 BEFORE
 * the entrance starts (motion.ts rule 4). Both only hold if the thing being
 * animated and the thing tracking presence are the same component.
 */
export const MotionSheet = ({
    backdropStyle,
    children,
    onRequestClose,
    sheetStyle,
    variant = 'menu',
    visible,
}: {
    /** Style for the full-screen scrim behind the sheet. */
    backdropStyle?: StyleProp<ViewStyle>;
    children: ReactNode;
    /** Back button, and a tap on the scrim. */
    onRequestClose: () => void;
    /** Style for the sheet surface itself. */
    sheetStyle?: StyleProp<ViewStyle>;
    variant?: 'bottom' | 'menu';
    visible: boolean;
}) => {
    const idRef = useRef<number | null>(null);
    if (idRef.current == null) {
        idRef.current = claimSheetId();
    }
    const id = idRef.current;

    useEffect(() => {
        upsertSheet({ backdropStyle, children, id, onRequestClose, sheetStyle, variant, visible });
    }, [backdropStyle, children, id, onRequestClose, sheetStyle, variant, visible]);

    // Deregistration is its own effect, keyed on nothing, so it runs on UNMOUNT
    // only. Folding it into the cleanup above would tear the sheet out of the
    // layer on every prop change and remount it — which resets its presence
    // state, and so kills the very animation this component exists to run.
    useEffect(() => () => removeSheet(id), [id]);

    return null;
};
