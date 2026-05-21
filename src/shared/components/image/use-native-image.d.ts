import { ImageRequest } from '/@/shared/types/domain-types';
type FetchPriority = 'auto' | 'high' | 'low';
interface UseNativeImageArgs {
    enabled: boolean;
    fetchPriority?: FetchPriority;
    onFetchError?: () => void;
    request?: ImageRequest | null;
}
export declare function useNativeImage({ enabled, fetchPriority, onFetchError, request, }: UseNativeImageArgs): {
    displaySrc: string | undefined;
    isError: boolean;
    isLoaded: boolean;
    isLoading: boolean;
};
export {};
