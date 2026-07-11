import {
    addAndroidRadioStation,
    type AddAndroidRadioStationInput,
    type AddAndroidRadioStationResult,
} from '../services/radio-stations';
import { loadAndroidMediaDetail } from '../services/media-detail';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { getAuthSession } from '../state/auth-session';
import {
    setBookInfoState,
    setContextMenuTarget,
    setStreamInfoItem,
} from '../state/media-overlays';
import { loadHomeForConnection } from '../services/home-flow';
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
