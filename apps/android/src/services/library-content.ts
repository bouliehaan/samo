import {
    getMobileHomeContentErrorMessage,
    loadMobileLibraryRelevantContentForServers,
    type MobileHomeItem,
} from '@samo/core/mobile';
import { ensureSamoStreamToken, ServerType, type ServerAuthenticationResult } from '@samo/core/server';

export type AndroidLibraryRelevantState =
    | { items: MobileHomeItem[]; loadedAt: number; status: 'loaded' }
    | { message: string; status: 'error' }
    | { status: 'idle' }
    | { status: 'loading' };

export const loadAndroidLibraryRelevantContent = async (
    authentications: ServerAuthenticationResult[],
): Promise<AndroidLibraryRelevantState> => {
    if (authentications.length === 0) {
        return { status: 'idle' };
    }

    try {
        await Promise.all(
            authentications
                .filter((authentication) => authentication.type === ServerType.SAMO)
                .map((authentication) =>
                    ensureSamoStreamToken(authentication).catch(() => undefined),
                ),
        );

        const { errors, items, loadedAt } = await loadMobileLibraryRelevantContentForServers({
            authentications,
        });

        if (items.length === 0 && errors.length > 0) {
            return { message: errors[0], status: 'error' };
        }

        return { items, loadedAt, status: 'loaded' };
    } catch (error) {
        return {
            message: getMobileHomeContentErrorMessage(error),
            status: 'error',
        };
    }
};
