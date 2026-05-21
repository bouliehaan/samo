import { useEffect } from 'react';

import { AppState } from 'react-native';

import {
    flushPendingAbsProgress,
    initAbsProgressStore,
} from '../services/abs-progress';
import { useAuthSessionState } from '../state/auth-session';

/** Replays pending Audiobookshelf progress on boot and flushes on background. */
export function useAndroidAbsProgressSync(): void {
    const { serverConnections } = useAuthSessionState();

    useEffect(() => {
        if (serverConnections.length === 0) {
            return;
        }
        void (async () => {
            await initAbsProgressStore();
            await flushPendingAbsProgress(serverConnections);
        })();
    }, [serverConnections]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'background' || next === 'inactive') {
                void flushPendingAbsProgress(serverConnections);
            }
        });
        return () => subscription.remove();
    }, [serverConnections]);
}
