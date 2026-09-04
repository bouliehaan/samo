import {
    enrichSamoChannelPlaybackItem,
    type MobilePlayableAudio,
    parseSamoChannelPlaybackId,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    getFetch,
    getSamoChannel,
    getSamoChannelNowPlaying,
    previousSamoChannel,
    SAMO_CHANNEL_SKIP_SETTLE_MS,
    type SamoChannelSkipScope,
    type ServerAuthenticationResult,
    skipSamoChannel,
} from '@samo/core/server';

import { getAuthSession } from '../state/auth-session';
import { getPlaybackBridge } from '../state/playback-bridge';
import { getPlaybackQueue } from '../state/playback-queue-store';
import { getAndroidPlaybackState, setAndroidPlaybackState } from '../state/playback-store';
import {
    getSamoChannelState,
    type SamoChannelCommand,
    setSamoChannelCommand,
    setSamoChannelNotice,
} from '../state/samo-channel';

/**
 * Moving a Samo channel's programming on, from the phone that is listening.
 *
 * A channel has no queue and no position: one encoder, every listener on the
 * same second, a scheduler deciding what airs next. So PREV and NEXT here are
 * not local moves — they are requests to the STATION, and everybody tuned in
 * hears the result. The server treats that as a listener action rather than
 * administration, which is why the player may offer it at all.
 *
 * Two halves make the button feel like a button, and the second is the one that
 * is easy to leave out. Between the encoder and the speaker sit the server's
 * listener queue, a socket and ExoPlayer's own buffer — several seconds fetched
 * before the skip, which would otherwise play out in full afterwards and make
 * the press look ignored. Reopening the stream throws all of it away, and a
 * live endless source has nothing to lose by reconnecting. The samo-radio
 * daemon does exactly this for a device; a listening phone is the same problem
 * with a different buffer.
 */

/** How long a failure stays on screen before the player goes quiet again. */
const NOTICE_MS = 4000;

const FAILURE: Record<SamoChannelCommand, string> = {
    kind: 'Could not change the kind of programme.',
    previous: 'Could not go back a programme.',
    skip: 'Could not skip what is airing.',
};

let noticeTimer: null | ReturnType<typeof setTimeout> = null;

const showNotice = (message: string): void => {
    if (noticeTimer) {
        clearTimeout(noticeTimer);
    }
    setSamoChannelNotice(message);
    noticeTimer = setTimeout(() => {
        noticeTimer = null;
        setSamoChannelNotice(null);
    }, NOTICE_MS);
};

/**
 * The channel behind a playing item, or null for anything else.
 *
 * An internet radio station is somebody else's programming with nothing to skip
 * to, and everything but radio has a real queue — so this answering null is
 * what keeps these controls off every surface they do not belong on.
 */
export const samoChannelIdForPlayback = (
    item: MobilePlayableAudio | null | undefined,
): null | string => {
    if (!item || item.source !== 'radio') {
        return null;
    }
    return item.radioChannelId ?? parseSamoChannelPlaybackId(item.id) ?? null;
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Open the stream again, dropping everything already buffered.
 *
 * Handing back the queue's own items array is the "same queue" signal
 * `playQueuedItem` reads — without it, a reconnect would look like a brand new
 * context and erase where the station was started from.
 */
const reopenStream = async (item: MobilePlayableAudio): Promise<void> => {
    const queue = getPlaybackQueue();
    const isSameQueue = queue ? queue.items[queue.index]?.id === item.id : false;
    await getPlaybackBridge().playQueuedItem(
        item,
        isSameQueue ? queue?.items : undefined,
        isSameQueue ? queue?.index : undefined,
    );
};

/**
 * Put what is airing NOW on the player.
 *
 * The skip's own reply still describes the outgoing item, and the ordinary
 * five-second poll is long enough afterwards to read as a press that did
 * nothing. Re-read against the item that was playing, so a station left during
 * the wait keeps whatever it is showing.
 */
const refreshAiringLine = async (
    authentication: ServerAuthenticationResult,
    channelId: string,
    itemId: string,
): Promise<void> => {
    try {
        const [channel, nowPlaying] = await Promise.all([
            getSamoChannel(getFetch(), authentication, channelId),
            getSamoChannelNowPlaying(getFetch(), authentication, channelId),
        ]);
        setAndroidPlaybackState((current) =>
            current.status === 'idle' || current.item.id !== itemId
                ? current
                : {
                      ...current,
                      item: enrichSamoChannelPlaybackItem(current.item, channel, nowPlaying),
                  },
        );
    } catch {
        // The metadata poll is still running and will catch up on its own.
    }
};

const moveProgramming = async (
    command: SamoChannelCommand,
    ask: (
        authentication: ServerAuthenticationResult,
        channelId: string,
    ) => Promise<boolean>,
): Promise<void> => {
    if (getSamoChannelState().command) {
        return;
    }

    const playback = getAndroidPlaybackState();
    const item = playback.status === 'idle' ? null : playback.item;
    const channelId = samoChannelIdForPlayback(item);
    if (!item || !channelId) {
        return;
    }

    const authentication = findServerAuthenticationForSource(
        getAuthSession().serverConnection,
        { id: item.contentSourceId },
    );
    if (!authentication) {
        showNotice('Not connected to this station’s server.');
        return;
    }

    setSamoChannelCommand(command);
    setSamoChannelNotice(null);
    try {
        const moved = await ask(authentication, channelId);
        // Nothing was airing, so nothing moved. Reconnecting would rebuffer for
        // no reason and what is on screen is already right.
        if (!moved) {
            return;
        }

        // Started before the reconnect so the two overlap: the station needs
        // about this long to decide what airs next either way. Registered after
        // the reconnect's own writes have landed, so the fresh line cannot be
        // overwritten by the item the reconnect was given.
        const settled = delay(SAMO_CHANNEL_SKIP_SETTLE_MS);
        await reopenStream(item);
        void settled.then(() => refreshAiringLine(authentication, channelId, item.id));
    } catch (error) {
        showNotice(error instanceof Error ? error.message : FAILURE[command]);
    } finally {
        setSamoChannelCommand(null);
    }
};

/** Re-air the item before this one — a live pipe has no back-buffer to rewind. */
export const previousSamoChannelProgramme = (): Promise<void> =>
    moveProgramming('previous', (authentication, channelId) =>
        previousSamoChannel(getFetch(), authentication, channelId),
    );

/**
 * Skip what is airing.
 *
 * `kind` is the other thing a listener means by "not this": not the next
 * episode of what they just walked out of, but a different medium entirely.
 */
export const skipSamoChannelProgramme = (scope: SamoChannelSkipScope = 'item'): Promise<void> =>
    moveProgramming(scope === 'kind' ? 'kind' : 'skip', (authentication, channelId) =>
        skipSamoChannel(getFetch(), authentication, channelId, scope),
    );
