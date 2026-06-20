import {
    ensureSamoStreamToken,
    getCachedSamoStreamToken,
    getSamoAudiobookStreamUrl,
    type SamoAudiobook,
    ServerType,
} from '@samo/core/server';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

const samoAuth = (server: ServerListItemWithCredential) => ({
    credential: server.credential,
    type: ServerType.SAMO as const,
    url: server.url,
});

/**
 * One underlying audiobook file as the desktop player needs it: the id used as
 * `mediaFileId` when streaming the file whole, and the file's start position on
 * the book-global timeline.
 */
export interface SamoAudiobookFileSegment {
    durationSeconds: number;
    mediaFileId: string;
    startOffsetSeconds: number;
}

const fileDurationSeconds = (file: { durationMs?: number; durationSeconds?: number }): number => {
    if (file.durationMs && file.durationMs > 0) return file.durationMs / 1000;
    return file.durationSeconds ?? 0;
};

/**
 * Ordered, offset-stamped file manifest for a Samo audiobook. The server already
 * sorts files and stamps `startOffsetSeconds`; this defends against missing
 * fields and back-fills offsets by accumulating durations when absent.
 */
export const samoAudiobookFileSegments = (
    audiobook: Pick<SamoAudiobook, 'audioFiles' | 'primaryAudioFile'>,
): SamoAudiobookFileSegment[] => {
    const files = (audiobook.audioFiles ?? []).filter((file) => file.id);
    if (files.length === 0) {
        const primary = audiobook.primaryAudioFile;
        if (!primary?.id) return [];
        return [
            {
                durationSeconds: fileDurationSeconds(primary),
                mediaFileId: primary.id,
                startOffsetSeconds: primary.startOffsetSeconds ?? 0,
            },
        ];
    }

    let runningOffset = 0;
    return files.map((file) => {
        const startOffsetSeconds = file.startOffsetSeconds ?? runningOffset;
        runningOffset = startOffsetSeconds + fileDurationSeconds(file);
        return {
            durationSeconds: fileDurationSeconds(file),
            mediaFileId: file.id!,
            startOffsetSeconds,
        };
    });
};

/** Index of the file whose [start, start+duration) span contains the book second. */
export const pickSamoAudiobookFileIndex = (
    files: readonly SamoAudiobookFileSegment[],
    bookSeconds: number,
): number => {
    if (files.length === 0) return 0;
    let chosen = 0;
    for (let i = 0; i < files.length; i += 1) {
        if (files[i]!.startOffsetSeconds <= bookSeconds) {
            chosen = i;
        } else {
            break;
        }
    }
    return chosen;
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

/**
 * Whole-file stream URL for a single audiobook file. The server serves the file
 * in its entirety with HTTP range support; the media element seeks locally, so
 * there is no `progressSeconds` byte offset anymore.
 */
export const buildSamoAudiobookFileUrl = (
    server: ServerListItemWithCredential,
    audiobookId: string,
    mediaFileId: string,
    streamToken?: string,
): string => getSamoAudiobookStreamUrl(samoAuth(server), audiobookId, { mediaFileId, streamToken });

/** The `mediaFileId` baked into a whole-file audiobook stream URL, if any. */
export const parseSamoAudiobookMediaFileId = (
    contentUrl: null | string | undefined,
): string | undefined => {
    if (!contentUrl) return undefined;
    try {
        return new URL(contentUrl).searchParams.get('mediaFileId') ?? undefined;
    } catch {
        return undefined;
    }
};

const STREAM_OFFSET_QUERY_KEYS = ['progressSeconds', 'offsetSeconds', 'at'] as const;

/**
 * Book-global seconds baked into a stream URL's resume query. Audiobooks no
 * longer use this (they stream whole files and seek locally), but Samo PODCAST
 * streams still resume via an `offsetSeconds` byte offset, so the podcast web
 * player reads its stream origin from here.
 */
export const parseSamoAudiobookStreamOffset = (contentUrl: null | string | undefined): number => {
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
