import {
    addAndroidRadioStation,
    type AddAndroidRadioStationInput,
    type AddAndroidRadioStationResult,
} from '../services/radio-stations';
import { type MobileMediaDetail } from '@samo/core/mobile';

import { loadAndroidMediaDetail } from '../services/media-detail';
import {
    type AndroidRecentContentSourceItem,
    recentContentItemFromMediaDetail,
} from '../services/recent-content';
import { getAuthSession } from '../state/auth-session';
import {
    setBookInfoState,
    setContextMenuTarget,
    setStreamInfoItem,
} from '../state/media-overlays';
import { loadHomeForConnection } from '../services/home-flow';
import { type BookInfoEpisode } from '../types/book-info';
import { bookInfoRequestId } from './handler-state';

export const handleOpenStreamInfo = (item: AndroidRecentContentSourceItem): void => {
    setContextMenuTarget(null);
    setStreamInfoItem(item);
};

export const handleOpenBookInfo = async (
    item: AndroidRecentContentSourceItem,
    variant: 'audiobook' | 'podcast',
): Promise<void> => {
    const requestId = (bookInfoRequestId.current += 1);
    const isCurrentRequest = () => bookInfoRequestId.current === requestId;
    setContextMenuTarget(null);
    setBookInfoState({ item, status: 'loading', variant });
    const next = await loadAndroidMediaDetail(getAuthSession().serverConnection, item);
    if (!isCurrentRequest()) return;

    if (next.status === 'loaded') {
        setBookInfoState({ detail: next.detail, item, status: 'loaded', variant });
    } else if (next.status === 'error') {
        setBookInfoState({ item, message: next.message, status: 'error', variant });
    } else {
        setBookInfoState({ status: 'idle' });
    }
};

/**
 * Show notes for ONE podcast episode.
 *
 * Synchronous on purpose — unlike the book/podcast sheet above there is nothing
 * to load. The track that was long-pressed already carries its title, show
 * notes and stats, so the sheet opens on the same frame as the press instead of
 * flashing a spinner for data that is sitting in hand.
 */
export const handleOpenEpisodeInfo = (
    item: AndroidRecentContentSourceItem,
    episode: BookInfoEpisode,
): void => {
    // Invalidate any book/podcast fetch still in flight, or its late response
    // would replace these show notes with the show's own description.
    bookInfoRequestId.current += 1;
    setContextMenuTarget(null);
    setBookInfoState({ episode, item, status: 'loaded', variant: 'episode' });
};

/**
 * The information sheet for a detail page the app is ALREADY showing.
 *
 * `handleOpenBookInfo` above exists for a tile, where all the app has is a
 * catalog item and the detail has to be fetched. On the detail page itself the
 * loaded detail is right there, so re-fetching it would show a spinner over
 * data already on screen. Opens straight into 'loaded'.
 *
 * This is what makes a truncated hero title readable: the sheet's title wraps
 * freely, so a long-press on a clipped podcast name reveals the whole thing —
 * along with the description that had nowhere else to live.
 */
export const handleOpenDetailInfo = (
    detail: MobileMediaDetail,
    variant: 'audiobook' | 'podcast',
): void => {
    const item = recentContentItemFromMediaDetail(detail);
    if (!item) {
        return;
    }
    bookInfoRequestId.current += 1;
    setContextMenuTarget(null);
    setBookInfoState({ detail, item, status: 'loaded', variant });
};

export const handleAddRadioStation = async (
    input: AddAndroidRadioStationInput,
): Promise<AddAndroidRadioStationResult> => {
    const result = await addAndroidRadioStation(input);
    // Radio shelves are live-fetched (not mirror-backed), so refreshing
    // Home is the only way its radio row reflects the new station — but it
    // must not BLOCK the add. The Radio tab updates from `result` directly.
    void loadHomeForConnection(getAuthSession().serverConnection);
    return result;
};
