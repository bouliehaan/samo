import { type MobileMediaDetail, MobileMediaDetailType, type MobileMediaTrack } from '@samo/core/mobile';
import { formatPlaybackReleaseDate, looksLikeUrl } from '../utils/playback-time';

export const formatTrackDuration = (durationSeconds: number | undefined) => {
    if (!durationSeconds) {
        return undefined;
    }

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60)
        .toString()
        .padStart(2, '0');

    return `${minutes}:${seconds}`;
};

/**
 * Episode length for a podcast row's subtext — "43 min", "1 hr 12 min". A feed
 * is scanned for how long an episode is, not for its exact runtime, so the
 * clock shape a music track gets ("72:04") reads wrong here and hides the hour
 * boundary altogether.
 */
export const formatEpisodeLength = (durationSeconds: number | undefined) => {
    if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return undefined;
    }

    const totalMinutes = Math.round(durationSeconds / 60);
    if (totalMinutes < 1) {
        return `${Math.round(durationSeconds)} sec`;
    }

    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
};

export const formatTrackTimestamp = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) {
        return undefined;
    }

    return `Starts ${formatTrackDuration(seconds)}`;
};

export const normalizeTrackMetadataValue = (value: string | undefined) => {
    if (!value || looksLikeUrl(value)) {
        return undefined;
    }

    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned.length > 0 ? cleaned : undefined;
};

export const splitCompoundTrackSubtitle = (value: string | undefined) => {
    const cleaned = normalizeTrackMetadataValue(value);
    if (!cleaned) {
        return [];
    }

    return cleaned
        .split(/\s+(?:-|–|—|·)\s+/)
        .map((part) => normalizeTrackMetadataValue(part))
        .filter((part): part is string => Boolean(part));
};

export const pushUniqueTrackMetadata = (items: string[], value: string | undefined) => {
    const cleaned = normalizeTrackMetadataValue(value);
    if (!cleaned) {
        return;
    }

    const key = cleaned.toLocaleLowerCase();
    if (!items.some((item) => item.toLocaleLowerCase() === key)) {
        items.push(cleaned);
    }
};

export const getTrackMetadataItems = (
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
    qualityLabels: string[],
    includeTimestamp: boolean,
) => {
    const items: string[] = [];
    const isPodcastEpisode = detail.type === MobileMediaDetailType.PODCAST;
    const artist = normalizeTrackMetadataValue(track.artist);
    const album = normalizeTrackMetadataValue(track.album);
    const subtitle = normalizeTrackMetadataValue(track.subtitle);

    if (detail.type === MobileMediaDetailType.ALBUM) {
        pushUniqueTrackMetadata(items, artist);
        if (!artist && subtitle) {
            const albumTitleKey = normalizeTrackMetadataValue(detail.title)?.toLocaleLowerCase();
            const albumKey = album?.toLocaleLowerCase() ?? albumTitleKey;
            const scopedSubtitle = splitCompoundTrackSubtitle(subtitle).find((part) => {
                const key = part.toLocaleLowerCase();
                return key !== albumTitleKey && key !== albumKey;
            });
            pushUniqueTrackMetadata(items, scopedSubtitle ?? subtitle);
        }
    } else if (detail.type === MobileMediaDetailType.PLAYLIST) {
        pushUniqueTrackMetadata(items, artist);
        pushUniqueTrackMetadata(items, album);
        if (!artist && !album) {
            const subtitleParts = splitCompoundTrackSubtitle(subtitle);
            if (subtitleParts.length > 1) {
                subtitleParts.forEach((part) => pushUniqueTrackMetadata(items, part));
            } else {
                pushUniqueTrackMetadata(items, subtitle);
            }
        }
    } else if (isPodcastEpisode) {
        // A feed's `subtitle` is the episode's own show notes — long-form prose
        // that fills this single clipped line on its own and pushes out the two
        // facts you actually scan a feed for. The blurb is not lost: it is the
        // body of press-and-hold -> Episode Information, which carries this
        // same date and length above it.
        pushUniqueTrackMetadata(items, formatPlaybackReleaseDate(track.publishedAt));
        pushUniqueTrackMetadata(items, formatEpisodeLength(track.durationSeconds));
    } else {
        pushUniqueTrackMetadata(items, subtitle);
    }

    qualityLabels.forEach((label) => pushUniqueTrackMetadata(items, label));
    if (includeTimestamp) {
        pushUniqueTrackMetadata(items, formatTrackTimestamp(track.startSeconds));
    }
    if (!isPodcastEpisode) {
        // Episodes carry their length above, in the shape a feed reads in.
        pushUniqueTrackMetadata(items, formatTrackDuration(track.durationSeconds));
    }

    return items;
};
