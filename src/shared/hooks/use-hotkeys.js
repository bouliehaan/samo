import { useHotkeys as useMantineHotkeys, } from '@mantine/hooks';
import { useMemo } from 'react';
const isTypingTarget = (target) => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable ||
        Boolean(target.closest('input, textarea, select, [contenteditable="true"]')));
};
const withTypingGuard = (hotkeyItem) => {
    const [hotkey, handler, options] = hotkeyItem;
    const guardedHandler = (event) => {
        if (isTypingTarget(event.target) || isTypingTarget(document.activeElement)) {
            return;
        }
        handler(event);
    };
    if (options === undefined) {
        return [hotkey, guardedHandler];
    }
    return [hotkey, guardedHandler, options];
};
export const useHotkeys = (hotkeys) => {
    const guardedHotkeys = useMemo(() => hotkeys.map(withTypingGuard), [hotkeys]);
    useMantineHotkeys(guardedHotkeys);
};
