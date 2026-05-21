import { type MobileMediaDetail, MobileMediaDetailType, type MobileMediaTrack } from '@samo/core/mobile';
import { looksLikeUrl } from '../utils/playback-time';

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
    } else {
        pushUniqueTrackMetadata(items, subtitle);
    }

    qualityLabels.forEach((label) => pushUniqueTrackMetadata(items, label));
    if (includeTimestamp) {
        pushUniqueTrackMetadata(items, formatTrackTimestamp(track.startSeconds));
    }
    pushUniqueTrackMetadata(items, formatTrackDuration(track.durationSeconds));

    return items;
};
