import {
    ensureSamoStreamToken,
    getCachedSamoStreamToken,
    getSamoAudiobookStreamUrl,
    ServerType,
} from '@samo/core/server';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

const samoAuth = (server: ServerListItemWithCredential) => ({
    credential: server.credential,
    ndCredential: server.ndCredential,
    type: ServerType.SAMO as const,
    url: server.url,
});

const STREAM_OFFSET_QUERY_KEYS = ['progressSeconds', 'offsetSeconds', 'at'] as const;

/** Book-global seconds baked into a Samo audiobook stream URL. */
export const parseSamoAudiobookStreamOffset = (contentUrl: string | null | undefined): number => {
    if (!contentUrl) {
        return 0;
    }

    try {
        const url = new URL(contentUrl);
        for (const key of STREAM_OFFSET_QUERY_KEYS) {
            const raw = url.searchParams.get(key);
            if (!raw) {
                continue;
            }
            const parsed = Number.parseInt(raw, 10);
            if (Number.isFinite(parsed) && parsed >= 0) {
                return parsed;
            }
        }
    } catch {
        return 0;
    }

    return 0;
};

export const ensureSamoAudiobookStreamToken = async (
    server: ServerListItemWithCredential,
): Promise<string | undefined> => {
    const auth = samoAuth(server);
    try {
        return (await ensureSamoStreamToken(auth, samoFetch)) ?? getCachedSamoStreamToken(auth);
    } catch {
        return getCachedSamoStreamToken(auth);
    }
};

export const buildSamoAudiobookContentUrl = (
    server: ServerListItemWithCredential,
    audiobookId: string,
    bookStartSeconds: number,
    streamToken?: string,
): string =>
    getSamoAudiobookStreamUrl(samoAuth(server), audiobookId, {
        progressSeconds: Math.max(0, Math.floor(bookStartSeconds)),
        streamToken,
    });

/**
 * Samo serves the file from a byte offset; the media element timeline starts at 0
 * there. Seeks before that origin (or far past the current window) need a new URL.
 */
export const samoAudiobookSeekNeedsStreamRestart = (
    contentUrl: string | null | undefined,
    bookPositionSeconds: number,
    durationSeconds: number,
): boolean => {
    const streamOrigin = parseSamoAudiobookStreamOffset(contentUrl);
    const target = Math.max(0, bookPositionSeconds);

    if (target < streamOrigin - 0.25) {
        return true;
    }

    const remaining = Math.max(0, durationSeconds - streamOrigin);
    if (remaining > 0 && target > streamOrigin + remaining + 0.5) {
        return true;
    }

    return false;
};

export const samoAudiobookFilePositionSeconds = (
    contentUrl: string | null | undefined,
    bookPositionSeconds: number,
): number => Math.max(0, bookPositionSeconds - parseSamoAudiobookStreamOffset(contentUrl));
