import {
    parsePodcastPlaybackEpisodeId,
    parseSamoAudiobookIdFromPlaybackId,
    parseSamoMusicTrackIdFromPlaybackId,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    getSamoBearerToken,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { getContentSourceFromPlaybackItem } from './content-source';

const isSamoApiStreamUrl = (url: string | undefined): boolean => {
    if (!url) {
        return false;
    }
    try {
        return new URL(url).pathname.includes('/api/v1/');
    } catch {
        return false;
    }
};

type SamoProgressKind = NonNullable<MobilePlayableAudio['samoProgressKind']>;

const deriveSamoProgressTarget = (
    item: MobilePlayableAudio,
): { kind: SamoProgressKind; targetId: string } | null => {
    if (item.source === 'music') {
        const trackId = parseSamoMusicTrackIdFromPlaybackId(item.id);
        return trackId ? { kind: 'music-track', targetId: trackId } : null;
    }
    if (item.source === 'audiobook') {
        const audiobookId = parseSamoAudiobookIdFromPlaybackId(item.id);
        return audiobookId ? { kind: 'audiobook', targetId: audiobookId } : null;
    }
    if (item.source === 'podcast') {
        const episodeId = parsePodcastPlaybackEpisodeId(item.id);
        return episodeId ? { kind: 'podcast-episode', targetId: episodeId } : null;
    }
    return null;
};

/**
 * Attach server credentials + native progress sync target for every queue
 * item. The native side uses [serverUrl] + [serverBearerToken] to mint fresh
 * stream tokens during auto-advance, and [samoProgressKind] + [samoProgressTargetId]
 * to PATCH `/api/v1/playback/{kind}/{id}` from the foreground service while
 * JS is suspended — that's what makes resume positions survive screen sleep.
 */
export const attachNativeStreamCredentials = (
    item: MobilePlayableAudio,
    serverConnection: ServerAuthenticationResult | null,
): MobilePlayableAudio => {
    if (!isSamoApiStreamUrl(item.url) && !isSamoApiStreamUrl(item.castUrl)) {
        return item;
    }

    const contentSource = getContentSourceFromPlaybackItem(item, serverConnection);
    const auth = contentSource
        ? findServerAuthenticationForSource(serverConnection, contentSource)
        : undefined;
    if (!auth) {
        return item;
    }

    const progressTarget = deriveSamoProgressTarget(item);

    const credentialsMatch =
        item.serverUrl === auth.url && Boolean(item.serverBearerToken);
    const progressMatch =
        item.samoProgressKind === progressTarget?.kind &&
        item.samoProgressTargetId === progressTarget?.targetId;
    if (credentialsMatch && progressMatch) {
        return item;
    }

    return {
        ...item,
        serverBearerToken: getSamoBearerToken(auth),
        serverUrl: auth.url,
        ...(progressTarget
            ? {
                  samoProgressKind: progressTarget.kind,
                  samoProgressTargetId: progressTarget.targetId,
              }
            : {}),
    };
};

export const attachNativeStreamCredentialsToQueue = (
    queue: {
        index: number;
        items: MobilePlayableAudio[];
        samoPlaylistId?: string;
    },
    serverConnection: ServerAuthenticationResult | null,
): { index: number; items: MobilePlayableAudio[] } => ({
    index: queue.index,
    items: queue.items.map((item) => {
        const credentialed = attachNativeStreamCredentials(item, serverConnection);
        // Per-item samoPlaylistId stamp so the native progress writer knows
        // when to fire the per-playlist scrobble alongside the per-track one,
        // without having to query the queue payload separately.
        if (
            queue.samoPlaylistId &&
            credentialed.samoProgressKind === 'music-track' &&
            credentialed.samoPlaylistId !== queue.samoPlaylistId
        ) {
            return { ...credentialed, samoPlaylistId: queue.samoPlaylistId };
        }
        return credentialed;
    }),
});
