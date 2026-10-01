import {
    type AudioQualityBadgeItem,
    buildAudioQualityBadgeItems,
    type DeliveredAudioFormat,
    resolveDeliveredAudioQuality,
} from '@samo/core/audio-quality';
import { type MobilePlayableAudio } from '@samo/core/mobile';

/**
 * The player's one-line quality readout: a headline (`labelA`) and, where
 * there is more to say, a second view (`labelB`) the pill flips to.
 *
 * Shared by the phone's full-screen player and the TV's Now Playing, so the
 * two can never describe the same stream differently.
 */
export type PlayerQualityPill = {
    canToggle: boolean;
    labelA: string;
    labelB: string;
    tone: 'direct' | 'neutral' | 'transcoded';
};

/**
 * Music only: the badge describes the stream that ARRIVED, not the catalog row
 * that described the file. Those agree on a LAN stream and on a downloaded
 * copy; they part company the moment something between the server and the
 * device re-encodes the audio. `resolveDeliveredAudioQuality` returns the
 * catalog's own answer untouched whenever nothing has been observed, so this is
 * safe to apply unconditionally.
 */
export const getPlayerQualityItems = (
    item: MobilePlayableAudio,
    decodedFormat: DeliveredAudioFormat | undefined,
): AudioQualityBadgeItem[] =>
    item.source === 'music'
        ? buildAudioQualityBadgeItems({
              ...resolveDeliveredAudioQuality(item.quality, decodedFormat),
              compact: true,
              mode: 'detail',
          })
        : [];

/**
 * Collapse the quality items into the pill's two views.
 * items[0] = path (DIRECT/Transcoded), items[1] = format (FLAC/MP3),
 * items[2..] = bit-depth, sample-rate, or bitrate.
 */
export const getPlayerQualityPill = (
    qualityItems: AudioQualityBadgeItem[],
): null | PlayerQualityPill => {
    if (qualityItems.length === 0) return null;
    const pathItem = qualityItems[0];
    const formatItem = qualityItems[1];
    const bitrateItem = qualityItems[qualityItems.length - 1];

    // HI-RES direct (bit-depth present, direct tone)
    const isHiRes = qualityItems.some((q) => q.tone === 'direct' && q.label.includes('/'));

    if (isHiRes) {
        // Find the bd/sr spec item (e.g. "16/44.1")
        const specItem = qualityItems.find((q) => q.tone === 'direct' && q.label.includes('/'));
        const viewA = specItem ? `HI-RES\u00a0|\u00a0${specItem.label}` : 'HI-RES';
        const viewB = `${bitrateItem?.label ?? ''}\u00a0|\u00a0${pathItem?.label ?? ''}`;
        return {
            canToggle: true,
            labelA: viewA,
            labelB: viewB,
            tone: 'direct',
        };
    }

    // Lossless direct without explicit bit depth (e.g. FLAC)
    const isLosslessDirect = pathItem?.tone === 'direct' || formatItem?.tone === 'direct';
    if (isLosslessDirect && formatItem) {
        const viewA = `LOSSLESS\u00a0|\u00a0${formatItem.label}`;
        const viewB =
            bitrateItem && bitrateItem !== formatItem
                ? `${bitrateItem.label}\u00a0|\u00a0${pathItem?.label ?? ''}`
                : (pathItem?.label ?? '');
        return {
            canToggle: bitrateItem !== formatItem,
            labelA: viewA,
            labelB: viewB,
            tone: 'direct',
        };
    }

    // Transcoded. The headline is the format item, which on this path names
    // both ends of the trade (`FLAC → OPUS`) — what is on the server and
    // what actually got here. Everything measured off the live stream goes
    // behind the flip alongside the path, matching how the lossless pill
    // hides its bitrate there.
    if (pathItem?.tone === 'transcoded') {
        const measured = qualityItems
            .slice(2)
            .map((item) => item.label)
            .join('\u00a0|\u00a0');
        return {
            canToggle: measured.length > 0,
            labelA: formatItem?.label ?? 'TRANSCODED',
            labelB: measured ? `${measured}\u00a0|\u00a0${pathItem.label.toUpperCase()}` : '',
            tone: 'transcoded',
        };
    }

    // Lossy/unknown — show format + bitrate, no toggle
    const viewA =
        formatItem && bitrateItem && bitrateItem !== formatItem
            ? `${formatItem.label}\u00a0|\u00a0${bitrateItem.label}`
            : ((formatItem ?? bitrateItem)?.label ?? '');
    return {
        canToggle: false,
        labelA: viewA,
        labelB: '',
        tone: 'neutral',
    };
};
