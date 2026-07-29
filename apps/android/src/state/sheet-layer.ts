import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

import { useStoreSelector } from './use-store-selector';

export interface SheetLayerEntry {
    backdropStyle?: StyleProp<ViewStyle>;
    children: ReactNode;
    id: number;
    onRequestClose: () => void;
    sheetStyle?: StyleProp<ViewStyle>;
    variant: 'bottom' | 'menu';
    visible: boolean;
}

/**
 * The registry behind every sheet and menu in the app.
 *
 * WHY A REGISTRY AND NOT JUST RENDERING IN PLACE
 *
 * A sheet has to paint over the tab bar and the player dock, which are the
 * last children of the app root. A sheet opened from inside a screen — a sort
 * menu on Playlists, the sleep timer inside the full player — is nested several
 * levels below them, and no amount of `zIndex` gets a descendant out of its
 * ancestor's stacking order. The previous answer was to give every sheet a
 * native `Modal`, i.e. its OWN ANDROID WINDOW, purely to escape the tree.
 *
 * That window costs ~380ms on the emulator between the gesture firing and the
 * sheet appearing — measured, and roughly eight times the 50ms of actual
 * JavaScript. It is why a long press felt like it had been ignored.
 *
 * So sheets register here instead and are rendered ONCE, by SheetPortalHost, at
 * the top of the app root where they can legitimately paint over everything.
 * Call sites keep their sheet where it belongs — next to the state that drives
 * it — and pay no window for the privilege.
 *
 * The entries hold already-created elements. They mount under the host, so
 * context resolves at the HOST's position, which is why the host must sit
 * inside every app-level provider (see App.tsx).
 */
let sheets: SheetLayerEntry[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

const emit = () => {
    for (const listener of listeners) {
        listener();
    }
};

/** One stable id per MotionSheet instance, claimed on first render. */
export const claimSheetId = (): number => {
    const id = nextId;
    nextId += 1;
    return id;
};

/**
 * Register or update a sheet. Registration order is paint order, and an update
 * keeps the entry's original slot so a re-render can never lift one sheet above
 * another that was already open.
 */
export const upsertSheet = (entry: SheetLayerEntry) => {
    const index = sheets.findIndex((sheet) => sheet.id === entry.id);
    if (index === -1) {
        sheets = [...sheets, entry];
    } else {
        sheets = sheets.map((sheet, at) => (at === index ? entry : sheet));
    }
    emit();
};

export const removeSheet = (id: number) => {
    if (!sheets.some((sheet) => sheet.id === id)) {
        return;
    }
    sheets = sheets.filter((sheet) => sheet.id !== id);
    emit();
};

const subscribeToSheetLayer = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const getSheetLayer = () => sheets;
const identity = (state: SheetLayerEntry[]) => state;

export const useSheetLayer = (): SheetLayerEntry[] =>
    useStoreSelector(subscribeToSheetLayer, getSheetLayer, identity);
