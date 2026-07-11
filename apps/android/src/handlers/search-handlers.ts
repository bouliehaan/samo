import { runAndroidSearch } from '../services/search-content';
import { setSearchState } from '../state/app-navigation';
import { getAppSession } from '../state/app-session';
import { getAuthSession } from '../state/auth-session';
import { searchRequestId } from './handler-state';

export const handleSearch = async (query: string): Promise<void> => {
    const serverConnection = getAuthSession().serverConnection;
    if (!serverConnection) {
        return;
    }

    const trimmedQuery = query.trim();
    const requestId = (searchRequestId.current += 1);

    if (!trimmedQuery) {
        setSearchState({ status: 'idle' });
        return;
    }

    setSearchState({ query: trimmedQuery, status: 'loading' });
    const userRecents = new Map(
        getAppSession().recentContentItems.map((entry) => [entry.key, entry.selectedAt]),
    );
    await runAndroidSearch(serverConnection, trimmedQuery, userRecents, (state) => {
        if (requestId === searchRequestId.current) {
            setSearchState(state);
        }
    });
};
