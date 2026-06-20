import {
    adaptNativeFetch,
    authenticateServerConnection,
    getServerAuthenticationErrorMessage,
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
// a user is watching this spinner. One automatic retry on a FRESH connection
// absorbs the classic first-request stall (cold connection pool / route warm-up
// / transient Wi-Fi wobble) that surfaces as "connect hangs once, then works
// instantly on the second tap". 8s × up to 3 attempts stays under the 30s cap
// the core layer imposes.
const AUTH_REQUEST_TIMEOUT_MS = 8_000;
const AUTH_RETRY_DELAY_MS = 750;
const AUTH_MAX_RETRIES = 2;

const isTransportError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
        return false;
    }
    // RN's fetch surfaces connection failures as TypeError("Network request
    // failed"). HTTP-status failures happen a layer above (requestJson) and
    // never reach this check — a 401 must NOT be retried.
    return error.name === 'TypeError' || error.message.startsWith('Request timed out');
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Own the per-attempt deadline directly rather than via core's withRequestTimeout.
// The core re-wraps this fetcher with getFetch() (the 30s DEFAULT timeout), and
// withRequestTimeout SKIPS its own deadline when a signal is already present — so
// going through it here let the 30s outer signal neutralize our 8s budget AND
// the retry (the abort wasn't recognized as retryable). The result was the
// reported "first attempt never authorizes, hangs ~30s, second tap works". A
// dedicated AbortController per attempt always fires, composes with any caller
// signal (the 30s cap), and each retry issues a brand-new fetch so the stalled
// socket is abandoned for a fresh connection.
const buildAuthFetcher = (onRetry?: () => void): SamoFetch => {
    const nativeFetch = adaptNativeFetch(fetch);
    return async (url, init) => {
        let attempt = 0;
        while (true) {
            const controller = new AbortController();
            const callerSignal = init?.signal;
            const forwardAbort = () => controller.abort();
            if (callerSignal) {
                if (callerSignal.aborted) {
                    controller.abort();
                } else {
                    callerSignal.addEventListener('abort', forwardAbort);
                }
            }
            const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
            try {
                return await nativeFetch(url, { ...init, signal: controller.signal });
            } catch (error) {
                // Our own deadline fired (not the caller's 30s cap).
                const timedOut = controller.signal.aborted && callerSignal?.aborted !== true;
                const retryable = timedOut || isTransportError(error);
                if (!retryable || attempt >= AUTH_MAX_RETRIES) {
                    throw timedOut
                        ? new Error(`Request timed out after ${AUTH_REQUEST_TIMEOUT_MS}ms`)
                        : error;
                }
                attempt++;
                onRetry?.();
                // Exponential backoff: 750ms, 1500ms
                await delay(AUTH_RETRY_DELAY_MS * attempt);
            } finally {
                clearTimeout(timeoutId);
                callerSignal?.removeEventListener('abort', forwardAbort);
            }
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
