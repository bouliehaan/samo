import { net } from 'electron';

/**
 * The renderer's link to samo's live catalog-change stream.
 *
 * This lives in the main process for the same reason every other samo call
 * does: the renderer cannot reach the server directly (CORS/webSecurity), so
 * it proxies through IPC. The difference is that this response never ends — it
 * is Server-Sent Events — and the existing `samo-request` bridge buffers a
 * whole body before replying, which for this endpoint means replying never.
 * So this reads the body as a stream and pushes each event across as it
 * arrives.
 *
 * One subscription per process. The renderer has one current server, and a
 * second stream would only duplicate every notification.
 */

type SendToRenderer = (channel: string, payload: unknown) => void;

export const SAMO_CATALOG_EVENT_CHANNEL = 'samo-catalog-event';

/** How long to wait before redialling a stream that ended or failed. */
const RECONNECT_DELAY_MS = 5_000;

interface Subscription {
    controller: AbortController;
    /** Set on unsubscribe so an in-flight retry does not resurrect the stream. */
    stopped: boolean;
    timer: NodeJS.Timeout | null;
    url: string;
}

let active: null | Subscription = null;

/**
 * Parse one SSE frame into its event name and data line.
 *
 * Deliberately minimal: the server writes exactly `event: <type>\ndata:
 * <json>\n\n` and documents that the JSON is a single line (json.Marshal never
 * emits a raw newline), so there is no multi-line folding to handle. Comment
 * frames — the `: connected` settle and the `: ping` heartbeats — have no
 * `data:` line and fall out as null.
 */
const parseFrame = (frame: string): null | { data: string; type: string } => {
    let type = 'message';
    const dataLines: string[] = [];
    for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) {
            type = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
        }
    }
    if (dataLines.length === 0) {
        return null;
    }
    return { data: dataLines.join('\n'), type };
};

const readStream = async (
    subscription: Subscription,
    credential: string,
    send: SendToRenderer,
): Promise<void> => {
    const response = await net.fetch(`${subscription.url}/api/v1/catalog/events`, {
        headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${credential}`,
        },
        signal: subscription.controller.signal,
    });

    if (!response.ok || !response.body) {
        throw new Error(`catalog event stream: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            return;
        }
        buffer += decoder.decode(value, { stream: true });

        // Frames are separated by a blank line. Anything after the last
        // separator is a partial frame and stays in the buffer — a chunk
        // boundary can land anywhere, including mid-JSON.
        let separator = buffer.indexOf('\n\n');
        while (separator !== -1) {
            const frame = buffer.slice(0, separator);
            buffer = buffer.slice(separator + 2);
            const parsed = parseFrame(frame);
            if (parsed) {
                try {
                    send(SAMO_CATALOG_EVENT_CHANNEL, {
                        data: JSON.parse(parsed.data),
                        type: parsed.type,
                    });
                } catch {
                    // A frame we cannot parse is one notification missed, not
                    // a reason to drop the stream. The renderer reconciles on
                    // focus regardless.
                }
            }
            separator = buffer.indexOf('\n\n');
        }
    }
};

/**
 * Keep a stream open, redialling when it ends.
 *
 * A stream ends for ordinary reasons — the laptop slept, a tunnel reaped an
 * idle connection, the server restarted — and none of them should be the end
 * of live updates. Failures are silent by design: this is a freshness
 * optimisation over clients that already refetch on mount and on focus, so a
 * server too old to have the endpoint, or simply unreachable, must degrade to
 * exactly the previous behaviour rather than surface an error the user can do
 * nothing about.
 */
const runForever = (subscription: Subscription, credential: string, send: SendToRenderer): void => {
    void readStream(subscription, credential, send)
        .catch(() => undefined)
        .finally(() => {
            if (subscription.stopped || active !== subscription) {
                return;
            }
            subscription.timer = setTimeout(() => {
                if (subscription.stopped || active !== subscription) {
                    return;
                }
                runForever(subscription, credential, send);
            }, RECONNECT_DELAY_MS);
        });
};

export const subscribeSamoCatalogEvents = (
    payload: { credential: string; url: string },
    send: SendToRenderer,
): void => {
    const url = payload.url?.replace(/\/+$/, '');
    if (!url || !payload.credential) {
        return;
    }
    if (active && active.url === url && !active.stopped) {
        return;
    }
    unsubscribeSamoCatalogEvents();

    const subscription: Subscription = {
        controller: new AbortController(),
        stopped: false,
        timer: null,
        url,
    };
    active = subscription;
    runForever(subscription, payload.credential, send);
};

export const unsubscribeSamoCatalogEvents = (): void => {
    if (!active) {
        return;
    }
    active.stopped = true;
    if (active.timer) {
        clearTimeout(active.timer);
        active.timer = null;
    }
    active.controller.abort();
    active = null;
};
