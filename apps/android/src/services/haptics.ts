// Guarded haptics wrapper. expo-haptics is a native module — if the running
// dev client wasn't rebuilt after `npx expo install expo-haptics`, importing
// it crashes the JS bundle at module-eval time. Wrap the require so callers
// can fire haptics without taking the app down when the native side is
// missing.

type HapticsModule = typeof import('expo-haptics');

let cached: HapticsModule | null | undefined;

const getHapticsModule = (): HapticsModule | null => {
    if (cached !== undefined) {
        return cached;
    }

    try {
         
        cached = require('expo-haptics') as HapticsModule;
    } catch {
        cached = null;
    }

    return cached;
};

export const triggerImpact = (style: 'heavy' | 'light' | 'medium') => {
    const haptics = getHapticsModule();

    if (!haptics) {
        return;
    }

    const feedback =
        style === 'heavy'
            ? haptics.ImpactFeedbackStyle.Heavy
            : style === 'medium'
              ? haptics.ImpactFeedbackStyle.Medium
              : haptics.ImpactFeedbackStyle.Light;

    void haptics.impactAsync(feedback).catch(() => undefined);
};

export const triggerSelection = () => {
    const haptics = getHapticsModule();

    if (!haptics) {
        return;
    }

    void haptics.selectionAsync().catch(() => undefined);
};
