import {
    type MobilePlayableAudio,
    parsePodcastPlaybackEpisodeId,
    parseSamoAudiobookIdFromPlaybackId,
    parseSamoChannelPlaybackId,
    parseSamoInternetRadioStationId,
    parseSamoMusicTrackIdFromPlaybackId,
    parseSamoProgrammedRadioStationId,
} from '@samo/core/mobile';
import { type SamoRadioItemRef, type SamoRadioStationRef } from '@samo/core/server';

/**
 * Turning the playback queue into something samo-radio can be asked to play.
 *
 * A pure module with no React Native imports, for the same reason
 * playback-queue-mirror is one: this is the logic worth unit-testing, and a
 * test cannot reach it through a module that transitively pulls in the RN
 * runtime. The auth-aware wrapper lives in services/samo-radio.
 */

/** The minimum of a queue entry this mapping needs. */
export type SamoRadioQueueEntry = Pick<MobilePlayableAudio, 'id' | 'source'> & {
    radioChannelId?: string;
    radioStationId?: string;
    radioStationName?: string;
};

/**
 * A channel the device should be TUNED to, rather than an item to queue.
 *
 * A samo channel is a broadcast: there is no copy of it to hand a device and no
 * position in it to start from, so the device joins it where it already is.
 * That is a different call from a queue send (`/play` with `mode: channel`),
 * which is why this returns a station ref and not an item ref — the two are not
 * interchangeable and the server rejects a channel id in a queue.
 *
 * Returns null for everything else, including internet stations: those the
 * server can resolve as ordinary queue items, so they take the normal path.
 */
export const samoRadioStationRefFromPlayable = (
    item: SamoRadioQueueEntry,
): SamoRadioStationRef | null => {
    if (item.source !== 'radio') {
        return null;
    }

    const channelId = item.radioChannelId ?? parseSamoChannelPlaybackId(item.id);

    return channelId
        ? { id: channelId, kind: 'channel', name: item.radioStationName }
        : null;
};

/**
 * Turn one queue entry into a catalog reference the server can resolve.
 *
 * The id is parsed out of the playback id, the same way
 * `deriveSamoProgressTarget` in utils/native-stream-auth does it.
 *
 * It deliberately does NOT read `samoProgressKind`/`samoProgressTargetId`,
 * even though those fields exist on the type and hold exactly this pair: they
 * are attached by `attachNativeStreamCredentialsToQueue` on the way INTO the
 * native module and never written back, so the items sitting in
 * playback-queue-store never carry them. Reading them here mapped every queue
 * to nothing and made "play to samo-radio" a silent no-op.
 *
 * Returns null for anything the server cannot resolve by id — a non-samo
 * backend, a local file with no catalog row — and the caller drops it rather
 * than sending the device something it cannot fetch.
 */
export const samoRadioRefFromPlayable = (item: SamoRadioQueueEntry): SamoRadioItemRef | null => {
    switch (item.source) {
        case 'music': {
            const trackId = parseSamoMusicTrackIdFromPlaybackId(item.id);
            return trackId ? { id: trackId, type: 'track' } : null;
        }
        case 'audiobook': {
            const audiobookId = parseSamoAudiobookIdFromPlaybackId(item.id);
            return audiobookId ? { id: audiobookId, type: 'audiobook' } : null;
        }
        case 'podcast': {
            const episodeId = parsePodcastPlaybackEpisodeId(item.id);
            return episodeId ? { id: episodeId, type: 'episode' } : null;
        }
        case 'radio': {
            // A channel is not a queue item at all — see
            // `samoRadioStationRefFromPlayable`. Bailing here rather than
            // falling through is what stops a channel id being sent as an
            // internet station's: same shape, different catalog, wrong station.
            if (item.radioChannelId ?? parseSamoChannelPlaybackId(item.id)) {
                return null;
            }
            // Programmed stations are a different catalog from internet ones —
            // samo streams the first itself and relays the second — so they
            // resolve under a different type on the server. Checked first
            // because only the internet form carries `radioStationId`, and
            // falling through to it would send a programmed station's id as an
            // internet one: either a miss, or the wrong station.
            const programmedId = parseSamoProgrammedRadioStationId(item.id);
            if (programmedId) {
                return { id: programmedId, type: 'radio' };
            }
            // Internet stations carry the station id from the builder; the id
            // parse is the fallback for a queue rehydrated from the native
            // mirror, which is how use-android-radio-metadata-sync resolves it
            // too.
            const stationId = item.radioStationId ?? parseSamoInternetRadioStationId(item.id);
            return stationId ? { id: stationId, type: 'station' } : null;
        }
        default:
            return null;
    }
};

/**
 * Map a whole queue for sending, keeping the start index pointing at the same
 * track.
 *
 * Dropping an entry renumbers everything after it, so the caller's index into
 * the original queue is not an index into this one. Returning both together is
 * what stops "play to samo-radio" starting several tracks early. When the
 * current item is itself dropped, the device starts at the next surviving item
 * rather than at the top of the queue.
 *
 * `isSendable` is the ownership gate: a catalog id only means something on the
 * server that issued it, and it has to be applied in this same pass or the
 * index rebasing is wrong again.
 */
export const samoRadioQueueForSend = (
    items: SamoRadioQueueEntry[],
    index = 0,
    isSendable: (item: SamoRadioQueueEntry) => boolean = () => true,
): { items: SamoRadioItemRef[]; startIndex: number } => {
    const refs: SamoRadioItemRef[] = [];
    let startIndex = 0;
    let currentFound = false;

    items.forEach((item, position) => {
        const ref = isSendable(item) ? samoRadioRefFromPlayable(item) : null;
        if (!ref) {
            return;
        }
        if (!currentFound && position >= index) {
            startIndex = refs.length;
            currentFound = true;
        }
        refs.push(ref);
    });

    return { items: refs, startIndex };
};
