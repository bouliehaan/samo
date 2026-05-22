export interface QualityBadgeProfile {
    bitDepth: number;
    sampleRate: number;
}

export declare const getQualityBadgeKey: (profile: QualityBadgeProfile | undefined) => null | string;

export declare const formatQualityProfileLabel: (
    profile: QualityBadgeProfile | undefined,
) => null | string;
