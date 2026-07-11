import { useAppSessionSelector } from '../state/app-session';
import { useAndroidPlaybackState } from '../state/playback-store';
import {
    SCROLL_CONTENT_BOTTOM_INSET,
    SCROLL_CONTENT_BOTTOM_INSET_COLLAPSED,
} from '../theme/layout';

/**
 * Whether the mini player is currently on screen. Mirrors the MiniPlayer's own
 * render gate (`PlayerSurface`/`MiniPlayer`): it shows whenever playback is
 * non-idle OR there's a last-played item to resume. Both selectors return
 * booleans so `useSyncExternalStore` bails out on play/pause ticks and position
 * updates — this only re-renders when the mini player actually appears/disappears.
 */
export const useIsMiniPlayerVisible = (): boolean => {
    const isPlaybackActive = useAndroidPlaybackState((state) => state.status !== 'idle');
    const hasLastPlayed = useAppSessionSelector((state) => state.lastPlayedItem != null);
    return isPlaybackActive || hasLastPlayed;
};

/**
 * Bottom padding a scrolling screen should reserve so its last items clear the
 * floating mini player. Full inset while the mini player is up; collapses to a
 * small gap when it's hidden so pages don't have a giant empty "chin" at the
 * bottom.
 */
export const useScrollContentBottomInset = (): number =>
    useIsMiniPlayerVisible()
        ? SCROLL_CONTENT_BOTTOM_INSET
        : SCROLL_CONTENT_BOTTOM_INSET_COLLAPSED;
