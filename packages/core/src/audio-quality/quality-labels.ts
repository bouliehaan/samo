export type AudioDeliveryKind =
    | 'android-direct'
    | 'native-direct'
    | 'transcoded'
    | 'unknown'
    | 'web-direct';

export interface AudioQualityBadgeItem {
    label: string;
    tone: AudioQualityBadgeTone;
}

export type AudioQualityBadgeMode = 'detail' | 'playerbar';
export type AudioQualityBadgeTone = 'direct' | 'neutral' | 'transcoded' | 'unknown';

export interface BuildAudioQualityBadgeItemsOptions {
    bitDepth?: null | number;
    bitRate?: null | number;
    compact?: boolean;
    container?: null | string;
    deliveryKind: AudioDeliveryKind;
    inline?: boolean;
    mode?: AudioQualityBadgeMode;
    sampleRate?: null | number;
    transcodeBitrate?: null | number;
    transcodeFormat?: null | string;
}

const PREMIUM_QUALITY_CONTAINERS = new Set([
    'aif',
    'aiff',
    'alac',
    'ape',
    'dsd',
    'dsf',
    'flac',
    'wav',
]);

const LOSSY_CONTAINERS = new Set(['aac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wma']);
const HI_RES_LOSSLESS_BITRATE_FLOOR_KBPS = 1411;

const normalizeContainerKey = (container?: null | string) => {
    if (!container) return '';

    const [mime] = container.trim().toLowerCase().split(';');
    const withoutMimePrefix = mime.startsWith('audio/') ? mime.slice('audio/'.length) : mime;
    const withoutDot = withoutMimePrefix.startsWith('.')
        ? withoutMimePrefix.slice(1)
        : withoutMimePrefix;
    const withoutVendorPrefix = withoutDot.startsWith('x-') ? withoutDot.slice(2) : withoutDot;

    if (withoutVendorPrefix === 'mpeg') return 'mp3';
    if (withoutVendorPrefix === 'wave') return 'wav';

    return withoutVendorPrefix;
};

const normalizeBitRateKbps = (bitRate?: null | number) => {
    if (!bitRate) return null;

    return bitRate >= 100_000 ? bitRate / 1000 : bitRate;
};

export const formatContainer = (container?: null | string) => {
    if (!container) return null;

    return container.toUpperCase();
};

export const formatBitDepth = (bitDepth?: null | number, compact?: boolean) => {
    if (!bitDepth) return null;

    return compact ? `${bitDepth}` : `${bitDepth}-bit`;
};

export const formatSampleRate = (sampleRate?: null | number, compact?: boolean) => {
    if (!sampleRate) return null;

    const khz = sampleRate / 1000;
    const formatted = Number.isInteger(khz) ? khz.toFixed(0) : khz.toFixed(1);

    return compact ? formatted : `${formatted} kHz`;
};

export const formatBitRate = (bitRate?: null | number) => {
    if (!bitRate) return null;

    // Subsonic/Navidrome reports bitrate as kbps. If a source ever reports raw
    // bits-per-second, normalize only clearly large values.
    const kbps = bitRate >= 100_000 ? Math.round(bitRate / 1000) : Math.round(bitRate);

    return `${kbps} kbps`;
};

export const isPremiumQualityContainer = (container?: null | string) => {
    return PREMIUM_QUALITY_CONTAINERS.has(normalizeContainerKey(container));
};

export const isHiResAudioQuality = ({
    bitDepth,
    bitRate,
    container,
    deliveryKind,
    sampleRate,
}: {
    bitDepth?: null | number;
    bitRate?: null | number;
    container?: null | string;
    deliveryKind: AudioDeliveryKind;
    sampleRate?: null | number;
}) => {
    if (deliveryKind === 'transcoded') {
        return false;
    }

    if (!isPremiumQualityContainer(container)) {
        return false;
    }

    if ((bitDepth ?? 0) > 16 || (sampleRate ?? 0) > 48_000) {
        return true;
    }

    const bitRateKbps = normalizeBitRateKbps(bitRate);
    return bitDepth == null && sampleRate == null && (bitRateKbps ?? 0) > HI_RES_LOSSLESS_BITRATE_FLOOR_KBPS;
};

/**
 * Broader cousin of isHiResAudioQuality used by the quality-badge surface
 * only. Anything delivered direct (not transcoded) from a lossless container
 * at 16-bit or above earns a badge — CD-rate FLAC included, since the badge
 * art set ships a 16/44.1 variant and the user expects to see a marker on
 * any lossless track. isHiResAudioQuality keeps its stricter 24-bit-or-up
 * meaning for the audio-quality labels and filters that consume it
 * elsewhere.
 */
export const isLosslessAudioQuality = ({
    bitDepth,
    bitRate,
    container,
    deliveryKind,
    sampleRate,
}: {
    bitDepth?: null | number;
    bitRate?: null | number;
    container?: null | string;
    deliveryKind: AudioDeliveryKind;
    sampleRate?: null | number;
}) => {
    if (deliveryKind === 'transcoded') {
        return false;
    }

    if (!isPremiumQualityContainer(container)) {
        return false;
    }

    // Explicit bit depth wins. Reject anything below 16-bit (sub-CD is rare
    // and not what the "Lossless" badge represents). 16-bit and above is in.
    if (bitDepth != null) {
        return bitDepth >= 16;
    }

    // If the server didn't report bit depth, fall back to the bitrate floor —
    // a bitrate well above the lossy ceiling is a reliable proxy for lossless
    // even when bitDepth/sampleRate are missing.
    const bitRateKbps = normalizeBitRateKbps(bitRate);
    return (bitRateKbps ?? 0) > HI_RES_LOSSLESS_BITRATE_FLOOR_KBPS;
};

export const getQualityLabel = ({
    bitDepth,
    bitRate,
    container,
    isTranscoded,
    sampleRate,
}: {
    bitDepth?: null | number;
    bitRate?: null | number;
    container?: null | string;
    isTranscoded: boolean;
    sampleRate?: null | number;
}) => {
    const containerKey = normalizeContainerKey(container);

    if (isTranscoded || (containerKey && LOSSY_CONTAINERS.has(containerKey))) {
        return formatBitRate(bitRate);
    }

    if (bitDepth && sampleRate) {
        return `${formatBitDepth(bitDepth, true)}/${formatSampleRate(sampleRate, true)}`;
    }

    return null;
};

const getPathLabel = (deliveryKind: AudioDeliveryKind, compact: boolean) => {
    if (deliveryKind === 'transcoded') {
        return compact ? 'Transcoded' : 'Transcoded Compatibility';
    }

    if (deliveryKind === 'native-direct') return 'Native Direct';
    if (deliveryKind === 'android-direct') return 'Android Direct';
    if (deliveryKind === 'web-direct') return 'Web Direct';

    return 'Unknown Path';
};

export const buildAudioQualityBadgeItems = ({
    bitDepth: sourceBitDepth,
    bitRate: sourceBitRate,
    compact = false,
    container: sourceContainer,
    deliveryKind,
    inline = false,
    mode = 'detail',
    sampleRate: sourceSampleRate,
    transcodeBitrate,
    transcodeFormat,
}: BuildAudioQualityBadgeItemsOptions) => {
    const isTranscoded = deliveryKind === 'transcoded';
    const rawContainer = isTranscoded ? transcodeFormat : sourceContainer;
    const container = formatContainer(rawContainer);
    const isPremiumQualityDirect = !isTranscoded && isPremiumQualityContainer(rawContainer);
    const bitDepth = isPremiumQualityDirect ? formatBitDepth(sourceBitDepth, compact) : null;
    const sampleRate = isPremiumQualityDirect ? formatSampleRate(sourceSampleRate, compact) : null;
    const bitRate = isTranscoded ? formatBitRate(transcodeBitrate) : formatBitRate(sourceBitRate);
    const pathTone: AudioQualityBadgeTone = isTranscoded
        ? 'transcoded'
        : isPremiumQualityDirect
          ? 'direct'
          : 'neutral';
    const detailTone: AudioQualityBadgeTone = isPremiumQualityDirect ? 'direct' : 'neutral';
    const unknownFormat = isTranscoded ? 'Unknown transcode format' : 'Unknown format';

    if (mode === 'playerbar') {
        const qualityLabel = getQualityLabel({
            bitDepth: isTranscoded ? null : sourceBitDepth,
            bitRate: isTranscoded ? transcodeBitrate : sourceBitRate,
            container: rawContainer,
            isTranscoded,
            sampleRate: isTranscoded ? null : sourceSampleRate,
        });
        const qualityTone: AudioQualityBadgeTone =
            isTranscoded && qualityLabel
                ? 'transcoded'
                : !qualityLabel
                  ? 'unknown'
                  : isPremiumQualityDirect
                    ? 'direct'
                    : 'neutral';

        return [
            { label: container ?? 'Unknown format', tone: container ? detailTone : 'unknown' },
            { label: qualityLabel ?? 'Unknown quality', tone: qualityTone },
        ] satisfies AudioQualityBadgeItem[];
    }

    const items: AudioQualityBadgeItem[] = [
        { label: getPathLabel(deliveryKind, compact), tone: pathTone },
        { label: container ?? unknownFormat, tone: container ? detailTone : 'unknown' },
    ];

    if (isPremiumQualityDirect) {
        if (compact || inline) {
            items.push(
                bitDepth && sampleRate
                    ? { label: `${bitDepth}/${sampleRate}`, tone: 'direct' }
                    : { label: 'Unknown quality', tone: 'unknown' },
            );
        } else {
            items.push(
                bitDepth
                    ? { label: bitDepth, tone: 'direct' }
                    : { label: 'Unknown bit depth', tone: 'unknown' },
                sampleRate
                    ? { label: sampleRate, tone: 'direct' }
                    : { label: 'Unknown sample rate', tone: 'unknown' },
            );
        }
    }

    if (isTranscoded) {
        items.push(
            bitRate
                ? { label: bitRate, tone: 'transcoded' }
                : { label: 'Unknown bitrate', tone: 'unknown' },
        );
    } else if (bitRate) {
        items.push({ label: bitRate, tone: detailTone });
    }

    return items;
};
