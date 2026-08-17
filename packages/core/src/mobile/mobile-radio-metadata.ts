import type {
    SamoChannel,
    SamoChannelAiring,
    SamoChannelNowPlaying,
} from '../server/server-samo-channels';
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

/**
 * A station's announced text, or undefined when it announces nothing.
 *
 * Stations announce SOMETHING even when they have nothing to say. `- - -` is
 * the conventional "no metadata yet" placeholder, and a relay emits it for
 * real: the SiriusXM bridge builds its ICY line as `{artist} - {song}` from a
 * now-playing record whose fields are both `-` until SiriusXM reports a track
 * for the channel it has just tuned. That lands here as an artist of `-` and a
 * title of `-`, and every surface then dutifully prints `- — -` where the song
 * belongs — on the tile, in the player, on the lock screen.
 *
 * Letters and digits are what make a value worth showing. Anything that is
 * only punctuation and space is a placeholder however it happens to be spelled
 * (`-`, `---`, `...`, `··`), so it is treated as the silence it stands for.
 */
const announcedText = (value: string | undefined): string | undefined => {
    const trimmed = value?.trim();
    return trimmed && /[\p{L}\p{N}]/u.test(trimmed) ? trimmed : undefined;
};

const ICY_STREAM_TITLE = /StreamTitle=(?:'([^']*)'|"([^"]*)")/i;

/**
 * What a station is announcing over ICY, or undefined when it announces nothing.
 *
 * Takes either form the announcement arrives in: the raw metadata blob a
 * socket reader pulls off the wire (`StreamTitle='Elvis Presley - Kentucky
 * Rain';`) or the bare title a player has already unwrapped — ExoPlayer hands
 * over `IcyInfo.title` pre-parsed. One parser for both, because the desktop
 * reads the blob and the phone reads the field, and the two must not disagree
 * about where the artist ends and the song begins.
 *
 * `Artist - Title` is the near-universal convention and the dash is the only
 * thing separating them. Anything without one is a title in its own right —
 * station IDs, show names, and the plain track titles some encoders send.
 */
export const parseIcyStreamTitle = (
    value: null | string | undefined,
): RadioNowPlaying | undefined => {
    const trimmed = value?.trim();

    if (!trimmed) {
        return undefined;
    }

    const blob = trimmed.match(ICY_STREAM_TITLE);
    const streamTitle = announcedText(blob ? (blob[1] ?? blob[2]) : trimmed);

    if (!streamTitle) {
        return undefined;
    }

    const split = streamTitle.match(/^(.*?)\s*[-–—]\s*(.+)$/);

    if (!split) {
        return { raw: streamTitle, title: streamTitle };
    }

    const artist = announcedText(split[1]);
    const title = announcedText(split[2]);

    return { artist, raw: streamTitle, title: title ?? streamTitle };
};

export const formatRadioNowPlayingLine = (
    nowPlaying?: RadioNowPlaying | null,
): string | undefined => {
    if (!nowPlaying) {
        return undefined;
    }

    const title = announcedText(nowPlaying.title);
    const artist = announcedText(nowPlaying.artist);
    const raw = announcedText(nowPlaying.raw);

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
    const trackTitle = announcedText(item.title);

    const hasRealNowPlaying =
        Boolean(trackTitle) &&
        trackTitle !== station &&
        !isRedundantRadioStationLabel(station, trackTitle);

    let middle: string | undefined;

    if (hasRealNowPlaying) {
        const artist = announcedText(item.artist);
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
                if (!announcedText(part) || looksLikeUrl(part)) {
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
        /** What the second line says when the station is not announcing a track. */
        fallbackSubtitle?: string;
        nowPlaying?: RadioNowPlaying | null;
        tags?: string[];
        quality?: MobilePlayableAudio['quality'];
    },
): RadioPlaybackDisplay => {
    const np = options?.nowPlaying;
    const trackTitle = announcedText(np?.title);
    const trackArtist = announcedText(np?.artist);
    const raw = announcedText(np?.raw);
    const resolvedTrackTitle = trackTitle || (raw && !trackTitle ? raw : undefined);
    const formatLine = formatRadioStreamFormat(options ?? {});
    const tagsLine = formatRadioTagsLine(options?.tags);
    const description = trimDescription(options?.description);
    const safeDescription =
        description && !isRedundantRadioStationLabel(stationName, description)
            ? description
            : undefined;

    // A MISSING artist is not a redundant one. `isRedundantRadioStationLabel`
    // answers true for an empty value — correct where it decides whether to
    // PRINT a line, wrong here, where it used to throw away a perfectly good
    // title because nothing came with it. Plenty of stations announce a title
    // alone: raw ICY text, and any channel airing a podcast or an audiobook,
    // where there is no artist to report. Those all showed the station's own
    // name forever instead of what was on.
    const hasTrack =
        Boolean(resolvedTrackTitle) &&
        !isRedundantRadioStationLabel(stationName, resolvedTrackTitle) &&
        (!trackArtist || !isRedundantRadioStationLabel(stationName, trackArtist));

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
            options?.fallbackSubtitle ||
            'Internet radio';
    }

    return {
        playerArtist: trackArtist || stationName,
        playerSubtitle,
        playerTitle,
        stationName,
    };
};

/**
 * How a station presents itself the moment it is tuned to.
 *
 * Deliberately WITHOUT the station's `nowPlaying`. That field is a probe
 * record — samo-server opens the stream on a timer (ten minutes apart by
 * default), reads one announcement and stores it — so by the time anybody
 * tunes in it describes a song that finished several tracks ago. A listener
 * holding the stream can read the real thing off the audio itself, which is
 * what {@link parseIcyStreamTitle} and {@link applyRadioNowPlayingToPlayback}
 * are for; seeding from the snapshot only buys a wrong title for the second
 * before the first live announcement lands, and leaves a permanently wrong one
 * on any stream whose announcements the probe happened to catch mid-placeholder.
 *
 * The probe still earns its place on a station TILE, where nothing is playing
 * and there is no socket to read.
 */
export const resolveSamoInternetRadioPlaybackDisplay = (
    station: SamoInternetRadioStation,
): RadioPlaybackDisplay =>
    resolveRadioPlaybackDisplay(station.name, {
        bitrate: station.bitrate,
        codec: station.codec,
        contentType: station.contentType,
        description: station.description,
        tags: station.tags,
    });

/** What a Samo channel says it is airing, in the shape every station uses. */
export const samoChannelNowPlayingLine = (
    airing: SamoChannelAiring | null | undefined,
): RadioNowPlaying | undefined => {
    const title = announcedText(airing?.title);
    const artist = announcedText(airing?.artist);

    if (!title && !artist) {
        return undefined;
    }

    return { artist: artist || undefined, title: title || undefined };
};

/** What a channel is called on screen when it needs naming as a kind. */
export const SAMO_CHANNEL_LABEL = 'Samo channel';

/**
 * How a channel presents itself while it is playing.
 *
 * A channel that is not announcing anything falls back to naming what it is,
 * rather than to "Internet radio": a listener looking at a station they cannot
 * find anywhere else should be told it is Samo's own, not mislabelled as
 * somebody's stream off the web.
 */
export const resolveSamoChannelPlaybackDisplay = (
    channel: Pick<SamoChannel, 'bitrateKbps' | 'codec' | 'description' | 'name' | 'nowPlaying'>,
    airing?: SamoChannelAiring | null,
): RadioPlaybackDisplay =>
    resolveRadioPlaybackDisplay(channel.name, {
        bitrate: channel.bitrateKbps,
        codec: channel.codec,
        description: channel.description,
        fallbackSubtitle: SAMO_CHANNEL_LABEL,
        nowPlaying: samoChannelNowPlayingLine(airing ?? channel.nowPlaying),
    });

export const parseSamoInternetRadioStationId = (playbackId: string): string | undefined => {
    const match = playbackId.match(/:internet-radio:([^:]+)$/);
    return match?.[1];
};

/**
 * The channel id behind a channel playback id.
 *
 * The same reason `parseSamoProgrammedRadioStationId` exists: a queue
 * rehydrated from the native mirror has only the id string to go on, and
 * channel ids and station ids are separate catalogs that must not be confused.
 */
export const parseSamoChannelPlaybackId = (playbackId: string): string | undefined => {
    const match = playbackId.match(/:channel:([^:]+)$/);
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

/**
 * Re-state a playing station's item from what the stream just announced.
 *
 * Everything this needs is already ON the item — the station's own name, and
 * the codec and bitrate the format line is made of — so a track change costs
 * no request. That is the point. What is on air is a property of the audio
 * arriving, and the only thing that can answer it is whatever is holding the
 * socket; asking the server instead is asking something that last looked
 * minutes ago.
 *
 * A null line is not "leave it as it was", it is the station going quiet: the
 * item falls back to naming itself, rather than leaving a finished song up on
 * screen and on the lock screen.
 */
export const applyRadioNowPlayingToPlayback = (
    item: MobilePlayableAudio,
    nowPlaying: null | RadioNowPlaying | undefined,
): MobilePlayableAudio => {
    const display = resolveRadioPlaybackDisplay(
        item.radioStationName?.trim() || item.title?.trim() || 'Radio',
        {
            contentType: item.mimeType,
            nowPlaying,
            quality: item.quality,
        },
    );

    if (
        display.playerArtist === item.artist &&
        display.playerSubtitle === item.subtitle &&
        display.playerTitle === item.title
    ) {
        return item;
    }

    return {
        ...item,
        artist: display.playerArtist,
        radioStationName: display.stationName,
        subtitle: display.playerSubtitle,
        title: display.playerTitle,
    };
};

/** The channel twin of {@link applyRadioNowPlayingToPlayback}. */
export const enrichSamoChannelPlaybackItem = (
    item: MobilePlayableAudio,
    channel: Pick<
        SamoChannel,
        'bitrateKbps' | 'codec' | 'description' | 'id' | 'name' | 'nowPlaying'
    >,
    nowPlaying?: SamoChannelNowPlaying | null,
): MobilePlayableAudio => {
    const display = resolveSamoChannelPlaybackDisplay(channel, nowPlaying?.current);

    return {
        ...item,
        artist: display.playerArtist,
        radioChannelId: channel.id,
        radioStationName: display.stationName,
        subtitle: display.playerSubtitle,
        title: display.playerTitle,
    };
};
