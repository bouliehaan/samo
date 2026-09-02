import {
    getSamoClientId,
    type ServerAuthenticationResult,
    setSamoClientLabel,
} from '@samo/core/server';
import { AppState, type NativeEventSubscription } from 'react-native';

import { triggerCatalogSyncNow } from './headless-catalog-sync';
import { isOfflineNow } from '../state/network-state';

/**
 * Live catalog-change notifications, for as long as the app is in front.
 *
 * The phone learns about the rest of the world through a WorkManager sync that
 * runs every 30 minutes. That is the right shape for a backgrounded app — it
 * survives the process dying, and it costs nothing while the screen is off —
 * but it is a poor answer to "I just edited this playlist on the desktop and
 * the phone is in my other hand": the edit is real, the server knows, and the
 * phone waits out the interval.
 *
 * So this is deliberately NOT a replacement for the sync. It is a foreground
 * accelerator: while the app is open, a change on another device pokes the same
 * one-shot sync the app's own edits do, and everything downstream — the mirror
 * write, the post-sync cache drop, the Home and Library re-derive — is the path
 * that already exists. Backgrounded, this closes and the periodic sync is once
 * again the whole story.
 *
 * Nothing here is load-bearing. A server too old to have the endpoint, a
 * dropped connection, a missed event: each costs freshness until the next
 * periodic sync, which is exactly where the app was before.
 */

// Names this device in the server's log and in the origin echo. The random
// suffix is what makes the id unique; this only makes it readable.
setSamoClientLabel('android');

const RECONNECT_DELAY_MS = 5_000;
/** Ignore repeat notifications inside this window — an import or a scan can
 *  announce many changes, and they all resolve to the same one sync. */
const COALESCE_MS = 1_500;

interface StreamState {
    appStateSubscription: NativeEventSubscription | null;
    auth: ServerAuthenticationResult | null;
    coalesceTimer: null | ReturnType<typeof setTimeout>;
    reconnectTimer: null | ReturnType<typeof setTimeout>;
    request: null | XMLHttpRequest;
}

const state: StreamState = {
    appStateSubscription: null,
    auth: null,
    coalesceTimer: null,
    reconnectTimer: null,
    request: null,
};

const onCatalogChanged = (): void => {
    if (state.coalesceTimer) {
        return;
    }
    state.coalesceTimer = setTimeout(() => {
        state.coalesceTimer = null;
        void triggerCatalogSyncNow();
    }, COALESCE_MS);
};

/**
 * Handle one SSE frame.
 *
 * Frames arrive as `event: <type>\ndata: <json>\n\n`; the server documents that
 * the JSON never contains a raw newline, so there is no multi-line folding to
 * handle. The heartbeat and settle frames are SSE comments with no `data:` line
 * and fall through as nothing.
 */
const handleFrame = (frame: string): void => {
    let type = '';
    let data = '';
    for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) {
            type = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            data = line.slice(5).trim();
        }
    }
    if (type !== 'catalog-changed' || !data) {
        return;
    }
    try {
        const change = JSON.parse(data) as { origin?: string };
        // This device's own edit. It has already invalidated what it needed to
        // and kicked its own sync; re-syncing on the echo is pure round trip.
        if (change.origin && change.origin === getSamoClientId()) {
            return;
        }
    } catch {
        // An unreadable frame still means SOMETHING changed. Syncing is the
        // safe reading of it.
    }
    onCatalogChanged();
};

const closeRequest = (): void => {
    if (state.request) {
        // Detach first: abort() fires onreadystatechange, and the handler would
        // otherwise queue a reconnect for a stream we are deliberately closing.
        state.request.onreadystatechange = null;
        try {
            state.request.abort();
        } catch {
            // already dead
        }
        state.request = null;
    }
    if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = null;
    }
};

const scheduleReconnect = (): void => {
    if (state.reconnectTimer || !state.auth || AppState.currentState !== 'active') {
        return;
    }
    state.reconnectTimer = setTimeout(() => {
        state.reconnectTimer = null;
        connect();
    }, RECONNECT_DELAY_MS);
};

const connect = (): void => {
    const auth = state.auth;
    if (!auth || state.request || AppState.currentState !== 'active' || isOfflineNow()) {
        return;
    }

    // XMLHttpRequest rather than fetch: React Native's fetch has no streaming
    // response body, so a never-ending response never resolves. XHR exposes the
    // bytes so far as `responseText` during LOADING, which is enough to read
    // frames off as they land.
    const request = new XMLHttpRequest();
    state.request = request;
    let consumed = 0;

    request.onreadystatechange = () => {
        if (state.request !== request) {
            return;
        }
        if (request.readyState === 3 || request.readyState === 4) {
            const text = request.responseText ?? '';
            let separator = text.indexOf('\n\n', consumed);
            while (separator !== -1) {
                handleFrame(text.slice(consumed, separator));
                consumed = separator + 2;
                separator = text.indexOf('\n\n', consumed);
            }
        }
        if (request.readyState === 4) {
            state.request = null;
            scheduleReconnect();
        }
    };

    try {
        request.open('GET', `${auth.url.replace(/\/+$/, '')}/api/v1/catalog/events`);
        request.setRequestHeader('Authorization', `Bearer ${auth.credential}`);
        request.setRequestHeader('Accept', 'text/event-stream');
        request.send();
    } catch {
        state.request = null;
        scheduleReconnect();
    }
};

/**
 * Follow `auth`'s catalog-change stream while the app is in front. Pass null to
 * stop (sign-out, or a server that is no longer the current one).
 */
export const startCatalogChangeStream = (auth: null | ServerAuthenticationResult): void => {
    closeRequest();
    state.auth = auth;

    if (!state.appStateSubscription) {
        state.appStateSubscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
                connect();
            } else {
                // Nothing to accelerate while the app is not being looked at,
                // and a socket held open across a sleep is a socket the OS will
                // kill anyway. The periodic sync covers the gap.
                closeRequest();
            }
        });
    }

    connect();
};

export const stopCatalogChangeStream = (): void => {
    closeRequest();
    state.auth = null;
    if (state.coalesceTimer) {
        clearTimeout(state.coalesceTimer);
        state.coalesceTimer = null;
    }
    state.appStateSubscription?.remove();
    state.appStateSubscription = null;
};
