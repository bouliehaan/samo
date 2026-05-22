import { useEffect } from 'react';

import { warmDesktopCastDiscovery } from '/@/renderer/services/chromecast/desktop-cast-service';

/**
 * Hydrates cast state and pre-warms the Cast SDK on mount so Chromecast devices
 * are already being scanned before the user opens the output picker.
 */
export function useDesktopCastSync(): void {
    useEffect(() => {
        void warmDesktopCastDiscovery().catch(() => undefined);
    }, []);
}
