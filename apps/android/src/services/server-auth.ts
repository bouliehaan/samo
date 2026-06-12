import {
    adaptNativeFetch,
    authenticateServerConnection,
    getServerAuthenticationErrorMessage,
    withRequestTimeout,
    type SamoFetch,
    type ServerAuthenticationInput,
    type ServerAuthenticationResult,
} from '@samo/core/server';

export type AndroidAuthState =
    | { message: string; status: 'error' }
    | { message: string; status: 'loading' }
    | { result: ServerAuthenticationResult; status: 'connected' }
    | { status: 'idle' };

export type ServerAuthInput = ServerAuthenticationInput;

// Interactive auth gets a tight per-request budget instead of the 30s default:
// a user is watching this spinner. One automatic retry absorbs the classic
// first-request stall (cold connection pool / route warm-up / transient Wi-Fi
// wobble) that used to surface as "connect times out once, then works
// instantly on the second tap".
const AUTH_REQUEST_TIMEOUT_MS = 10_000;
const AUTH_RETRY_DELAY_MS = 750;

const isTransportError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
        return false;
    }
    // withRequestTimeout's abort surfaces as "Request timed out after Xms";
    // RN's fetch surfaces connection failures as TypeError("Network request
    // failed"). HTTP-status failures happen a layer above (requestJson) and
    // never reach this check — a 401 must NOT be retried.
    return (
        error.name === 'TypeError' ||
        error.message.startsWith('Request timed out')
    );
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const buildAuthFetcher = (onRetry?: () => void): SamoFetch => {
    const fetchWithTimeout = withRequestTimeout(
        adaptNativeFetch(fetch),
        AUTH_REQUEST_TIMEOUT_MS,
    );
    return async (url, init) => {
        try {
            return await fetchWithTimeout(url, init);
        } catch (error) {
            if (!isTransportError(error)) {
                throw error;
            }
            onRetry?.();
            await delay(AUTH_RETRY_DELAY_MS);
            return fetchWithTimeout(url, init);
        }
    };
};

export const authenticateServer = async (
    input: ServerAuthInput,
    onStatus?: (message: string) => void,
): Promise<AndroidAuthState> => {
    try {
        const result = await authenticateServerConnection({
            ...input,
            fetch: buildAuthFetcher(() =>
                onStatus?.('Server slow to respond — retrying…'),
            ),
        });
        return { result, status: 'connected' };
    } catch (error) {
        return { message: getServerAuthenticationErrorMessage(error), status: 'error' };
    }
};
