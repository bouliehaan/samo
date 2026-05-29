import { useEffect, useMemo, useRef, useState } from 'react';

import { ImageRequest } from '/@/shared/types/domain-types';

type FetchPriority = 'auto' | 'high' | 'low';

interface NativeImageState {
    displaySrc?: string;
    status: 'error' | 'idle' | 'loaded' | 'loading';
}

interface UseNativeImageArgs {
    enabled: boolean;
    fetchPriority?: FetchPriority;
    onFetchError?: () => void;
    request?: ImageRequest | null;
}

const hasCustomFetchOptions = (request: ImageRequest): boolean => {
    if (request.headers && Object.keys(request.headers).length > 0) {
        return true;
    }

    return Boolean(request.credentials && request.credentials !== 'omit');
};

const canLoadImageDirectly = (request: ImageRequest): boolean => !hasCustomFetchOptions(request);

type WindowWithApi = Window & {
    api?: {
        utils?: {
            fetchMedia?: (input: {
                headers?: Record<string, string>;
                url: string;
            }) => Promise<{ contentType: string; data: string }>;
        };
    };
};

const getFetchMediaFromMain = () => (window as WindowWithApi).api?.utils?.fetchMedia;

const canFetchMediaViaMain = (): boolean =>
    typeof window !== 'undefined' &&
    Boolean(getFetchMediaFromMain());

const base64ToBlob = (data: string, contentType: string): Blob => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: contentType });
};

const fetchImageViaMain = async (
    request: ImageRequest,
    signal: AbortSignal,
): Promise<Blob> => {
    const fetchMedia = getFetchMediaFromMain();
    if (!fetchMedia) {
        throw new Error('Main-process media fetch is unavailable.');
    }
    const result = await fetchMedia({
        headers: request.headers,
        url: request.url,
    });

    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    return base64ToBlob(result.data, result.contentType);
};

export function useNativeImage({
    enabled,
    fetchPriority,
    onFetchError,
    request,
}: UseNativeImageArgs) {
    const abortControllerRef = useRef<AbortController | null>(null);
    const loadedRequestSignatureRef = useRef<null | string>(null);
    const objectUrlRef = useRef<null | string>(null);
    const directUrlRef = useRef<null | string>(null);
    const onFetchErrorRef = useRef(onFetchError);
    const [state, setState] = useState<NativeImageState>({ status: 'idle' });

    const requestSignature = useMemo(() => {
        if (!request) {
            return null;
        }

        return JSON.stringify({
            cacheKey: request.cacheKey,
            credentials: request.credentials,
            headers: request.headers,
            url: request.url,
        });
    }, [request]);

    onFetchErrorRef.current = onFetchError;

    useEffect(() => {
        const abortCurrentRequest = () => {
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
        };

        const revokeObjectUrl = () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }

            directUrlRef.current = null;
            loadedRequestSignatureRef.current = null;
        };

        if (!request || !requestSignature) {
            abortCurrentRequest();
            revokeObjectUrl();
            setState({ status: 'idle' });
            return;
        }

        if (!enabled) {
            abortCurrentRequest();
            const cachedSrc = objectUrlRef.current ?? directUrlRef.current;
            setState(
                cachedSrc
                    ? { displaySrc: cachedSrc, status: 'loaded' }
                    : { status: 'idle' },
            );
            return;
        }

        const cachedSrc = objectUrlRef.current ?? directUrlRef.current;
        if (loadedRequestSignatureRef.current === requestSignature && cachedSrc) {
            setState({ displaySrc: cachedSrc, status: 'loaded' });
            return;
        }

        abortCurrentRequest();
        revokeObjectUrl();
        setState({ status: 'loading' });

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        void (async () => {
            try {
                if (canLoadImageDirectly(request)) {
                    if (abortController.signal.aborted) {
                        return;
                    }

                    directUrlRef.current = request.url;
                    loadedRequestSignatureRef.current = requestSignature;
                    setState({ displaySrc: request.url, status: 'loaded' });
                    return;
                }

                let blob: Blob;

                if (canFetchMediaViaMain()) {
                    blob = await fetchImageViaMain(request, abortController.signal);
                } else {
                    const init = {
                        credentials: request.credentials,
                        headers: request.headers,
                        signal: abortController.signal,
                    } as RequestInit & { priority?: FetchPriority };

                    if (fetchPriority) {
                        init.priority = fetchPriority;
                    }

                    const response = await fetch(request.url, init);

                    if (!response.ok) {
                        throw new Error(`Failed to load image: ${response.status}`);
                    }

                    blob = await response.blob();
                }

                if (abortController.signal.aborted) {
                    return;
                }

                const objectUrl = URL.createObjectURL(blob);
                objectUrlRef.current = objectUrl;
                loadedRequestSignatureRef.current = requestSignature;
                setState({ displaySrc: objectUrl, status: 'loaded' });
            } catch {
                if (abortController.signal.aborted) {
                    return;
                }

                revokeObjectUrl();
                setState({ status: 'error' });
                onFetchErrorRef.current?.();
            } finally {
                if (abortControllerRef.current === abortController) {
                    abortControllerRef.current = null;
                }
            }
        })();

        return () => {
            abortController.abort();

            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
        };
    }, [enabled, fetchPriority, request, requestSignature]);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();

            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    return {
        displaySrc: state.displaySrc,
        isError: state.status === 'error',
        isLoaded: state.status === 'loaded',
        isLoading: state.status === 'loading',
    };
}
