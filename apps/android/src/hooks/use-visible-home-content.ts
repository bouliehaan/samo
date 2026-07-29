import { useMemo } from 'react';

import { useAppNavigationSelector } from '../state/app-navigation';
import { useAuthSessionSelector } from '../state/auth-session';
import { useDownloadsSelector } from '../state/downloads-state';
import { useNetworkSelector } from '../state/network-state';
import { buildOfflineHomeSections } from '../utils/offline-home';

/**
 * Home, as it should look right now.
 *
 * Offline used to REPLACE Home with the download list, and failing that, with
 * nothing. That is what made offline mode read as broken: the entire library is
 * mirrored on this device in SQLite and needs no network to browse, so throwing
 * it away the moment the Wi-Fi dropped hid content that was sitting locally on
 * disk, and left an empty app to anyone who had not downloaded much.
 *
 * So offline now ADDS rather than subtracts: downloaded collections are lifted
 * to the top, where what you can actually play is the first thing you see, and
 * the mirrored library carries on underneath. Tapping something that is not
 * downloaded still opens — the detail page comes from the mirror too — and only
 * playback refuses, which is the one thing that genuinely cannot work.
 */
export const useVisibleHomeContentState = () => {
    const homeContentState = useAppNavigationSelector((state) => state.homeContentState);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isOffline = useNetworkSelector((state) => state.isOffline);
    // Guarded: while online this stays a stable null, so download-snapshot
    // churn never re-renders the Home surface through this hook.
    const downloadedCollections = useDownloadsSelector((state) =>
        state.downloadedCollections.length > 0 ? state.downloadedCollections : null,
    );

    return useMemo(() => {
        if (!isOffline || !downloadedCollections) {
            return homeContentState;
        }

        const downloadedSections = buildOfflineHomeSections(
            downloadedCollections,
            serverConnection,
        );
        if (downloadedSections.length === 0) {
            return homeContentState;
        }

        if (homeContentState.status !== 'loaded') {
            return {
                content: {
                    errors: [],
                    // Stamped from the data, not the clock. `loadedAt` is a
                    // change key downstream (App keys its artwork warm off it),
                    // so a wall-clock read here would both break render purity
                    // and re-fire that warm on every recompute.
                    loadedAt: downloadedCollections.reduce(
                        (latest, entry) => Math.max(latest, entry.latestCompletedAt),
                        0,
                    ),
                    sections: downloadedSections,
                    serverTitle: 'Offline',
                },
                status: 'loaded' as const,
            };
        }

        return {
            ...homeContentState,
            content: {
                ...homeContentState.content,
                sections: [...downloadedSections, ...homeContentState.content.sections],
            },
        };
    }, [downloadedCollections, homeContentState, isOffline, serverConnection]);
};
