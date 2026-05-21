export type AudioDeliveryKind = 'android-direct' | 'native-direct' | 'transcoded' | 'unknown' | 'web-direct';
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
export declare const formatContainer: (container?: null | string) => string | null;
export declare const formatBitDepth: (bitDepth?: null | number, compact?: boolean) => string | null;
export declare const formatSampleRate: (sampleRate?: null | number, compact?: boolean) => string | null;
export declare const formatBitRate: (bitRate?: null | number) => string | null;
export declare const isPremiumQualityContainer: (container?: null | string) => boolean;
export declare const isHiResAudioQuality: ({ bitDepth, bitRate, container, deliveryKind, sampleRate, }: {
    bitDepth?: null | number;
    bitRate?: null | number;
    container?: null | string;
    deliveryKind: AudioDeliveryKind;
    sampleRate?: null | number;
}) => boolean;
/**
 * Broader cousin of isHiResAudioQuality used by the quality-badge surface
 * only. Anything delivered direct (not transcoded) from a lossless container
 * at 16-bit or above earns a badge — CD-rate FLAC included, since the badge
 * art set ships a 16/44.1 variant and the user expects to see a marker on
 * any lossless track. isHiResAudioQuality keeps its stricter 24-bit-or-up
 * meaning for the audio-quality labels and filters that consume it
 * elsewhere.
 */
export declare const isLosslessAudioQuality: ({ bitDepth, bitRate, container, deliveryKind, sampleRate: _sampleRate, }: {
    bitDepth?: null | number;
    bitRate?: null | number;
    container?: null | string;
    deliveryKind: AudioDeliveryKind;
    sampleRate?: null | number;
}) => boolean;
export declare const getQualityLabel: ({ bitDepth, bitRate, container, isTranscoded, sampleRate, }: {
    bitDepth?: null | number;
    bitRate?: null | number;
    container?: null | string;
    isTranscoded: boolean;
    sampleRate?: null | number;
}) => string | null;
export declare const buildAudioQualityBadgeItems: ({ bitDepth: sourceBitDepth, bitRate: sourceBitRate, compact, container: sourceContainer, deliveryKind, inline, mode, sampleRate: sourceSampleRate, transcodeBitrate, transcodeFormat, }: BuildAudioQualityBadgeItemsOptions) => AudioQualityBadgeItem[];
