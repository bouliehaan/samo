import { useCallback, useEffect, useRef, useState } from 'react';

import { cancelAndroidSleepTimer, setAndroidSleepTimer } from '../services/audio-playback';

/**
 * Sleep-timer state machine for the full player. Mirrors the timer into the
 * native playback service (so it survives the JS player closing) and keeps a
 * 1Hz countdown for the on-screen label. `secondsLeft` is null when idle and
 * -1 for the "End of track" mode (native handles the actual stop).
 */
export function useSleepTimer(onFire: () => void) {
    const [secondsLeft, setSecondsLeft] = useState<null | number>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const tickRef = useRef<NodeJS.Timeout | null>(null);

    const start = useCallback(
        (seconds: number) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (tickRef.current) clearInterval(tickRef.current);
            if (seconds === -1) {
                void cancelAndroidSleepTimer().catch(() => undefined);
                setSecondsLeft(-1);
                return;
            }
            setSecondsLeft(seconds);
            void setAndroidSleepTimer(seconds).catch(() => undefined);
            timerRef.current = setTimeout(() => {
                // Stop the 1Hz countdown ticker the moment the timer fires — without
                // this it keeps running as a no-op interval until the player unmounts
                // or the timer is cancelled.
                if (tickRef.current) {
                    clearInterval(tickRef.current);
                    tickRef.current = null;
                }
                onFire();
                setSecondsLeft(null);
            }, seconds * 1000);
            tickRef.current = setInterval(() => {
                setSecondsLeft((s) => (s !== null && s > 0 ? s - 1 : null));
            }, 1000);
        },
        [onFire],
    );

    const cancel = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (tickRef.current) clearInterval(tickRef.current);
        void cancelAndroidSleepTimer().catch(() => undefined);
        setSecondsLeft(null);
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (tickRef.current) clearInterval(tickRef.current);
            void cancelAndroidSleepTimer().catch(() => undefined);
        };
    }, []);

    return { cancel, secondsLeft, start };
}
