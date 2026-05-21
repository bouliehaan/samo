import { type ServerAuthenticationResult } from '../server/server-auth';
import { type ServerType } from '../server/server-types';
export interface MobileContentSource {
    id: string;
    title: string;
    type: ServerType;
    url: string;
}
export declare const getMobileContentSource: (authentication: ServerAuthenticationResult) => MobileContentSource;
export declare const firstNonEmptyString: (...values: Array<string | undefined>) => string | undefined;
/**
 * Build a usable cover URL for an Audiobookshelf library item.
 *
 * The server's `media.metadata.imageUrl` is unreliable in practice: it can be
 * an empty string, a relative path that's useless to React Native Image, or
 * a same-host URL missing the auth token. So we only honor it when it's a
 * fully-qualified external URL; otherwise we construct our own URL against
 * the ABS API with the token in the query string.
 *
 * This is what was making audiobook tiles on Home fail to load covers for
 * items the user hadn't listened to yet — recents survived because the image
 * was already cached by RN Image from the moment of playback.
 */
export declare const buildAudiobookshelfArtworkUrl: (authentication: ServerAuthenticationResult, itemId: string | undefined, metadataImageUrl: string | null | undefined) => string | undefined;
