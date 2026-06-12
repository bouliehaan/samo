/* eslint-disable @typescript-eslint/no-require-imports */
import { type MobileQualityProfile } from '@samo/core/mobile';
import { type ImageSourcePropType } from 'react-native';

/**
 * Quality badge asset map. Each PNG is a 1024x1024 square with the Samo
 * "ultra premium" hi-res mark stamped with a specific bit-depth /
 * sample-rate combination. Required statically so Metro bundles every
 * combination — pickQualityBadgeAsset() returns the asset for the exact
 * (bitDepth, sampleRate) pair, or null when there's no matching badge.
 *
 * Key format: `${bitDepth}/${sampleRateKhz}` where sampleRateKhz keeps its
 * decimal for non-integer rates (44.1, 88.2, 176.4, 352.8). Matches what
 * the file naming convention encodes — 44.1 kHz → `441khz` in the filename,
 * but `16/44.1` as the lookup key here so the math reads naturally.
 */
const QUALITY_BADGE_ASSETS: Record<string, ImageSourcePropType> = {
    '16/44.1': require('../../../../assets/icons/quality-badges/samo_hires_16bit_441khz_ultra_premium.png'),
    '16/48': require('../../../../assets/icons/quality-badges/samo_hires_16bit_48khz_ultra_premium.png'),
    '16/88.2': require('../../../../assets/icons/quality-badges/samo_hires_16bit_882khz_ultra_premium.png'),
    '16/96': require('../../../../assets/icons/quality-badges/samo_hires_16bit_96khz_ultra_premium.png'),
    '16/176.4': require('../../../../assets/icons/quality-badges/samo_hires_16bit_1764khz_ultra_premium.png'),
    '16/192': require('../../../../assets/icons/quality-badges/samo_hires_16bit_192khz_ultra_premium.png'),
    '16/352.8': require('../../../../assets/icons/quality-badges/samo_hires_16bit_3528khz_ultra_premium.png'),
    '16/384': require('../../../../assets/icons/quality-badges/samo_hires_16bit_384khz_ultra_premium.png'),
    '24/44.1': require('../../../../assets/icons/quality-badges/samo_hires_24bit_441khz_ultra_premium.png'),
    '24/48': require('../../../../assets/icons/quality-badges/samo_hires_24bit_48khz_ultra_premium.png'),
    '24/88.2': require('../../../../assets/icons/quality-badges/samo_hires_24bit_882khz_ultra_premium.png'),
    '24/96': require('../../../../assets/icons/quality-badges/samo_hires_24bit_96khz_ultra_premium.png'),
    '24/176.4': require('../../../../assets/icons/quality-badges/samo_hires_24bit_1764khz_ultra_premium.png'),
    '24/192': require('../../../../assets/icons/quality-badges/samo_hires_24bit_192khz_ultra_premium.png'),
    '24/352.8': require('../../../../assets/icons/quality-badges/samo_hires_24bit_3528khz_ultra_premium.png'),
    '24/384': require('../../../../assets/icons/quality-badges/samo_hires_24bit_384khz_ultra_premium.png'),
    '32/44.1': require('../../../../assets/icons/quality-badges/samo_hires_32bit_441khz_ultra_premium.png'),
    '32/48': require('../../../../assets/icons/quality-badges/samo_hires_32bit_48khz_ultra_premium.png'),
    '32/88.2': require('../../../../assets/icons/quality-badges/samo_hires_32bit_882khz_ultra_premium.png'),
    '32/96': require('../../../../assets/icons/quality-badges/samo_hires_32bit_96khz_ultra_premium.png'),
    '32/176.4': require('../../../../assets/icons/quality-badges/samo_hires_32bit_1764khz_ultra_premium.png'),
    '32/192': require('../../../../assets/icons/quality-badges/samo_hires_32bit_192khz_ultra_premium.png'),
    '32/352.8': require('../../../../assets/icons/quality-badges/samo_hires_32bit_3528khz_ultra_premium.png'),
    '32/384': require('../../../../assets/icons/quality-badges/samo_hires_32bit_384khz_ultra_premium.png'),
};

/**
 * Map the playback's bit depth and sample rate (Hz) to a badge asset.
 * Strictly an exact match — if the format isn't one we have art for, we
 * return null and the UI shows no badge. Skipping the badge is always
 * preferable to mislabeling a 24/48 track as 24/96.
 */
export const pickQualityBadgeAsset = (
    profile: MobileQualityProfile | undefined,
): ImageSourcePropType | null => {
    if (!profile) return null;
    const sampleRateKhz = profile.sampleRate / 1000;
    // Keep decimals when present, drop trailing zeros. parseFloat→toString
    // is the cheap way to do that without polluting integer rates with ".0".
    const sampleKey = parseFloat(sampleRateKhz.toFixed(1)).toString();
    const key = `${profile.bitDepth}/${sampleKey}`;
    return QUALITY_BADGE_ASSETS[key] ?? null;
};

/**
 * Display string for the inline "16-bit / 44.1 kHz Lossless" album-detail
 * line. Same parsing rule as the badge key — drop trailing zeros so a
 * 96 kHz album reads "96 kHz" not "96.0 kHz".
 */
export const formatQualityProfile = (
    profile: MobileQualityProfile | undefined,
): null | string => {
    if (!profile) return null;
    const khz = parseFloat((profile.sampleRate / 1000).toFixed(1));
    return `${profile.bitDepth}-bit / ${khz} kHz Lossless`;
};

/**
 * Tighter variant of {@link formatQualityProfile} for the inline metadata
 * marker on tiles and list rows — drops the trailing "Lossless" word so it
 * reads "24-bit · 96 kHz" and survives next to a truncating subtitle. Qobuz
 * shows the same bit-depth/sample-rate spec in its card and row metadata.
 */
export const formatQualityProfileCompact = (
    profile: MobileQualityProfile | undefined,
): null | string => {
    if (!profile) return null;
    const khz = parseFloat((profile.sampleRate / 1000).toFixed(1));
    return `${profile.bitDepth}-bit · ${khz} kHz`;
};
