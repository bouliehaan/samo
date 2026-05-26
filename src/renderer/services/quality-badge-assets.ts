import {
    formatQualityProfileLabel,
    getQualityBadgeKey,
    type QualityBadgeProfile,
} from '@samo/core/audio-quality';

import badge16_48 from '../../../assets/icons/quality-badges/samo_hires_16bit_48khz_ultra_premium.png';
import badge16_96 from '../../../assets/icons/quality-badges/samo_hires_16bit_96khz_ultra_premium.png';
import badge16_192 from '../../../assets/icons/quality-badges/samo_hires_16bit_192khz_ultra_premium.png';
import badge16_384 from '../../../assets/icons/quality-badges/samo_hires_16bit_384khz_ultra_premium.png';
import badge16_441 from '../../../assets/icons/quality-badges/samo_hires_16bit_441khz_ultra_premium.png';
import badge16_882 from '../../../assets/icons/quality-badges/samo_hires_16bit_882khz_ultra_premium.png';
import badge16_1764 from '../../../assets/icons/quality-badges/samo_hires_16bit_1764khz_ultra_premium.png';
import badge16_3528 from '../../../assets/icons/quality-badges/samo_hires_16bit_3528khz_ultra_premium.png';
import badge24_48 from '../../../assets/icons/quality-badges/samo_hires_24bit_48khz_ultra_premium.png';
import badge24_96 from '../../../assets/icons/quality-badges/samo_hires_24bit_96khz_ultra_premium.png';
import badge24_192 from '../../../assets/icons/quality-badges/samo_hires_24bit_192khz_ultra_premium.png';
import badge24_384 from '../../../assets/icons/quality-badges/samo_hires_24bit_384khz_ultra_premium.png';
import badge24_441 from '../../../assets/icons/quality-badges/samo_hires_24bit_441khz_ultra_premium.png';
import badge24_882 from '../../../assets/icons/quality-badges/samo_hires_24bit_882khz_ultra_premium.png';
import badge24_1764 from '../../../assets/icons/quality-badges/samo_hires_24bit_1764khz_ultra_premium.png';
import badge24_3528 from '../../../assets/icons/quality-badges/samo_hires_24bit_3528khz_ultra_premium.png';
import badge32_48 from '../../../assets/icons/quality-badges/samo_hires_32bit_48khz_ultra_premium.png';
import badge32_96 from '../../../assets/icons/quality-badges/samo_hires_32bit_96khz_ultra_premium.png';
import badge32_192 from '../../../assets/icons/quality-badges/samo_hires_32bit_192khz_ultra_premium.png';
import badge32_384 from '../../../assets/icons/quality-badges/samo_hires_32bit_384khz_ultra_premium.png';
import badge32_441 from '../../../assets/icons/quality-badges/samo_hires_32bit_441khz_ultra_premium.png';
import badge32_882 from '../../../assets/icons/quality-badges/samo_hires_32bit_882khz_ultra_premium.png';
import badge32_1764 from '../../../assets/icons/quality-badges/samo_hires_32bit_1764khz_ultra_premium.png';
import badge32_3528 from '../../../assets/icons/quality-badges/samo_hires_32bit_3528khz_ultra_premium.png';

const QUALITY_BADGE_ASSETS: Record<string, string> = {
    '16/44.1': badge16_441,
    '16/48': badge16_48,
    '16/88.2': badge16_882,
    '16/96': badge16_96,
    '16/176.4': badge16_1764,
    '16/192': badge16_192,
    '16/352.8': badge16_3528,
    '16/384': badge16_384,
    '24/44.1': badge24_441,
    '24/48': badge24_48,
    '24/88.2': badge24_882,
    '24/96': badge24_96,
    '24/176.4': badge24_1764,
    '24/192': badge24_192,
    '24/352.8': badge24_3528,
    '24/384': badge24_384,
    '32/44.1': badge32_441,
    '32/48': badge32_48,
    '32/88.2': badge32_882,
    '32/96': badge32_96,
    '32/176.4': badge32_1764,
    '32/192': badge32_192,
    '32/352.8': badge32_3528,
    '32/384': badge32_384,
};

export const pickQualityBadgeAsset = (profile: QualityBadgeProfile | undefined): null | string => {
    const key = getQualityBadgeKey(profile);
    if (!key) return null;
    return QUALITY_BADGE_ASSETS[key] ?? null;
};

export { formatQualityProfileLabel as formatQualityProfile };
