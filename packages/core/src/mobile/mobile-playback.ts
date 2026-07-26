import { type AudioDeliveryKind } from '../audio-quality';
import { type PlaybackSource } from '../playback';
import { type ServerAuthenticationResult } from '../server/server-auth';
import { type SamoFetch } from '../server/server-http';
import {
    type SamoAudiobook,
    type SamoAudioFile,
    type SamoInternetRadioStation,
    type SamoMusicTrack,
    type SamoPodcastEpisode,
    getSamoAudiobookStreamUrl,
    getSamoMusicTrackStreamUrl,
    getSamoPodcastEpisodeStreamUrl,
    pickSamoImageId,
    pickSamoCatalogImageId,
} from '../server/server-samo';
import { ensureSamoStreamToken } from '../server/server-samo-stream-token';
import { getServerConnectionKey } from '../server/server-session';
import { ServerType } from '../server/server-types';

import {
    resolveSamoInternetRadioPlaybackDisplay,
} from './mobile-radio-metadata';

/** Relative skip interval for audiobook and podcast scrubbing in mobile/desktop UIs. */
export const LONG_FORM_RELATIVE_SKIP_SECONDS = 15;

export interface MobilePlaybackSegment {
    durationSeconds?: number;
    id: string;
    startSeconds: number;
    title?: string;
}

export interface MobilePlayableAudio {
    album?: string;
    albumId?: string;
    artist?: string;
    artistId?: string;
    artworkUrl?: string;
    /** Samo metadata `images[].id` for display-time URL rebuild. */
    artworkImageId?: string;
    /**
     * Mime type to advertise to the Chromecast receiver, when it differs
     * from `mimeType` (which is what the local ExoPlayer sees) — e.g. when the
     * cast leg is routed through a direct-file URL whose underlying mime
     * (audio/mp4, audio/mpeg, …) differs from the local stream's.
     */
    castMimeType?: string;
    /**
     * Network URL to use when handing the source to Chromecast. Set when
     * `url` is a local file path (offline downloads) so the cast receiver —
     * which can't read the phone's filesystem — gets the original streaming
     * URL instead. Falls back to `url` when absent.
     */
    castUrl?: string;
    contentSourceId?: string;
    durationSeconds?: number;
    /**
     * Authenticated server proxy stream for this item, present when `url`
     * points somewhere else (a podcast's direct CDN enclosure). Native falls
     * back to this when the direct open fails, and its presence marks the item
     * as server-backed for credential/progress-sync attachment even though
     * `url` is external.
     */
    serverStreamUrl?: string;
    /**
     * Radio-only: the station's homepage URL, kept separate from `subtitle`
     * so the Android notification (which uses subtitle as the artist line)
     * doesn't leak a raw URL into the lock-screen UI. The Stream Information
     * modal reads it from here.
     */
    homepageUrl?: string;
    httpHeaders?: Record<string, string>;
    id: string;
    isLive?: boolean;
    /** Samo internet-radio station id for metadata refresh while playing. */
    radioStationId?: string;
    /** Station display name when [title] is ICY track metadata. */
    radioStationName?: string;
    initialPositionSeconds?: number;
    mimeType?: string;
    /**
     * Spoken-word progress can be reported against a whole book while the
     * current audio URL points at one underlying file. Add this offset to the
     * player position before syncing progress back to the server.
     */
    progressOffsetSeconds?: number;
    /** Podcast episode release time (epoch ms) for player metadata. */
    publishedAt?: number;
    quality: MobilePlaybackQuality;
    /**
     * Android native queue auto-advance: bearer token for minting a fresh
     * `stream_token` without waking JS (Samo servers only).
     */
    serverBearerToken?: string;
    /**
     * Android native progress sync: the Samo playback API target kind for
     * this item. The native progress writer (SamoProgressSync.kt) PATCHes
     * `/api/v1/playback/{kind}/{samoProgressTargetId}` every ~20s while
     * playing, on track change, and on pause/stop. JS doesn't need to keep
     * a foreground poll alive — the foreground service runs the timer.
     * Samo servers only; unset for radio + non-Samo sources.
     */
    samoProgressKind?: 'music-track' | 'audiobook' | 'podcast-episode';
    /**
     * Native progress target id paired with [samoProgressKind]. Either the
     * music track id, the audiobook id, or the podcast episode id. JS parses
     * it out of the playback id format so Kotlin doesn't have to learn the
     * id grammar.
     */
    samoProgressTargetId?: string;
    /**
     * When this item is being played as part of a Samo music playlist, the
     * playlist id for the per-playlist scrobble/lastPlayedAt writes the
     * native progress sync fires alongside the per-track writes.
     */
    samoPlaylistId?: string;
    source: PlaybackSource;
    /** Samo server base URL paired with [serverBearerToken]. */
    serverUrl?: string;
    subtitle?: string;
    timelineSegments?: MobilePlaybackSegment[];
    /**
     * Total length of the BOOK-GLOBAL timeline that `progressOffsetSeconds` and
     * `timelineSegments` are expressed on — i.e. the whole audiobook, not this
     * file.
     *
     * `durationSeconds` on a multi-file audiobook item is the FILE's own length
     * (what the native engine reports). The displayed playhead, the chapter
     * markers, and the seek bar's tap→position mapping are all book-global, so
     * anything that needs "how long is the thing this bar represents" must read
     * THIS field. Using `durationSeconds` there is what made a 40-hour book
     * render as a ~10-minute bar with chapters that drifted further off the
     * deeper into the book you got.
     *
     * Equal to `durationSeconds` for a one-file book; unset for non-audiobooks
     * (nothing else has a timeline wider than its own stream).
     */
    timelineDurationSeconds?: number;
    title: string;
    url: string;
}

export interface MobilePlaybackQuality {
    bitDepth?: null | number;
    bitRate?: null | number;
    channelCount?: null | number;
    container?: null | string;
    deliveryKind: AudioDeliveryKind;
    losslessRequired: boolean;
    sampleRate?: null | number;
    serverTranscodeRequested: boolean;
}

/**
 * Default Google Cast media receiver supports lossless FLAC up to 96 kHz / 24-bit.
 * Higher sample rates (e.g. 192 kHz hi-res) must use a server-transcoded cast leg.
 */
export const CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ = 96_000;

export const needsChromecastCompatibleStream = (quality: MobilePlaybackQuality) => {
    if (quality.serverTranscodeRequested) {
        return false;
    }

    const sampleRate = quality.sampleRate ?? 0;
    return sampleRate > CHROMECAST_MAX_LOSSLESS_SAMPLE_RATE_HZ;
};
/**
 * Map an audio file extension to its canonical audio mime type so we can hand
 * the cast receiver something it actually knows how to decode. Returns null
 * for formats we can't cast.
 */
export const mimeFromAudioFileExt = (rawExt: string | undefined): null | string => {
    if (!rawExt) return null;
    const ext = rawExt.toLowerCase().replace(/^\./, '');
    switch (ext) {
        case 'aac':
            return 'audio/aac';
        case 'flac':
            return 'audio/flac';
        case 'm4a':
        case 'm4b':
        case 'mp4':
            return 'audio/mp4';
        case 'mp3':
            return 'audio/mpeg';
        case 'oga':
        case 'ogg':
            return 'audio/ogg';
        case 'opus':
            return 'audio/ogg; codecs=opus';
        case 'wav':
            return 'audio/wav';
        default:
            return null;
    }
};
// ---------------------------------------------------------------------------
// Samo native playback builders
// ---------------------------------------------------------------------------

/** Matches `podcast:<showId>:<episodeId>` and legacy `podcast-episode:<episodeId>`. */
export const SAMO_PODCAST_PLAYBACK_ID_INNER =
    /:(?:podcast:([^:]+(?::[^:]+)?)|podcast-episode:([^:]+))$/;

export const buildSamoPodcastPlaybackId = (
    authentication: Pick<ServerAuthenticationResult, 'type' | 'url'>,
    showId: string,
    episodeId: string,
) => `${authentication.type}:${authentication.url}:podcast:${showId}:${episodeId}`;

export const parsePodcastPlaybackEpisodeId = (playbackId: string): string | undefined => {
    const match = playbackId.match(SAMO_PODCAST_PLAYBACK_ID_INNER);
    if (!match) {
        return undefined;
    }

    if (match[1]) {
        const segments = match[1].split(':');
        return segments[segments.length - 1];
    }

    return match[2];
};

export const parsePodcastPlaybackShowId = (playbackId: string): string | undefined => {
    const marker = ':podcast:';
    const markerIndex = playbackId.lastIndexOf(marker);
    if (markerIndex < 0) {
        return undefined;
    }

    const rest = playbackId.slice(markerIndex + marker.length);
    const episodeSeparator = rest.lastIndexOf(':');
    if (episodeSeparator <= 0) {
        return rest || undefined;
    }

    return rest.slice(0, episodeSeparator) || undefined;
};

const samoQualityForFile = (
    audioFile: SamoAudioFile | undefined,
    deliveryKind: AudioDeliveryKind,
    losslessRequired: boolean,
): MobilePlaybackQuality => ({
    bitDepth: audioFile?.bitDepth ?? null,
    bitRate: audioFile?.bitrate ?? null,
    channelCount: audioFile?.channels ?? null,
    container: audioFile?.container ?? null,
    deliveryKind,
    losslessRequired,
    sampleRate: audioFile?.sampleRate ?? null,
    serverTranscodeRequested: false,
});

export const buildSamoMusicPlayback = (
    authentication: ServerAuthenticationResult,
    track: SamoMusicTrack,
    artworkUrl?: string,
    streamToken?: string,
    artworkImageId?: string,
): MobilePlayableAudio | null => {
    if (!track.id || !track.title) return null;

    const audioFile = track.primaryAudioFile ?? track.audioFiles?.[0];
    const quality = samoQualityForFile(audioFile, 'android-direct', true);
    const subtitle = [track.displayArtist, track.albumTitle].filter(Boolean).join(' - ')
        || undefined;

    return {
        album: track.albumTitle,
        albumId: track.albumId,
        artist: track.displayArtist,
        // First credited artist wins; the full-screen player resolves this id
        // against the local catalog mirror for the header avatar.
        artistId: track.artistIds?.[0] ?? track.albumArtistIds?.[0],
        artworkUrl,
        artworkImageId: pickSamoImageId(track.images) ?? artworkImageId,
        contentSourceId: getServerConnectionKey(authentication),
        durationSeconds: track.durationSeconds,
        id: `${authentication.type}:${authentication.url}:music:${track.id}`,
        mimeType: audioFile?.mimeType,
        quality,
        source: 'music',
        subtitle,
        title: track.title,
        url: getSamoMusicTrackStreamUrl(authentication, track.id, { streamToken }),
    };
};

export const parseSamoAudiobookIdFromPlaybackId = (playbackId: string): string | undefined => {
    // Matches both the single-id form `…:audiobook:<bookId>` and the per-file
    // queue form `…:audiobook:<bookId>:file:<mediaFileId>`. Progress sync and
    // artwork resolution both key on the BOOK id, so the trailing file segment
    // must be ignored.
    const match = playbackId.match(/:audiobook:([^:]+)(?::file:[^:]+)?$/);
    return match?.[1];
};

/**
 * The per-file media id in `…:audiobook:<bookId>:file:<mediaFileId>`, or
 * undefined for the single-id form. Twin of Kotlin's
 * `SamoNativeStreamUrl.parseAudiobookMediaFileId` — both sides rebuild the
 * stream URL from the playback id, so both must recover the same file id or
 * the two rebuilds point at different audio.
 */
export const parseSamoAudiobookMediaFileIdFromPlaybackId = (
    playbackId: string,
): string | undefined => {
    const marker = ':file:';
    const markerIndex = playbackId.lastIndexOf(marker);
    if (markerIndex < 0) {
        return undefined;
    }

    return playbackId.slice(markerIndex + marker.length) || undefined;
};

export const parseSamoMusicTrackIdFromPlaybackId = (playbackId: string): string | undefined => {
    const match = playbackId.match(/:music:([^:]+)$/);
    return match?.[1];
};

export const buildAudiobookTimelineSegments = (
    chapters: Array<{ id?: string; startSeconds?: number; title?: string }> | undefined,
    durationSeconds: number | undefined,
    ownerId: string,
): MobilePlaybackSegment[] => {
    const orderedChapters = (chapters ?? [])
        .map((chapter, index) => ({ chapter, index }))
        .filter(
            ({ chapter }) =>
                chapter.startSeconds !== undefined &&
                Number.isFinite(chapter.startSeconds) &&
                chapter.startSeconds >= 0 &&
                (!durationSeconds || chapter.startSeconds < durationSeconds),
        )
        .sort((left, right) => (left.chapter.startSeconds ?? 0) - (right.chapter.startSeconds ?? 0))
        .filter(
            ({ chapter }, index, ordered) =>
                index === 0 ||
                chapter.startSeconds !== ordered[index - 1].chapter.startSeconds,
        );

    return orderedChapters.map(({ chapter, index }, orderedIndex) => {
        const startSeconds = chapter.startSeconds ?? 0;
        const nextStart = orderedChapters[orderedIndex + 1]?.chapter.startSeconds;
        const segmentDuration =
            nextStart !== undefined
                ? Math.max(0, nextStart - startSeconds)
                : durationSeconds
                  ? Math.max(0, durationSeconds - startSeconds)
                  : undefined;

        return {
            durationSeconds: segmentDuration,
            id: chapter.id ?? `${ownerId}:chapter:${index}`,
            startSeconds,
            title: chapter.title?.trim() || `Chapter ${orderedIndex + 1}`,
        };
    });
};

/**
 * A Samo audiobook's underlying files as the client needs them for playback:
 * the per-file id (used as `mediaFileId` when streaming the file whole) and the
 * file's start position on the book-global timeline.
 */
export interface SamoAudiobookFilePlayback {
    durationSeconds: number;
    mediaFileId: string;
    /**
     * Reported MIME (e.g. `audio/mpeg`). Threaded onto the queue item so the
     * player can choose the server's frame-accurate seek for VBR MP3 instead of
     * ExoPlayer's coarse Xing seek (which lands chapter taps 20-70s off,
     * mid-sentence). Dropping it here silently disabled that whole path on
     * Android — `shouldServerSeekAudiobookMp3` saw an undefined mimeType and
     * always fell back to the native seek.
     */
    mimeType?: string;
    startOffsetSeconds: number;
}

/**
 * Normalize a Samo audiobook's `audioFiles[]` into the ordered, offset-stamped
 * list the multi-file queue is built from. Files arrive already sorted and
 * offset-stamped by the server; this just defends against missing fields and
 * back-fills offsets by accumulating durations if the server omitted them.
 */
export const samoAudiobookFilePlaybacks = (
    audiobook: Pick<SamoAudiobook, 'audioFiles' | 'primaryAudioFile'>,
): SamoAudiobookFilePlayback[] => {
    const files = (audiobook.audioFiles ?? []).filter((file) => file.id);
    if (files.length === 0) {
        const primary = audiobook.primaryAudioFile;
        if (!primary?.id) return [];
        return [
            {
                durationSeconds: fileDurationSeconds(primary),
                mediaFileId: primary.id,
                mimeType: primary.mimeType,
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
            mimeType: file.mimeType,
            startOffsetSeconds,
        };
    });
};

const fileDurationSeconds = (file: SamoAudioFile): number => {
    if (file.durationMs && file.durationMs > 0) {
        return file.durationMs / 1000;
    }
    return file.durationSeconds ?? 0;
};

/**
 * Length of the book-global timeline a per-file queue spans: the end of the
 * last file, or the server's own book duration when that runs longer (a file
 * with a missing duration would otherwise cut the timeline short).
 *
 * This is the number the seek bar, the duration label, and the progress clamp
 * all need — NOT the per-file `durationSeconds` each queue item carries.
 */
export const samoAudiobookTimelineDurationSeconds = (
    files: readonly SamoAudiobookFilePlayback[],
    bookDurationSeconds?: number,
): number | undefined => {
    const lastFile = files[files.length - 1];
    const filesEnd = lastFile
        ? lastFile.startOffsetSeconds + (lastFile.durationSeconds || 0)
        : 0;
    const bookDuration =
        bookDurationSeconds && Number.isFinite(bookDurationSeconds) && bookDurationSeconds > 0
            ? bookDurationSeconds
            : 0;
    const timeline = Math.max(filesEnd, bookDuration);

    return timeline > 0 ? timeline : undefined;
};

/** Pick the file whose [startOffset, startOffset+duration) span contains the book second. */
export const pickSamoAudiobookFileIndexForBookTime = (
    files: readonly SamoAudiobookFilePlayback[],
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

/**
 * Build a Samo audiobook as a multi-file ExoPlayer queue — one playable per
 * underlying file.
 *
 * This is the heart of the audiobook rework. The server now serves each file
 * WHOLE (with HTTP range support) at `…/stream?mediaFileId=<id>`, so the player
 * owns seeking: -15s, Previous, and chapter jumps are local `seekTo` calls
 * inside the current file (or a queue step across a file boundary), never a
 * stream restart. Each file carries:
 *
 *   - `progressOffsetSeconds` = the file's book-global start, so the existing
 *     book-time<->file-time mapping (getTimelinePositionSeconds, the seek bar,
 *     chapter markers) keeps working unchanged;
 *   - `durationSeconds` = the file's own length (the native duration);
 *   - book-global `timelineSegments` (chapters) shared across every file.
 *
 * The file containing `bookStartSeconds` gets `initialPositionSeconds` set to
 * the in-file remainder; the rest start at 0.
 */
export const buildSamoAudiobookFileQueue = (
    authentication: ServerAuthenticationResult,
    audiobook: SamoAudiobook,
    options: {
        artworkUrl?: string;
        bookStartSeconds: number;
        streamToken?: string;
        timelineSegments?: MobilePlaybackSegment[];
    },
): { index: number; items: MobilePlayableAudio[] } | null => {
    if (!audiobook.id) return null;
    const title = audiobook.book?.title;
    if (!title) return null;

    const files = samoAudiobookFilePlaybacks(audiobook);
    if (files.length === 0) return null;

    const authors = audiobook.book?.authors
        ?.map((author) => author.name)
        .filter(Boolean)
        .join(', ');
    const timelineSegments =
        options.timelineSegments ??
        buildAudiobookTimelineSegments(audiobook.chapters, audiobook.durationSeconds, audiobook.id);
    const mimeById = new Map(
        (audiobook.audioFiles ?? []).map((file) => [file.id, file.mimeType] as const),
    );

    return buildSamoAudiobookQueueFromFiles(authentication, {
        artworkUrl: options.artworkUrl,
        audiobookId: audiobook.id,
        bookStartSeconds: options.bookStartSeconds,
        files,
        mimeTypeFor: (mediaFileId) => mimeById.get(mediaFileId),
        streamToken: options.streamToken,
        subtitle: authors,
        timelineDurationSeconds: audiobook.durationSeconds,
        timelineSegments,
        title,
    });
};

/**
 * Core multi-file queue builder, working purely from the per-file manifest.
 * Both buildSamoAudiobookFileQueue (raw SamoAudiobook) and the Android play
 * handler (which only has the manifest threaded through MobileMediaDetail) call
 * this, so there is exactly one place that maps the manifest to a queue.
 */
export const buildSamoAudiobookQueueFromFiles = (
    authentication: ServerAuthenticationResult,
    params: {
        artworkUrl?: string;
        audiobookId: string;
        bookStartSeconds: number;
        files: readonly SamoAudiobookFilePlayback[];
        mimeTypeFor?: (mediaFileId: string) => string | undefined;
        streamToken?: string;
        subtitle?: string;
        /** Whole-book duration when the caller knows it; derived from the file
         *  manifest otherwise. See [MobilePlayableAudio.timelineDurationSeconds]. */
        timelineDurationSeconds?: number;
        timelineSegments?: MobilePlaybackSegment[];
        title: string;
    },
): { index: number; items: MobilePlayableAudio[] } | null => {
    if (params.files.length === 0) return null;

    const bookStart = Math.max(0, Math.floor(params.bookStartSeconds));
    const sharedTimeline =
        params.timelineSegments && params.timelineSegments.length > 1
            ? params.timelineSegments
            : undefined;
    const index = pickSamoAudiobookFileIndexForBookTime(params.files, bookStart);
    // Every item in the queue shares the same book-global timeline length —
    // that's the whole point: the seek bar spans the BOOK while each item's
    // `durationSeconds` stays the file's own (native) length.
    const timelineDurationSeconds = samoAudiobookTimelineDurationSeconds(
        params.files,
        params.timelineDurationSeconds,
    );

    const items = params.files.map((file, fileIndex) => {
        const initialPositionSeconds =
            fileIndex === index ? Math.max(0, bookStart - file.startOffsetSeconds) : 0;
        return {
            artworkUrl: params.artworkUrl,
            contentSourceId: getServerConnectionKey(authentication),
            // Per-file native duration; book-global duration lives on the detail.
            durationSeconds: file.durationSeconds,
            id: samoAudiobookFilePlaybackId(authentication, params.audiobookId, file.mediaFileId),
            initialPositionSeconds,
            // Prefer the manifest's own mimeType (now threaded through
            // samoAudiobookFilePlaybacks); fall back to the optional lookup the
            // full-detail caller still passes. Either way the queue item must
            // carry it or the MP3 frame-seek path stays dead.
            mimeType: file.mimeType ?? params.mimeTypeFor?.(file.mediaFileId),
            // The file's book-global start keeps the timeline math unchanged.
            progressOffsetSeconds: file.startOffsetSeconds,
            quality: samoQualityForFile(undefined, 'android-direct', false),
            source: 'audiobook' as const,
            subtitle: params.subtitle,
            timelineDurationSeconds,
            timelineSegments: sharedTimeline,
            title: params.title,
            // Whole file; the player seeks locally. No progressSeconds/offset.
            url: getSamoAudiobookStreamUrl(authentication, params.audiobookId, {
                mediaFileId: file.mediaFileId,
                streamToken: params.streamToken,
            }),
        } satisfies MobilePlayableAudio;
    });

    return { index, items };
};

/**
 * Per-file playback id for a Samo audiobook. The audiobook id stays parseable
 * (parseSamoAudiobookIdFromPlaybackId) so progress sync still keys on the book;
 * the trailing file id disambiguates queue items.
 */
export const samoAudiobookFilePlaybackId = (
    authentication: Pick<ServerAuthenticationResult, 'type' | 'url'>,
    audiobookId: string,
    mediaFileId: string,
) => `${authentication.type}:${authentication.url}:audiobook:${audiobookId}:file:${mediaFileId}`;

export const buildSamoAudiobookPlayback = (
    authentication: ServerAuthenticationResult,
    audiobook: SamoAudiobook,
    artworkUrl?: string,
    streamToken?: string,
    options?: {
        startSeconds?: number;
        timelineSegments?: MobilePlaybackSegment[];
    },
): MobilePlayableAudio | null => {
    const bookStart = Math.max(
        0,
        Math.floor(options?.startSeconds ?? audiobook.progress?.progressSeconds ?? 0),
    );
    // Single source of truth: build the multi-file queue and return the file
    // that contains the resume point. The whole-file/local-seek model means even
    // a one-file book plays through this path (it just yields a one-item queue).
    const queue = buildSamoAudiobookFileQueue(authentication, audiobook, {
        artworkUrl,
        bookStartSeconds: bookStart,
        streamToken,
        timelineSegments: options?.timelineSegments,
    });
    if (!queue) return null;
    return queue.items[queue.index] ?? queue.items[0] ?? null;
};

/**
 * Samo podcast episodes stream WHOLE and the player owns seeking (mirrors the
 * audiobook model). Resume is the in-file [initialPositionSeconds] the client
 * seeks to after play — NOT a server byte offset. The old model embedded
 * `offsetSeconds` in the URL so the server truncated the body and native pos 0
 * meant book-second N; that linear byte cut (size*offset/duration) landed on the
 * wrong byte for VBR/AAC, which is what made podcasts randomly snap back to
 * where you started and broke the seek bar. progressOffsetSeconds is 0 now —
 * there is no truncated-stream origin to fold into the displayed position.
 */
export const applySamoPodcastStreamResume = (
    playback: MobilePlayableAudio,
    resumeSeconds: number,
    authentication: ServerAuthenticationResult,
    streamToken?: string,
): MobilePlayableAudio => {
    const episodeId = parsePodcastPlaybackEpisodeId(playback.id);
    if (!episodeId) {
        return playback;
    }

    const resume = Math.max(0, Math.floor(resumeSeconds));
    const proxyUrl = getSamoPodcastEpisodeStreamUrl(authentication, episodeId, { streamToken });

    // Direct-enclosure mode: the playable URL stays the episode's own CDN
    // enclosure (no server hop); the freshly-tokened proxy rides along as the
    // native fallback. Legacy/proxy mode keeps rebuilding `url` itself.
    if (playback.serverStreamUrl !== undefined) {
        return {
            ...playback,
            initialPositionSeconds: resume,
            progressOffsetSeconds: 0,
            serverStreamUrl: proxyUrl,
        };
    }

    return {
        ...playback,
        initialPositionSeconds: resume,
        progressOffsetSeconds: 0,
        url: proxyUrl,
    };
};

export const isSamoPodcastPlayback = (item: MobilePlayableAudio) =>
    item.source === 'podcast' && item.id.startsWith(`${ServerType.SAMO}:`);

/**
 * A playable direct enclosure: plain http(s) only. Anything else (missing,
 * malformed, exotic schemes) falls back to the server proxy.
 */
const pickDirectPodcastEnclosureUrl = (enclosureUrl: string | undefined): string | undefined => {
    if (!enclosureUrl) {
        return undefined;
    }
    try {
        const parsed = new URL(enclosureUrl);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
            ? enclosureUrl
            : undefined;
    } catch {
        return undefined;
    }
};

export const buildSamoPodcastEpisodePlayback = (
    authentication: ServerAuthenticationResult,
    episode: SamoPodcastEpisode,
    showId: string | undefined,
    artworkUrl?: string,
    streamToken?: string,
): MobilePlayableAudio | null => {
    if (!episode.id) return null;
    const title = episode.title ?? episode.name;
    if (!title) return null;

    const resolvedShowId = showId ?? episode.podcastId;
    if (!resolvedShowId) return null;

    const audioFile = episode.audioFiles?.[0];
    const resumeSeconds = Math.max(
        0,
        Math.floor(
            episode.progress?.progressSeconds ?? episode.playback?.progressSeconds ?? 0,
        ),
    );
    const quality = samoQualityForFile(audioFile, 'android-direct', false);

    const publishedAtMs = episode.publishedAt
        ? Date.parse(episode.publishedAt)
        : undefined;

    // Source selection, smartest-first:
    //   1. The SERVER already holds the bytes (proxy cache or a local-library
    //      episode) → stream through the server: disk-fast, no CDN walk.
    //   2. Otherwise stream the CDN enclosure DIRECTLY — the proxy costs a
    //      whole extra network leg (brutal through a remote tunnel) plus its
    //      first-fetch ad-chain walk. The proxy rides along in
    //      `serverStreamUrl` as the native open-failure fallback.
    //   3. No usable enclosure → proxy.
    // A file downloaded ON THE PHONE supersedes all of this at play/queue time
    // via resolveOfflinePlayable. Progress sync is keyed on the episode id and
    // is identical in every mode.
    const serverHoldsEpisode =
        episode.cache?.cached === true || episode.cache?.local === true;
    const directEnclosureUrl = serverHoldsEpisode
        ? undefined
        : pickDirectPodcastEnclosureUrl(episode.enclosureUrl);
    const proxyUrl = getSamoPodcastEpisodeStreamUrl(authentication, episode.id, { streamToken });

    return applySamoPodcastStreamResume(
        {
            artworkUrl,
            contentSourceId: getServerConnectionKey(authentication),
            durationSeconds: episode.durationSeconds ?? episode.duration,
            id: buildSamoPodcastPlaybackId(authentication, resolvedShowId, episode.id),
            mimeType: audioFile?.mimeType ?? episode.enclosureType,
            publishedAt:
                publishedAtMs !== undefined && Number.isFinite(publishedAtMs)
                    ? publishedAtMs
                    : undefined,
            quality,
            serverStreamUrl: directEnclosureUrl ? proxyUrl : undefined,
            source: 'podcast',
            title,
            url: directEnclosureUrl ?? proxyUrl,
        },
        resumeSeconds,
        authentication,
        streamToken,
    );
};

export const buildSamoInternetRadioPlayback = (
    authentication: ServerAuthenticationResult,
    station: SamoInternetRadioStation,
    artworkUrl?: string,
): MobilePlayableAudio | null => {
    const streamUrl = station.publicStreamUrl ?? station.streamUrl;

    if (!station.id || !station.name || !streamUrl) {
        return null;
    }

    const display = resolveSamoInternetRadioPlaybackDisplay(station);

    return {
        artworkImageId: pickSamoCatalogImageId(station.coverId),
        artworkUrl,
        artist: display.playerArtist,
        contentSourceId: getServerConnectionKey(authentication),
        homepageUrl: station.homepageUrl,
        id: `${getServerConnectionKey(authentication)}:internet-radio:${station.id}`,
        isLive: true,
        mimeType: station.contentType,
        quality: {
            bitRate: station.bitrate ?? null,
            container: station.codec ?? null,
            deliveryKind: 'android-direct',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        radioStationId: station.id,
        radioStationName: display.stationName,
        source: 'radio',
        subtitle: display.playerSubtitle,
        title: display.playerTitle,
        url: streamUrl,
    };
};

/**
 * Mint or reuse a Samo stream token before building a playback URL. Used
 * before queueing a track so the URL embedded in `MobilePlayableAudio` is
 * authenticated for the next 25 minutes — long enough for the player to
 * start without a refresh round-trip.
 */
export const refreshSamoStreamToken = async (
    authentication: ServerAuthenticationResult,
    fetcher?: SamoFetch,
): Promise<string | undefined> => {
    if (authentication.type !== ServerType.SAMO) return undefined;
    return ensureSamoStreamToken(authentication, fetcher);
};

