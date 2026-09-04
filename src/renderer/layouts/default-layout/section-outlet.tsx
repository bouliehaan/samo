import clsx from 'clsx';
import { createContext, type ReactNode, useContext, useRef } from 'react';
import { useLocation, useOutlet } from 'react-router';

import styles from './section-outlet.module.css';

import { AppRoute } from '/@/renderer/router/routes';

/**
 * Keeps the pill sections mounted instead of rebuilding them on every switch.
 *
 * Switching sections used to unmount the whole page and build it again, and the
 * expensive part was never the data — react-query had it cached — it was the
 * artwork. samo serves original files, so a 3000×3000 cover is decoded to paint
 * a 48px tile; a section with fifty covers pays that fifty times, and you watch
 * it happen. Measured on a revisit: ~58 image loads, all served from disk cache
 * and all re-decoded.
 *
 * So the sections are cached by path and hidden rather than destroyed. The
 * second visit costs nothing: same DOM, same decoded bitmaps, same scroll
 * position. This is the shape the phone's tab host already uses.
 *
 * Only the five section ROOTS are cached — they are the pages you bounce
 * between, they take no route params, and there are at most five of them.
 * Everything else (detail pages, settings, search) renders normally and is
 * discarded as before, so this cannot pin an unbounded number of pages.
 */

const CACHED_SECTIONS: ReadonlySet<string> = new Set<string>([
    AppRoute.AUDIOBOOKS,
    AppRoute.HOME,
    AppRoute.MUSIC,
    AppRoute.PODCASTS,
    AppRoute.RADIO,
]);

/**
 * Whether the surrounding page is the one on screen.
 *
 * A cached page is still mounted when you are looking at another one, so
 * anything that polls, animates or otherwise costs something while running has
 * to be able to tell the difference. Defaults to true for everything that is
 * not inside a cached pane.
 */
const PaneVisibleContext = createContext(true);

export const useIsPaneVisible = () => useContext(PaneVisibleContext);

export const SectionOutlet = () => {
    const { pathname } = useLocation();
    const outlet = useOutlet();
    const cacheRef = useRef(new Map<string, ReactNode>());

    const isCachedSection = CACHED_SECTIONS.has(pathname);
    if (isCachedSection && outlet) {
        // Re-storing the same element each render is what keeps the subtree
        // alive: React sees an unchanged element and leaves the mounted tree
        // exactly as it is.
        cacheRef.current.set(pathname, outlet);
    }

    return (
        <>
            {[...cacheRef.current.entries()].map(([path, node]) => {
                const isVisible = path === pathname;

                return (
                    <div
                        aria-hidden={isVisible ? undefined : true}
                        className={clsx(styles.pane, !isVisible && styles.hidden)}
                        key={path}
                    >
                        <PaneVisibleContext.Provider value={isVisible}>
                            {node}
                        </PaneVisibleContext.Provider>
                    </div>
                );
            })}
            {isCachedSection ? null : outlet}
        </>
    );
};
