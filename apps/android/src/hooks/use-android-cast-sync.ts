import { useEffect } from 'react';

import {
    getAndroidCastState,
    getAndroidOutputRoutes,
    subscribeToAndroidCastEvents,
    subscribeToAndroidOutputRouteEvents,
} from '../services/audio-playback';
import { setCastState } from '../state/app-session';

/**
 * Hydrates cast state and pre-warms the Cast SDK + MediaRouter discovery on
 * mount so Chromecast devices are already being scanned before the user opens
 * the output picker. Write-only: dispatches through the module-level setter,
 * so it subscribes to nothing.
 */
export function useAndroidCastSync(): void {
    useEffect(() => {
        const castSubscription = subscribeToAndroidCastEvents((event) => {
            setCastState(event);
        });

        const routesSubscription = subscribeToAndroidOutputRouteEvents((state) => {
            if (state.cast) {
                setCastState(state.cast);
            }
        });

        let active = true;
        void getAndroidCastState()
            .then((state) => {
                if (active) setCastState(state);
            })
            .catch(() => {
                if (active) {
                    setCastState({
                        isConnected: false,
                        status: 'unavailable',
                    });
                }
            });

        // Kick off CastContext init and an active route scan immediately —
        // discovery used to start only when the output sheet opened, so the
        // first snapshot was often an empty Chromecast list.
        void getAndroidOutputRoutes().catch(() => undefined);

        return () => {
            active = false;
            castSubscription.remove();
            routesSubscription.remove();
        };
    }, []);
}
