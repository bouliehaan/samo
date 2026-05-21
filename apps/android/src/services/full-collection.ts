import {
    getMobileHomeContentErrorMessage,
    loadMobileFullCollection,
    type MobileFullCollectionVariant,
    type MobileHomeItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

export type AndroidFullCollectionState =
    | { items: MobileHomeItem[]; status: 'loaded' }
    | { message: string; status: 'error' }
    | { status: 'idle' }
    | { status: 'loading' };

const ANDROID_FULL_COLLECTION_QUALITY_SCAN_LIMIT = 0;

/**
 * Pull the COMPLETE list of items for a View All grid across every connected
 * server. Wraps the core loader with the same error-to-message normalization
 * the home-content loader uses, so all UI surfaces handle failures the same
 * way. Individual-server failures from the core layer are collapsed into a
 * single status: the caller still gets every server's items that DID load.
 */
export const loadAndroidFullCollection = async (
    authentications: ServerAuthenticationResult[],
    variant: MobileFullCollectionVariant,
): Promise<AndroidFullCollectionState> => {
    if (authentications.length === 0) {
        return { status: 'idle' };
    }

    try {
        const { errors, items } = await loadMobileFullCollection({
            authentications,
            qualityScanLimit: ANDROID_FULL_COLLECTION_QUALITY_SCAN_LIMIT,
            variant,
        });
        if (items.length === 0 && errors.length > 0) {
            return { message: errors[0], status: 'error' };
        }
        return { items, status: 'loaded' };
    } catch (error) {
        return {
            message: getMobileHomeContentErrorMessage(error),
            status: 'error',
        };
    }
};
