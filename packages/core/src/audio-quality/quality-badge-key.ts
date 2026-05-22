export interface QualityBadgeProfile {
    bitDepth: number;
    sampleRate: number;
}

/**
 * Map bit depth and sample rate (Hz) to a badge lookup key.
 * Strictly an exact match — if the format isn't one we have art for, return
 * null and the UI shows no badge.
 */
export const getQualityBadgeKey = (profile: QualityBadgeProfile | undefined): null | string => {
    if (!profile) return null;
    const sampleRateKhz = profile.sampleRate / 1000;
    const sampleKey = parseFloat(sampleRateKhz.toFixed(1)).toString();
    return `${profile.bitDepth}/${sampleKey}`;
};

/**
 * Display string for the inline "16-bit / 44.1 kHz Lossless" album-detail line.
 */
export const formatQualityProfileLabel = (
    profile: QualityBadgeProfile | undefined,
): null | string => {
    if (!profile) return null;
    const khz = parseFloat((profile.sampleRate / 1000).toFixed(1));
    return `${profile.bitDepth}-bit / ${khz} kHz Lossless`;
};
