/**
 * Lightweight relevance scoring for unified search.
 *
 * Returns a numeric score for a candidate against a normalized query. Higher
 * scores rank earlier. The scorer is intentionally simple — no fuzzy matching,
 * no index — so behavior stays predictable and fast for short result lists.
 */

const PUNCTUATION_RE = /[\p{P}\p{S}]+/gu;
const WHITESPACE_RE = /\s+/g;

const SCORE_EXACT = 1000;
const SCORE_PREFIX = 600;
const SCORE_WORD_BOUNDARY = 320;
const SCORE_SUBSTRING = 140;
const SCORE_TOKEN_ALL = 80;
const SCORE_TOKEN_SOME = 30;

const SECONDARY_FIELD_WEIGHT = 0.35;

export const normalize = (value: null | string | undefined): string => {
    if (!value) return '';
    return value.toLowerCase().replace(PUNCTUATION_RE, ' ').replace(WHITESPACE_RE, ' ').trim();
};

export const tokenize = (value: string): string[] =>
    value
        .split(' ')
        .map((token) => token.trim())
        .filter(Boolean);

const lengthPenalty = (haystackLength: number, needleLength: number): number => {
    if (haystackLength <= 0) return 0;
    const ratio = needleLength / haystackLength;
    // Up to a 60-point bonus for queries that closely match the full title.
    return Math.round(60 * Math.min(1, ratio));
};

/** Score a single string field against the normalized needle and its tokens. */
const scoreField = (haystackRaw: string, needle: string, needleTokens: string[]): number => {
    const haystack = normalize(haystackRaw);
    if (!haystack || !needle) return 0;

    if (haystack === needle) {
        return SCORE_EXACT + lengthPenalty(haystack.length, needle.length);
    }

    if (haystack.startsWith(needle)) {
        return SCORE_PREFIX + lengthPenalty(haystack.length, needle.length);
    }

    const wordBoundaryHit = haystack.includes(` ${needle}`);
    if (wordBoundaryHit) {
        return SCORE_WORD_BOUNDARY + lengthPenalty(haystack.length, needle.length);
    }

    if (haystack.includes(needle)) {
        return SCORE_SUBSTRING + lengthPenalty(haystack.length, needle.length);
    }

    if (needleTokens.length > 1) {
        const haystackTokens = new Set(tokenize(haystack));
        const matched = needleTokens.filter((token) => {
            for (const hayToken of haystackTokens) {
                if (hayToken === token) return true;
                if (hayToken.startsWith(token)) return true;
            }
            return false;
        }).length;
        if (matched === needleTokens.length) return SCORE_TOKEN_ALL;
        if (matched > 0) return SCORE_TOKEN_SOME * (matched / needleTokens.length);
    }

    return 0;
};

export interface CandidateField {
    /** Raw text. Will be normalized internally. */
    text: null | string | undefined;
    /** Multiplier applied to the field's score. Defaults to 1 for primary, 0.35 for secondary. */
    weight?: number;
}

/**
 * Score a candidate against a query. The query is normalized once by the
 * caller; pass the normalized needle and pre-tokenized needle for efficiency.
 */
export const scoreCandidate = (
    primary: string | undefined,
    secondaries: Array<null | string | undefined> = [],
    needle: string,
    needleTokens: string[],
): number => {
    if (!needle) return 0;

    const primaryScore = scoreField(primary ?? '', needle, needleTokens);
    let bestSecondary = 0;
    for (const secondary of secondaries) {
        if (!secondary) continue;
        const score = scoreField(secondary, needle, needleTokens);
        if (score > bestSecondary) bestSecondary = score;
    }

    return primaryScore + bestSecondary * SECONDARY_FIELD_WEIGHT;
};

export interface NeedleContext {
    needle: string;
    rawNeedle: string;
    tokens: string[];
}

export const buildNeedleContext = (raw: string): NeedleContext => {
    const needle = normalize(raw);
    return {
        needle,
        rawNeedle: raw,
        tokens: tokenize(needle),
    };
};
