import type { SamoInternetRadioStation, SamoInternetRadioStationNowPlaying } from '../server/server-samo';

import type { MobilePlayableAudio } from './mobile-playback';

export type RadioNowPlaying = Pick<
    SamoInternetRadioStationNowPlaying,
    'artist' | 'raw' | 'title'
>;

export type RadioPlaybackDisplay = {
    /** Lock-screen / cast artist line. */
    playerArtist: string;
    playerSubtitle: string;
    playerTitle: string;
    stationName: string;
};

const mimeToCodecLabel = (mimeType: string | undefined): string | undefined => {
    if (!mimeType) {
        return undefined;
    }

    const normalized = mimeType.toLowerCase();
    if (normalized.includes('mpeg')) {
        return 'MP3';
    }
    if (normalized.includes('aac')) {
        return 'AAC';
    }
    if (normalized.includes('ogg') || normalized.includes('opus')) {
        return 'OGG';
    }
    if (normalized.includes('flac')) {
        return 'FLAC';
    }

    const slash = normalized.indexOf('/');
    if (slash >= 0 && slash < normalized.length - 1) {
        return normalized.slice(slash + 1).toUpperCase();
    }

    return undefined;
};

export const formatRadioNowPlayingLine = (
    nowPlaying?: RadioNowPlaying | null,
): string | undefined => {
    if (!nowPlaying) {
        return undefined;
    }

    const title = nowPlaying.title?.trim();
    const artist = nowPlaying.artist?.trim();
    const raw = nowPlaying.raw?.trim();

    if (title) {
        return artist ? `${artist} — ${title}` : title;
    }

    if (raw) {
        return raw;
    }

    if (artist) {
        return artist;
    }

    return undefined;
};

export const formatRadioStreamFormat = (station: {
    bitrate?: number;
    codec?: string;
    contentType?: string;
    quality?: MobilePlayableAudio['quality'];
}): string | undefined => {
    const parts: string[] = [];
    const bitRate = station.bitrate ?? station.quality?.bitRate ?? undefined;

    if (bitRate && bitRate > 0) {
        parts.push(`${bitRate} kbps`);
    }

    const codec =
        station.codec?.trim() ||
        station.quality?.container?.trim() ||
        mimeToCodecLabel(station.contentType);

    if (codec) {
        parts.push(codec.toUpperCase());
    }

    return parts.length > 0 ? parts.join(' · ') : undefined;
};

export const formatRadioTagsLine = (tags: string[] | undefined): string | undefined => {
    const trimmed = tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];

    if (trimmed.length === 0) {
        return undefined;
    }

    return trimmed.slice(0, 4).join(' · ');
};

const normalizeRadioLabel = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, ' ');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * True when `value` only repeats the station name (common ICY / description echo).
 */
export const isRedundantRadioStationLabel = (
    stationName: string,
    value: string | undefined,
): boolean => {
    if (!value?.trim()) {
        return true;
    }

    const station = normalizeRadioLabel(stationName);
    const text = normalizeRadioLabel(value);

    if (!station) {
        return true;
    }

    if (text === station) {
        return true;
    }

    const stripped = text.replace(
        new RegExp(`^${escapeRegExp(station)}(?:\\s*[-–—|:]\\s*|\\s+)`, 'u'),
        '',
    );

    if (stripped !== text) {
        return stripped.length === 0 || stripped.includes(station);
    }

    return false;
};

const looksLikeUrl = (value: string) => /^(https?:\/\/|www\.|[a-z]+:\/\/)/i.test(value.trim());

const subtitlePartMatchesStreamQuality = (part: string, streamQuality: string | undefined) => {
    if (!streamQuality) {
        return false;
    }

    const normalizedPart = part.toLowerCase();
    const normalizedQuality = streamQuality.toLowerCase();

    return (
        normalizedPart === normalizedQuality ||
        normalizedQuality.includes(normalizedPart) ||
        normalizedPart.includes(normalizedQuality)
    );
};

/** Three-line radio player metadata: station, middle detail, stream format. */
export const getRadioPlaybackMetadataLines = (item: MobilePlayableAudio): string[] => {
    const station = item.radioStationName?.trim() || item.title?.trim() || 'Radio';
    const streamQuality = formatRadioStreamFormat(item)?.trim();
    const trackTitle = item.title?.trim();

    const hasRealNowPlaying =
        Boolean(trackTitle) &&
        trackTitle !== station &&
        !isRedundantRadioStationLabel(station, trackTitle);

    let middle: string | undefined;

    if (hasRealNowPlaying) {
        const artist = item.artist?.trim();
        middle = formatRadioNowPlayingLine({
            artist:
                artist && !isRedundantRadioStationLabel(station, artist) ? artist : undefined,
            title: trackTitle,
        });
    } else if (item.subtitle?.trim()) {
        const parts = item.subtitle
            .split(' · ')
            .map((part) => part.trim())
            .filter((part) => {
                if (!part || looksLikeUrl(part)) {
                    return false;
                }
                if (isRedundantRadioStationLabel(station, part)) {
                    return false;
                }
                if (subtitlePartMatchesStreamQuality(part, streamQuality)) {
                    return false;
                }
                return true;
            });
        middle = parts.length > 0 ? parts.join(' · ') : undefined;
    }

    if (middle && isRedundantRadioStationLabel(station, middle)) {
        middle = undefined;
    }

    return [station, middle, streamQuality].filter((line): line is string => Boolean(line));
};

const trimDescription = (description: string | undefined, maxLength = 96): string | undefined => {
    const trimmed = description?.trim();

    if (!trimmed) {
        return undefined;
    }

    if (trimmed.length <= maxLength) {
        return trimmed;
    }

    return `${trimmed.slice(0, maxLength - 1)}…`;
};
export const resolveRadioPlaybackDisplay = (
    stationName: string,
    options?: {
        bitrate?: number;
        codec?: string;
        contentType?: string;
        description?: string;
        nowPlaying?: RadioNowPlaying | null;
        tags?: string[];
        quality?: MobilePlayableAudio['quality'];
    },
): RadioPlaybackDisplay => {
    const np = options?.nowPlaying;
    const trackTitle = np?.title?.trim();
    const trackArtist = np?.artist?.trim();
    const raw = np?.raw?.trim();
    const resolvedTrackTitle = trackTitle || (raw && !trackTitle ? raw : undefined);
    const formatLine = formatRadioStreamFormat(options ?? {});
    const tagsLine = formatRadioTagsLine(options?.tags);
    const description = trimDescription(options?.description);
    const safeDescription =
        description && !isRedundantRadioStationLabel(stationName, description)
            ? description
            : undefined;

    const hasTrack =
        Boolean(resolvedTrackTitle) &&
        !isRedundantRadioStationLabel(stationName, resolvedTrackTitle) &&
        !isRedundantRadioStationLabel(stationName, trackArtist);

    const playerTitle = hasTrack ? resolvedTrackTitle! : stationName;

    let playerSubtitle: string;
    if (hasTrack) {
        playerSubtitle =
            trackArtist && !isRedundantRadioStationLabel(stationName, trackArtist)
                ? `${trackArtist} · ${stationName}`
                : stationName;
    } else {
        playerSubtitle =
            [formatLine, tagsLine, safeDescription].filter(Boolean).join(' · ') ||
            'Internet radio';
    }

    return {
        playerArtist: trackArtist || stationName,
        playerSubtitle,
        playerTitle,
        stationName,
    };
};

export const resolveSamoInternetRadioPlaybackDisplay = (
    station: SamoInternetRadioStation,
): RadioPlaybackDisplay =>
    resolveRadioPlaybackDisplay(station.name, {
        bitrate: station.bitrate,
        codec: station.codec,
        contentType: station.contentType,
        description: station.description,
        nowPlaying: station.nowPlaying,
        tags: station.tags,
    });

export const parseSamoInternetRadioStationId = (playbackId: string): string | undefined => {
    const match = playbackId.match(/:internet-radio:([^:]+)$/);
    return match?.[1];
};

/**
 * The station id behind a PROGRAMMED radio playback id.
 *
 * Samo has two kinds of station and they are separate catalogs: an internet
 * station is a URL samo relays, a programmed one is a schedule samo streams
 * itself. Their ids collide freely, so anything resolving a station by id has
 * to know which of the two it is holding — which is exactly what the two
 * distinct playback-id shapes carry.
 */
export const parseSamoProgrammedRadioStationId = (playbackId: string): string | undefined => {
    const match = playbackId.match(/(?:^|:)radio-programmed:([^:]+)$/);
    return match?.[1];
};

export const enrichSamoRadioPlaybackItem = (
    item: MobilePlayableAudio,
    station: SamoInternetRadioStation,
): MobilePlayableAudio => {
    const display = resolveSamoInternetRadioPlaybackDisplay(station);

    return {
        ...item,
        artist: display.playerArtist,
        radioStationId: station.id,
        radioStationName: display.stationName,
        subtitle: display.playerSubtitle,
        title: display.playerTitle,
    };
};
