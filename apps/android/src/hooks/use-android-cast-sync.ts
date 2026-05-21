import { useEffect } from 'react';

import {
    getAndroidCastState,
    subscribeToAndroidCastEvents,
} from '../services/audio-playback';
import { useAppSessionState } from '../state/app-session';

/** Subscribes to native Cast session updates and hydrates initial cast state on mount. */
export function useAndroidCastSync(): void {
    const { setCastState } = useAppSessionState();

    useEffect(() => {
        const subscription = subscribeToAndroidCastEvents((event) => {
            setCastState(event);
        });

        void getAndroidCastState()
            .then(setCastState)
            .catch(() =>
                setCastState({
                    isConnected: false,
                    status: 'unavailable',
                }),
            );

        return () => subscription.remove();
    }, [setCastState]);
}
