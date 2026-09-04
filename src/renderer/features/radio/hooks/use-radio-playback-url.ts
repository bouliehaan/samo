import {
    clearSamoStreamTokenCache,
    ensureSamoStreamToken,
    getCachedSamoStreamToken,
    parseSamoChannelIdFromStreamUrl,
    withSamoStreamToken,
} from '@samo/core/server';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { useRadioStore } from '/@/renderer/features/radio/hooks/use-radio-player';
import { samoChannelAuth } from '/@/renderer/features/radio/utils/samo-channel-auth';
import { useCurrentServerWithCredential } from '/@/renderer/store';

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

/**
 * Mark a channel URL so a reopen is a different URL from the one already loaded.
 *
 * Skipping a channel is a decision the server makes, but the seconds already in
 * flight — its listener queue, the socket, the audio element's own buffer —
 * still hold the thing being skipped, and they would play out in full
 * afterwards. Dropping them means opening the connection again, and the only
 * handle React gives us on that is the `url` prop: an identical string is not a
 * change, so nothing reloads.
 *
 * A counter in the query is what makes the string differ. The server reads only
 * the path and `stream_token` off a listen URL and ignores the rest, and a
 * channel is live and endless, so there is nothing to lose by reconnecting.
 * Never applied to an internet station: that is somebody else's address, it has
 * no programming to skip, and nothing should be appended to it.
 */
const withReopenMark = (url: string, reopen: number): string => {
    if (reopen <= 0) {
        return url;
    }

    const target = new URL(url);
    target.searchParams.set('reopen', String(reopen));
    return target.toString();
};

export const useRadioPlaybackUrl = (
    streamUrl: null | string,
): { onStreamError: () => void; url: null | string } => {
    const server = useCurrentServerWithCredential();
    const auth = useMemo(() => samoChannelAuth(server), [server]);
    // Bumped by the transport when it has just moved the channel's programming
    // on — see `withReopenMark`.
    const reopen = useRadioStore((state) => state.reopen);
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
            setResolved(withReopenMark(withSamoStreamToken(streamUrl, cached), reopen));
            return;
        }

        let cancelled = false;
        void ensureSamoStreamToken(auth, samoFetch)
            .then((token) => {
                if (cancelled) return;
                // No token is not a reason to play nothing: the request gets
                // refused and surfaces as a stream error, which reads better
                // than a station that silently never starts.
                setResolved(
                    withReopenMark(
                        token ? withSamoStreamToken(streamUrl, token) : streamUrl,
                        reopen,
                    ),
                );
            })
            .catch(() => {
                if (!cancelled) setResolved(withReopenMark(streamUrl, reopen));
            });

        return () => {
            cancelled = true;
        };
    }, [attempt, auth, reopen, streamUrl]);

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
