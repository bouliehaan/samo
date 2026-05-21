import { titleCase } from '/@/renderer/utils/title-case';
// Release types derived from https://musicbrainz.org/doc/Release_Group/Type
const PRIMARY_MAPPING = {
    album: 'album',
    broadcast: 'broadcast',
    ep: 'ep',
    other: 'other',
    single: 'single',
};
const SECONDARY_MAPPING = {
    audiobook: 'audiobook',
    'audio drama': 'audioDrama',
    compilation: 'compilation',
    demo: 'demo',
    'dj-mix': 'djMix',
    'field recording': 'fieldRecording',
    interview: 'interview',
    live: 'live',
    'mixtape/street': 'mixtape',
    remix: 'remix',
    soundtrack: 'soundtrack',
    spokenword: 'spokenWord',
};
export const normalizeReleaseTypes = (types, t) => {
    const primary = [];
    const secondary = [];
    const unknown = [];
    for (const type of types) {
        const lower = type.toLocaleLowerCase();
        if (lower in PRIMARY_MAPPING) {
            primary.push(t(`releaseType.primary.${PRIMARY_MAPPING[lower]}`, { postProcess: 'sentenceCase' }));
        }
        else if (lower in SECONDARY_MAPPING) {
            secondary.push(t(`releaseType.secondary.${SECONDARY_MAPPING[lower]}`, {
                postProcess: 'sentenceCase',
            }));
        }
        else {
            unknown.push(titleCase(type));
        }
    }
    primary.sort();
    secondary.sort();
    unknown.sort();
    return primary.concat(secondary, unknown);
};
export const normalizeToPrimaryReleaseTypes = (types, t) => {
    const primary = [];
    for (const type of types) {
        const lower = type.toLocaleLowerCase();
        if (lower in PRIMARY_MAPPING) {
            primary.push(t(`releaseType.primary.${PRIMARY_MAPPING[lower]}`, { postProcess: 'sentenceCase' }));
        }
    }
    // If no primary types found, use "other" category
    if (primary.length === 0) {
        primary.push(t(`releaseType.primary.${PRIMARY_MAPPING.other}`, { postProcess: 'sentenceCase' }));
    }
    return primary;
};
export const normalizeToSecondaryReleaseTypes = (types, t) => {
    const secondary = [];
    for (const type of types) {
        const lower = type.toLocaleLowerCase();
        if (lower in SECONDARY_MAPPING) {
            secondary.push(t(`releaseType.secondary.${SECONDARY_MAPPING[lower]}`, {
                postProcess: 'sentenceCase',
            }));
        }
    }
    secondary.sort();
    return secondary;
};
