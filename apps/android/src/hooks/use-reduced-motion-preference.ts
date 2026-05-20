import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const useReducedMotionPreference = (): boolean => {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        let cancelled = false;

        void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
            if (!cancelled) {
                setReduced(value);
            }
        });

        const subscription = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            (value) => {
                if (!cancelled) {
                    setReduced(value);
                }
            },
        );

        return () => {
            cancelled = true;
            subscription.remove();
        };
    }, []);

    return reduced;
};
