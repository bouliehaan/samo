/**
 * Lightweight relevance scoring for unified search.
 *
 * Returns a numeric score for a candidate against a normalized query. Higher
 * scores rank earlier. The scorer is intentionally simple — no fuzzy matching,
 * no index — so behavior stays predictable and fast for short result lists.
 */
export declare const normalize: (value: null | string | undefined) => string;
export declare const tokenize: (value: string) => string[];
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
export declare const scoreCandidate: (primary: string | undefined, secondaries: Array<null | string | undefined> | undefined, needle: string, needleTokens: string[]) => number;
export interface NeedleContext {
    needle: string;
    rawNeedle: string;
    tokens: string[];
}
export declare const buildNeedleContext: (raw: string) => NeedleContext;
