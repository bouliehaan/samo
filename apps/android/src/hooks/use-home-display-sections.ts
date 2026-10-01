import { useMemo, useRef } from 'react';

import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidRecentContentItem } from '../services/recent-content';
import { useAuthSessionSelector } from '../state/auth-session';
import { type HomeDisplaySection } from '../types/home';
import { getHomeDisplaySections } from '../utils/home-display';
import { useVisibleHomeContentState } from './use-visible-home-content';
import { useVisibleRecentItems } from './use-visible-recent-items';

export type HomeDisplaySectionsResult = {
    homeContentState: AndroidHomeContentState;
    recentItems: AndroidRecentContentItem[];
    sections: HomeDisplaySection[];
};

/**
 * Home's shelves exactly as Home composes them: the visible content (offline
 * lifts downloads to the top), the visible recents, and the one derive that
 * turns them into display sections.
 *
 * The previous result is fed back in so identity is preserved across
 * recomputes — a re-auth rotates every artwork token, and the async recents
 * fill on cold boot also retriggers this; without it every tile gets a fresh
 * object and remounts.
 *
 * The derive walks every shelf, so a surface with several consumers should
 * call this once and hand the result down rather than call it per page.
 */
export const useHomeDisplaySections = (): HomeDisplaySectionsResult => {
    const homeContentState = useVisibleHomeContentState();
    const recentItems = useVisibleRecentItems();
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const loadedContent = homeContentState.status === 'loaded' ? homeContentState.content : null;
    const previousSectionsRef = useRef<HomeDisplaySection[] | undefined>(undefined);
    const sections = useMemo(() => {
        const computed = loadedContent
            ? getHomeDisplaySections(
                  loadedContent.sections,
                  recentItems,
                  serverConnection,
                  previousSectionsRef.current,
              )
            : [];
        previousSectionsRef.current = computed;
        return computed;
    }, [loadedContent, recentItems, serverConnection]);
    return useMemo(
        () => ({ homeContentState, recentItems, sections }),
        [homeContentState, recentItems, sections],
    );
};
