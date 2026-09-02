// Samo channels: the stations Samo programmes and streams itself.
//
// A channel is not a URL Samo relays (that is an internet radio station) and
// not a loop it assembles on request (that is a programmed station under
// `/radio`). It is a continuous broadcast: one encoder running 24/7, every
// listener hearing the same second of audio, with a scheduler deciding what
// airs next. Which is why nothing here takes a position, a queue index, or a
// duration — you tune in, you do not start it.
//
// These used to live in server-samo-radio, because tuning a samo-radio device
// was the only thing a client did with them. Listening on the phone or the
// desktop is the second thing, so they moved out to where both can reach them.

import { type ServerAuthenticationResult } from './server-auth';
import { type SamoFetch } from './server-http';
import { getSamoApiUrl, getSamoExtractedCoverUrl, pickSamoCatalogImageId, samoGet } from './server-samo';

type Auth = Pick<ServerAuthenticationResult, 'credential' | 'url'>;

/** What a channel is putting out this second. */
export interface SamoChannelAiring {
    artist?: string;
    /** `music`, `podcast`, `audiobook`, … — the station's own word for it. */
    kind?: string;
    startedAt?: string;
    title?: string;
}

/**
 * A Samo channel — one of the programmed 24/7 stations.
 *
 * `enabled` is the off switch: a disabled channel has no encoder running, so
 * it is not something to offer a listener. `nowPlaying` rides along on the list
 * response — absent when no encoder is running, which is the honest answer for
 * a station nobody is listening to.
 */
export interface SamoChannel {
    bitrateKbps?: number;
    codec?: string;
    /**
     * The channel's artwork. Always present on a server that has channel
     * covers: an uploaded image if somebody set one, otherwise a generated
     * tile the server stores on demand. A client never has to invent a
     * fallback — an absent id means an older server, not a bare channel.
     */
    coverId?: string;
    description?: string;
    enabled: boolean;
    id: string;
    listenerCount?: number;
    name: string;
    nowPlaying?: SamoChannelAiring;
}

/** One item a channel aired, or is airing. */
export interface SamoChannelPlaybackItem extends SamoChannelAiring {
    durationSeconds?: number;
    sourceLabel?: string;
}

/**
 * What a channel is emitting right now.
 *
 * The stream itself carries no metadata — it is a raw encoder pipe with no ICY
 * frames in it — so this endpoint is the only way a listener can be told what
 * is on. Everything tuned to the channel polls it, which is also what makes
 * every listener's "now playing" agree.
 */
export interface SamoChannelNowPlaying {
    channelId: string;
    current?: SamoChannelPlaybackItem;
    /**
     * The airing track when it is an explo drop the next weekly rotation will
     * delete, and the id to hand to `keepSamoExploTracks`.
     *
     * One field rather than a flag beside an id, because the two can never
     * disagree: present means "this can be kept, here is what to keep". Absent
     * is the answer for nearly everything a station plays — music out of the
     * ordinary library, a podcast, a relayed stream — and for a listener who
     * is not an admin and whose keep would be refused anyway. A surface that
     * offers keeping should draw the action off THIS and nothing else.
     *
     * Always absent on a server too old to report it, which is the same as
     * "nothing to keep" and needs no version check.
     */
    keepableTrackId?: string;
    listenerCount?: number;
    startedAt?: string;
}

const channelPath = (channelId: string, suffix = ''): string =>
    `/channels/${encodeURIComponent(channelId)}${suffix}`;

/**
 * The channels a listener can actually tune to.
 *
 * Disabled channels are dropped here rather than at each call site: a channel
 * with its encoder switched off produces silence and a stalled connection, and
 * every surface that lists stations would have to know that to avoid offering
 * one.
 */
export const listSamoChannels = async (
    fetcher: SamoFetch,
    authentication: Auth,
    options?: { signal?: AbortSignal },
): Promise<SamoChannel[]> => {
    const response = await samoGet<{ items?: SamoChannel[] }>(fetcher, authentication, '/channels', {
        signal: options?.signal,
    });

    return (response?.items ?? []).filter((channel) => channel.enabled);
};

export const getSamoChannel = async (
    fetcher: SamoFetch,
    authentication: Auth,
    channelId: string,
    options?: { signal?: AbortSignal },
): Promise<SamoChannel> => {
    return samoGet<SamoChannel>(fetcher, authentication, channelPath(channelId), {
        signal: options?.signal,
    });
};

export const getSamoChannelNowPlaying = async (
    fetcher: SamoFetch,
    authentication: Auth,
    channelId: string,
    options?: { signal?: AbortSignal },
): Promise<SamoChannelNowPlaying> => {
    return samoGet<SamoChannelNowPlaying>(fetcher, authentication, channelPath(channelId, '/now'), {
        signal: options?.signal,
    });
};

/**
 * The listening URL for a channel.
 *
 * Deliberately the `/api/v1` form rather than the bare `/channels/…` one the
 * server also serves. Both are the same audio behind the same auth, but every
 * client convention for a Samo stream — re-homing a URL minted on the LAN onto
 * the remote address, swapping in a fresh stream token, re-minting after a
 * 401 — keys on `/api/v1/` being in the path. A station somebody leaves on all
 * evening outlives several token lifetimes, so it has to be a URL those
 * mechanisms recognise.
 */
export const getSamoChannelStreamUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    channelId: string,
    options?: { streamToken?: string },
): string =>
    getSamoApiUrl(
        authentication,
        channelPath(channelId, '/stream'),
        options?.streamToken ? { stream_token: options.streamToken } : undefined,
    );

/**
 * A channel's artwork URL, or undefined on a server too old to have any.
 *
 * There is only one shape to handle — a cover id from Samo's own store — so
 * this is shorter than the internet-station resolver, which also has to cope
 * with logos hotlinked from whoever runs the stream.
 */
export const resolveSamoChannelArtworkUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    channel: Pick<SamoChannel, 'coverId'>,
    streamToken?: string,
): string | undefined => {
    const coverId = pickSamoCatalogImageId(channel.coverId);
    return coverId ? getSamoExtractedCoverUrl(authentication, coverId, streamToken) : undefined;
};

const CHANNEL_STREAM_PATH = /\/api\/v1\/channels\/([^/]+)\/stream$/;

/**
 * The channel id behind a listening URL, or undefined if it is not one.
 *
 * Reading the id back out of the URL — rather than carrying it alongside —
 * means anything holding only a stream URL can still ask the server what is on
 * air: a restored session, a recently-played row, an `<audio>` element's src.
 */
export const parseSamoChannelIdFromStreamUrl = (url: string | undefined): string | undefined => {
    if (!url) {
        return undefined;
    }

    try {
        const match = new URL(url).pathname.match(CHANNEL_STREAM_PATH);
        return match ? decodeURIComponent(match[1]) : undefined;
    } catch {
        return undefined;
    }
};
