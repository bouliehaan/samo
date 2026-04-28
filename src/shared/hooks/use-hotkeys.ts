import {
    type HotkeyItem as MantineHotkeyItem,
    useHotkeys as useMantineHotkeys,
} from '@mantine/hooks';
import { useMemo } from 'react';

export type HotkeyItem = MantineHotkeyItem;

const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable ||
        Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
    );
};

const withTypingGuard = (hotkeyItem: MantineHotkeyItem): MantineHotkeyItem => {
    const [hotkey, handler, options] = hotkeyItem;

    const guardedHandler = (event: KeyboardEvent) => {
        if (isTypingTarget(event.target) || isTypingTarget(document.activeElement)) {
            return;
        }

        handler(event);
    };

    if (options === undefined) {
        return [hotkey, guardedHandler] as MantineHotkeyItem;
    }

    return [hotkey, guardedHandler, options] as MantineHotkeyItem;
};

export const useHotkeys = (hotkeys: MantineHotkeyItem[]) => {
    const guardedHotkeys = useMemo(() => hotkeys.map(withTypingGuard), [hotkeys]);

    useMantineHotkeys(guardedHotkeys);
};
