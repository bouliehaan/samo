export const getMobileContentSource = (authentication) => ({
    id: `${authentication.type}:${authentication.url}`,
    title: authentication.title,
    type: authentication.type,
    url: authentication.url,
});
export const firstNonEmptyString = (...values) => {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
};
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
export const buildAudiobookshelfArtworkUrl = (authentication, itemId, metadataImageUrl) => {
    const normalized = metadataImageUrl?.trim();
    if (normalized && /^https?:\/\//i.test(normalized)) {
        // Only trust metadata.imageUrl if it's an absolute, fully-qualified
        // URL hosted somewhere OTHER than the ABS server (or, if same host,
        // already includes its own token query param). Otherwise we need our
        // own authenticated URL.
        const sameHost = normalized.startsWith(`${authentication.url}/`);
        const hasToken = normalized.includes('token=');
        if (!sameHost || hasToken) {
            return normalized;
        }
    }
    if (!itemId) {
        return undefined;
    }
    return `${authentication.url}/api/items/${itemId}/cover?token=${encodeURIComponent(authentication.credential)}`;
};
