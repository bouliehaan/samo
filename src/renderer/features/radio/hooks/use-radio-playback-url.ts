import {
    clearSamoStreamTokenCache,
    ensureSamoStreamToken,
    getCachedSamoStreamToken,
    parseSamoChannelIdFromStreamUrl,
    ServerType,
    withSamoStreamToken,
} from '@samo/core/server';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { useCurrentServerWithCredential } from '/@/renderer/store';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

/**
 * The URL the audio element actually opens, which is not always the URL the
 * station is known by.
 *
 * Samo's own channels are authenticated, and an `<audio>` element cannot send
 * an Authorization header — the only way in is a `stream_token` in the query.
 * That token belongs HERE and nowhere else: it lives about half an hour, while
 * the station's URL is written into recents, into the restored session, and
 * into every "is this the row that's playing" comparison in the app. Bake a
 * token into that and the identity changes each time one is minted, while the
 * persisted copies come back from a restart already dead.
 *
 * Internet stations pass straight through: they are somebody else's address and
 * carry no Samo auth at all.
 */

/** Enough attempts to mint past a dead token, few enough to never spin. */
const MAX_TOKEN_RETRIES = 2;

const samoAuth = (server: null | ServerListItemWithCredential | undefined) =>
    server?.type === ServerType.SAMO && server.url && server.credential
        ? { credential: server.credential, type: ServerType.SAMO as const, url: server.url }
        : null;

export const useRadioPlaybackUrl = (
    streamUrl: null | string,
): { onStreamError: () => void; url: null | string } => {
    const server = useCurrentServerWithCredential();
    const auth = useMemo(() => samoAuth(server), [server]);
    // Bumped when a stream fails to open, after throwing the failed token away.
    const [attempt, setAttempt] = useState(0);
    const attemptsRef = useRef(0);

    const [resolved, setResolved] = useState<null | string>(null);

    useEffect(() => {
        attemptsRef.current = 0;
        setAttempt(0);
    }, [streamUrl]);

    useEffect(() => {
        if (!streamUrl) {
            setResolved(null);
            return;
        }
        // Not a channel — nothing to authenticate, so it plays as-is.
        if (!parseSamoChannelIdFromStreamUrl(streamUrl) || !auth) {
            setResolved(streamUrl);
            return;
        }

        // The app mints on connect, so a station tap normally has a live token
        // already and never waits on the network here.
        const cached = getCachedSamoStreamToken(auth);
        if (cached) {
            setResolved(withSamoStreamToken(streamUrl, cached));
            return;
        }

        let cancelled = false;
        void ensureSamoStreamToken(auth, samoFetch)
            .then((token) => {
                if (cancelled) return;
                // No token is not a reason to play nothing: the request gets
                // refused and surfaces as a stream error, which reads better
                // than a station that silently never starts.
                setResolved(token ? withSamoStreamToken(streamUrl, token) : streamUrl);
            })
            .catch(() => {
                if (!cancelled) setResolved(streamUrl);
            });

        return () => {
            cancelled = true;
        };
    }, [attempt, auth, streamUrl]);

    /**
     * A channel that fails to open has usually outlived its token — a station
     * left on all evening, a connection that dropped for a moment, a reconnect
     * the server refuses. The URL and the station are both fine; only the token
     * is stale, so it is discarded and one is minted for the retry.
     */
    const onStreamError = useCallback(() => {
        if (!streamUrl || !auth || !parseSamoChannelIdFromStreamUrl(streamUrl)) {
            return;
        }
        if (attemptsRef.current >= MAX_TOKEN_RETRIES) {
            return;
        }
        attemptsRef.current += 1;
        clearSamoStreamTokenCache(auth);
        setAttempt(attemptsRef.current);
    }, [auth, streamUrl]);

    return { onStreamError, url: resolved };
};
