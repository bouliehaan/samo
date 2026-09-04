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
    /**
     * Sample rate of the stream that actually ARRIVED, when it differs from the
     * source file's. Only set by callers that can observe the live decoder; a
     * caller describing a catalog row leaves it undefined and the transcoded
     * badge keeps the shape it has always had.
     */
    transcodeSampleRate?: null | number;
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

    // Servers report bitrate as kbps. If a source ever reports raw
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
    sampleRate: _sampleRate,
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
    if (deliveryKind === 'android-direct') return 'DIRECT';
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
    transcodeSampleRate,
}: BuildAudioQualityBadgeItemsOptions) => {
    const isTranscoded = deliveryKind === 'transcoded';
    const rawContainer = isTranscoded ? transcodeFormat : sourceContainer;
    const sourceContainerLabel = formatContainer(sourceContainer);
    const deliveredContainerLabel = formatContainer(rawContainer);
    // `FLAC -> OPUS` rather than a bare `OPUS`: on a transcoded path the two
    // facts a listener wants are what they own and what actually reached them.
    // Naming only the delivered codec reads like the library itself is lossy.
    // Falls back to the single label whenever the source container is unknown
    // or already matches, so a caller that knows nothing about the source (the
    // desktop transcode settings path) is unaffected.
    const container =
        isTranscoded &&
        sourceContainerLabel &&
        deliveredContainerLabel &&
        sourceContainerLabel !== deliveredContainerLabel
            ? `${sourceContainerLabel} \u2192 ${deliveredContainerLabel}`
            : deliveredContainerLabel;
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
        // The delivered stream's own sample rate, when the caller could observe
        // it. This is the second half of the collapsed pill's flip view, and it
        // is the only number on a transcoded path that is measured rather than
        // claimed.
        // Never compact: this item stands alone rather than being joined to a
        // bit depth as `16/44.1`, and a bare "48" says nothing.
        const deliveredSampleRate = formatSampleRate(transcodeSampleRate);
        if (deliveredSampleRate) {
            items.push({ label: deliveredSampleRate, tone: 'transcoded' });
        }
        if (bitRate) {
            items.push({ label: bitRate, tone: 'transcoded' });
        } else if (!deliveredSampleRate) {
            // Nothing measured and nothing declared — say so rather than
            // silently dropping the slot.
            items.push({ label: 'Unknown bitrate', tone: 'unknown' });
        }
    } else if (bitRate) {
        items.push({ label: bitRate, tone: detailTone });
    }

    return items;
};

/**
 * What a container extension tells you about the codec inside it.
 *
 * Deliberately partial. `m4a`, `m4b`, `mp4`, `ogg`, `oga`, `mka` and `webm` are
 * absent because they are envelopes, not codecs: an `.m4a` holds AAC or ALAC,
 * an `.ogg` holds Vorbis or Opus or FLAC. Leaving them unmapped makes
 * `resolveDeliveredAudioQuality` decline to guess, which is the whole point —
 * an ALAC file in an M4A container decoding as ALAC must never be mistaken for
 * a transcode just because the extension and the codec spell different words.
 */
const CONTAINER_CODEC_FAMILY: Record<string, string> = {
    aac: 'aac',
    aif: 'pcm',
    aiff: 'pcm',
    alac: 'alac',
    ape: 'ape',
    dff: 'dsd',
    dsf: 'dsd',
    flac: 'flac',
    mp3: 'mp3',
    opus: 'opus',
    shn: 'shorten',
    wav: 'pcm',
    wma: 'wma',
    wv: 'wavpack',
};

/** Decoder mime (already normalized) to the same family space. */
const DELIVERED_CODEC_FAMILY: Record<string, string> = {
    'mp4a-latm': 'aac',
    aac: 'aac',
    alac: 'alac',
    flac: 'flac',
    mp3: 'mp3',
    opus: 'opus',
    raw: 'pcm',
    vorbis: 'vorbis',
    wav: 'pcm',
};

const LOSSY_CODEC_FAMILIES = new Set(['aac', 'mp3', 'opus', 'vorbis', 'wma']);

/** The format a player is actually decoding, as observed at playback time. */
export interface DeliveredAudioFormat {
    bitRate?: null | number;
    channelCount?: null | number;
    /** Decoder input mime, e.g. `audio/opus`. Null until the stream opens. */
    codec?: null | string;
    sampleRate?: null | number;
}

export interface DeliveredAudioQualityInput {
    bitDepth?: null | number;
    bitRate?: null | number;
    container?: null | string;
    deliveryKind: AudioDeliveryKind;
    sampleRate?: null | number;
}

export type DeliveredAudioQuality = DeliveredAudioQualityInput & {
    transcodeBitrate?: null | number;
    transcodeFormat?: null | string;
    transcodeSampleRate?: null | number;
};

/**
 * Reconcile what the catalog CLAIMS a track is against what the player is
 * actually decoding, and describe the delivery that really happened.
 *
 * The catalog row describes a file on the server's disk. That is the right
 * answer for a track listing and the wrong answer for a player: anything
 * between the disk and the speaker — an edge that re-encodes lossless audio to
 * survive a slow uplink, most obviously — makes the two diverge, and until
 * something compares them the player reports the disk and calls it direct.
 *
 * Returns the source untouched when nothing has been observed yet (`delivered`
 * absent, or its codec still unknown during pre-roll), so a caller can pass
 * this through unconditionally and get the catalog's answer as the placeholder.
 *
 * A transcode is declared on either of two independent signals:
 *   - the codec families disagree, when BOTH are unambiguously known; or
 *   - a lossless source arrived in a lossy codec, which is the shape every
 *     bandwidth-driven re-encode takes and is decidable even when the source
 *     container does not name its codec.
 */
export const resolveDeliveredAudioQuality = (
    source: DeliveredAudioQualityInput,
    delivered?: DeliveredAudioFormat | null,
): DeliveredAudioQuality => {
    const deliveredKey = normalizeContainerKey(delivered?.codec);
    if (!deliveredKey) {
        return source;
    }

    const deliveredFamily = DELIVERED_CODEC_FAMILY[deliveredKey] ?? deliveredKey;
    const sourceFamily = CONTAINER_CODEC_FAMILY[normalizeContainerKey(source.container)];

    const familiesDisagree = sourceFamily !== undefined && sourceFamily !== deliveredFamily;
    const losslessBecameLossy =
        isPremiumQualityContainer(source.container) && LOSSY_CODEC_FAMILIES.has(deliveredFamily);

    if (!familiesDisagree && !losslessBecameLossy) {
        // The file arrived as promised. Take the decoder's sample rate only to
        // fill a gap the catalog left — a downloaded file whose row never
        // carried one, say. A populated catalog value is not overwritten:
        // this path is direct by definition, so the two agree.
        return {
            ...source,
            sampleRate: source.sampleRate ?? delivered?.sampleRate ?? null,
        };
    }

    return {
        ...source,
        deliveryKind: 'transcoded',
        // Every number below is measured off the live decoder. `bitRate` is
        // frequently absent — Ogg/Opus does not declare one — and stays null
        // rather than inheriting the source file's, which is exactly the lie
        // this function exists to stop.
        transcodeBitrate: delivered?.bitRate ?? null,
        transcodeFormat: deliveredFamily,
        transcodeSampleRate: delivered?.sampleRate ?? null,
    };
};
