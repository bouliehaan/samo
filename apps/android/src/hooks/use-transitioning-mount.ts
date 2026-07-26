import { useEffect, useState } from 'react';

/**
 * True for the first ~150ms after mount — the window where a scene's entrance
 * dissolve is still playing. Screens render their skeleton during it so the
 * animation never contends with a heavy first layout (FlashList, hero art).
 * Tab scenes freeze rather than unmount at rest, so this fires once per tab
 * per app session, not on every revisit.
 */
export function useTransitioningMount() {
    const [isTransitioning, setIsTransitioning] = useState(true);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsTransitioning(false);
        }, 150);
        return () => clearTimeout(timeout);
    }, []);

    return isTransitioning;
}
