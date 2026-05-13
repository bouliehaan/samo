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
    return PREMIUM_QUALITY_CONTAINERS.has(container?.toLowerCase() ?? '');
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
    const containerKey = container?.toLowerCase();

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
