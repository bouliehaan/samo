import { useEffect } from 'react';

import {
    getAndroidCastState,
    getAndroidOutputRoutes,
    subscribeToAndroidCastEvents,
    subscribeToAndroidOutputRouteEvents,
} from '../services/audio-playback';
import { useAppSessionState } from '../state/app-session';

/**
 * Hydrates cast state and pre-warms the Cast SDK + MediaRouter discovery on
 * mount so Chromecast devices are already being scanned before the user opens
 * the output picker.
 */
export function useAndroidCastSync(): void {
    const { setCastState } = useAppSessionState();

    useEffect(() => {
        const castSubscription = subscribeToAndroidCastEvents((event) => {
            setCastState(event);
        });

        const routesSubscription = subscribeToAndroidOutputRouteEvents((state) => {
            if (state.cast) {
                setCastState(state.cast);
            }
        });

        void getAndroidCastState()
            .then(setCastState)
            .catch(() =>
                setCastState({
                    isConnected: false,
                    status: 'unavailable',
                }),
            );

        // Kick off CastContext init and an active route scan immediately —
        // discovery used to start only when the output sheet opened, so the
        // first snapshot was often an empty Chromecast list.
        void getAndroidOutputRoutes().catch(() => undefined);

        return () => {
            castSubscription.remove();
            routesSubscription.remove();
        };
    }, [setCastState]);
}
