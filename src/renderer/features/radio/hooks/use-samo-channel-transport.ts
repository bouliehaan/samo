import {
    parseSamoChannelIdFromStreamUrl,
    previousSamoChannel,
    SAMO_CHANNEL_SKIP_SETTLE_MS,
    skipSamoChannel,
} from '@samo/core/server';
import { useCallback, useMemo } from 'react';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import {
    readSamoChannelLine,
    type SamoChannelCommand,
    useRadioStore,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import {
    samoChannelAuth,
    type SamoChannelAuth,
} from '/@/renderer/features/radio/utils/samo-channel-auth';
import { useCurrentServerWithCredential } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';

export interface SamoChannelTransport {
    /** The command in flight anywhere in the app, so no surface fires a second. */
    busy: null | SamoChannelCommand;
    /** True only while a samo channel is on and the server can be asked. */
    isChannel: boolean;
    previous: () => void;
    skip: () => void;
    skipKind: () => void;
}

/** What to say when the station will not move — the server's detail goes under it. */
const FAILURE_TITLE: Record<SamoChannelCommand, string> = {
    kind: 'Could not change the kind of programme',
    previous: 'Could not go back a programme',
    skip: 'Could not skip what is airing',
};

/**
 * The pending re-read after a skip.
 *
 * Module-level rather than a ref, because it belongs to the station and not to
 * whichever surface happened to press the button: closing the full-screen
 * player a second after skipping must not leave the title on the item that was
 * skipped until the next poll comes round.
 */
let settleTimer: null | ReturnType<typeof setTimeout> = null;

/**
 * Publish what the channel is airing once the skip has settled.
 *
 * The skip's own reply still describes the outgoing item — see
 * {@link SAMO_CHANNEL_SKIP_SETTLE_MS} — and the ordinary poll is on a five
 * second cadence, which is long enough to read as a button that did nothing.
 *
 * The channel is re-checked before publishing: a retune during the wait means
 * this answer is about a station nobody is listening to any more.
 */
const nudgeAiringLine = (auth: SamoChannelAuth, channelId: string) => {
    if (settleTimer) {
        clearTimeout(settleTimer);
    }

    settleTimer = setTimeout(() => {
        settleTimer = null;
        void readSamoChannelLine(auth, channelId)
            .then((line) => {
                const { actions, currentStreamUrl } = useRadioStore.getState();
                if (parseSamoChannelIdFromStreamUrl(currentStreamUrl ?? undefined) === channelId) {
                    actions.setMetadata(line);
                }
            })
            .catch(() => {
                // The ordinary poll is still running and will catch up.
            });
    }, SAMO_CHANNEL_SKIP_SETTLE_MS);
};

/**
 * The programme controls for whatever channel this app is listening to.
 *
 * A channel has no queue and no position, so PREV and NEXT are not local moves:
 * there is one encoder, every listener hears the same second, and the only way
 * past the thing playing is to ask the station to move on — which it does for
 * everybody tuned in. The server treats that as a listener action rather than
 * administration, so any surface showing what is on may offer it.
 *
 * Two halves make the button feel like a button. The server moves the
 * programming on; then the connection is opened again, because the seconds
 * already pulled down the pipe still hold the item that was skipped and would
 * otherwise play out in full. The samo-radio daemon does exactly this for a
 * device, and a listening desktop is the same problem with a different buffer.
 *
 * An internet radio station is somebody else's programming with nothing to skip
 * to, so `isChannel` is false for one and no controls appear.
 */
export const useSamoChannelTransport = (): SamoChannelTransport => {
    const busy = useRadioStore((state) => state.channelCommand);
    const currentStreamUrl = useRadioStore((state) => state.currentStreamUrl);
    const reopenStream = useRadioStore((state) => state.actions.reopenStream);
    const setBusy = useRadioStore((state) => state.actions.setChannelCommand);
    const server = useCurrentServerWithCredential();
    const auth = useMemo(() => samoChannelAuth(server), [server]);
    const channelId = parseSamoChannelIdFromStreamUrl(currentStreamUrl ?? undefined) ?? null;

    const run = useCallback(
        (
            action: SamoChannelCommand,
            ask: (auth: SamoChannelAuth, channelId: string) => Promise<boolean>,
        ) => {
            if (busy || !auth || !channelId) {
                return;
            }

            setBusy(action);
            void ask(auth, channelId)
                .then((moved) => {
                    // Nothing was airing, so nothing moved: reconnecting would
                    // rebuffer for no reason and the readout is already right.
                    if (!moved) {
                        return;
                    }

                    reopenStream();
                    nudgeAiringLine(auth, channelId);
                })
                .catch((error) => {
                    toast.error({
                        message: error instanceof Error ? error.message : undefined,
                        title: FAILURE_TITLE[action],
                    });
                })
                .finally(() => setBusy(null));
        },
        [auth, busy, channelId, reopenStream, setBusy],
    );

    const previous = useCallback(
        () => run('previous', (auth, channelId) => previousSamoChannel(samoFetch, auth, channelId)),
        [run],
    );

    const skip = useCallback(
        () => run('skip', (auth, channelId) => skipSamoChannel(samoFetch, auth, channelId)),
        [run],
    );

    const skipKind = useCallback(
        () => run('kind', (auth, channelId) => skipSamoChannel(samoFetch, auth, channelId, 'kind')),
        [run],
    );

    return {
        busy,
        isChannel: Boolean(auth && channelId),
        previous,
        skip,
        skipKind,
    };
};
