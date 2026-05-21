import { InternetProviderLyricSearchResponse, LyricSearchQuery } from '/@/shared/types/domain-types';
export declare const orderSearchResults: (args: {
    params: LyricSearchQuery;
    results: InternetProviderLyricSearchResponse[];
}) => {
    score: number | undefined;
    artist: string;
    duration?: number;
    id: string;
    isSync: boolean | null;
    lyrics?: string;
    name: string;
    source: import("/@/shared/types/domain-types").LyricSource;
}[];
