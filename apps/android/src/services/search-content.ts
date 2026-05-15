import {
    getMobileSearchErrorMessage,
    type MobileSearchResults,
    searchMobileContentAcrossServers,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

export type AndroidSearchState =
    | { message: string; query: string; status: 'error' }
    | { query: string; results: MobileSearchResults; status: 'loaded' }
    | { query: string; status: 'loading' }
    | { status: 'idle' };

export const loadAndroidSearchResults = async (
    authentications: ServerAuthenticationResult[],
    query: string,
    userRecents?: Map<string, number>,
): Promise<AndroidSearchState> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || authentications.length === 0) {
        return { status: 'idle' };
    }

    try {
        return {
            query: trimmedQuery,
            results: await searchMobileContentAcrossServers({
                authentications,
                query: trimmedQuery,
                userRecents,
            }),
            status: 'loaded',
        };
    } catch (error) {
        return {
            message: getMobileSearchErrorMessage(error),
            query: trimmedQuery,
            status: 'error',
        };
    }
};
