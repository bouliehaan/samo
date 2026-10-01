import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const events = vi.hoisted(() => ({
    key: (_event: { eventType: string; eventKeyAction: number; repeatCount?: number }) => {},
    app: (_state: string) => {},
}));
vi.mock('react-native', () => ({
    DeviceEventEmitter: {
        addListener: (_name: string, listener: typeof events.key) => {
            events.key = listener;
        },
    },
    AppState: {
        addEventListener: (_name: string, listener: typeof events.app) => {
            events.app = listener;
        },
    },
}));
import { noteTvFocus } from './tv-focus';
import { installTvKeys, subscribeTvKeys, takeTvLongPressClick } from './tv-keys';

const key = (eventType: string, eventKeyAction: number) =>
    events.key({ eventType, eventKeyAction });
beforeEach(() => {
    vi.useFakeTimers();
    installTvKeys();
    events.app('background');
});
afterEach(() => vi.useRealTimers());

describe('TV remote input', () => {
    it('opens a held tile once even without repeat events and suppresses its release click', () => {
        const open = vi.fn();
        noteTvFocus({ id: 'playlist:1', zone: 'content', onLongPress: open });
        key('select', 0);
        vi.advanceTimersByTime(500);
        key('select', 0);
        key('select', 1);
        expect(open).toHaveBeenCalledTimes(1);
        expect(takeTvLongPressClick()).toBe(true);
        expect(takeTvLongPressClick()).toBe(false);
        key('select', 0);
        key('select', 1);
        expect(takeTvLongPressClick()).toBe(false);
    });
    it('uses Android repeat timing and dispatches a short select exactly once', () => {
        const onPress = vi.fn();
        const onLongPress = vi.fn();
        noteTvFocus({ id: 'playlist:1', zone: 'content', onPress, onLongPress });
        key('select', 0);
        vi.advanceTimersByTime(100);
        key('select', 1);
        expect(onPress).toHaveBeenCalledTimes(1);
        key('select', 0);
        vi.advanceTimersByTime(400);
        events.key({ eventType: 'select', eventKeyAction: 0, repeatCount: 1 });
        key('select', 1);
        expect(onLongPress).toHaveBeenCalledTimes(1);
        expect(onPress).toHaveBeenCalledTimes(1);
    });
    it('leaves short clicks intact and cancels holds if focus changes or the app backgrounds', () => {
        const open = vi.fn();
        noteTvFocus({ id: 'album:1', zone: 'content', onLongPress: open });
        key('select', 0);
        vi.advanceTimersByTime(100);
        key('select', 1);
        vi.advanceTimersByTime(500);
        expect(open).not.toHaveBeenCalled();
        expect(takeTvLongPressClick()).toBe(false);
        key('select', 0);
        noteTvFocus({ id: 'album:2', zone: 'content', onLongPress: open });
        vi.advanceTimersByTime(500);
        expect(open).not.toHaveBeenCalled();
        key('select', 1);
        key('select', 0);
        events.app('background');
        vi.advanceTimersByTime(500);
        expect(open).not.toHaveBeenCalled();
    });
    it('routes Menu to the focused item and reports seek key repeats', () => {
        const open = vi.fn();
        noteTvFocus({ id: 'track:1', zone: 'content', onLongPress: open });
        key('menu', 0);
        key('menu', 0);
        key('menu', 1);
        expect(open).toHaveBeenCalledTimes(1);
        const listener = vi.fn();
        const unsubscribe = subscribeTvKeys(listener);
        key('right', 0);
        key('right', 0);
        key('right', 1);
        expect(listener.mock.calls).toEqual([
            ['right', 'down', false],
            ['right', 'down', true],
            ['right', 'up', false],
        ]);
        unsubscribe();
    });
});
