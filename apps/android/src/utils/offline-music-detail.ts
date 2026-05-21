import {
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    type MobilePlayableAudio,
} from '@samo/core/mobile';

import { listDownloads } from '../services/download-manager';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export const buildDownloadedMusicDetail = async (
    item: AndroidRecentContentSourceItem,
): Promise<MobileMediaDetail | null> => {
    if (
        !item.source ||
        (item.type !== MobileHomeItemType.ALBUM && item.type !== MobileHomeItemType.PLAYLIST)
    ) {
        return null;
    }

    const entries = (await listDownloads())
        .filter(
            (entry) =>
                entry.status === 'completed' &&
                Boolean(entry.localUri) &&
                entry.collection.sourceId === item.source!.id &&
                entry.collection.id === item.id &&
                (entry.collection.type === 'album' || entry.collection.type === 'playlist'),
        )
        .sort((left, right) => left.enqueuedAt - right.enqueuedAt);

    if (entries.length === 0) {
        return null;
    }

    const tracks: MobileMediaTrack[] = entries.map((entry, index) => {
        const playback: MobilePlayableAudio = {
            artworkUrl: item.artworkUrl ?? entry.collection.artworkUrl,
            castUrl: entry.sourceUrl,
            contentSourceId: item.source!.id,
            id: `${item.source!.id}:music:${entry.trackId}`,
            quality: {
                container: null,
                deliveryKind: 'android-direct',
                losslessRequired: true,
                serverTranscodeRequested: false,
            },
            source: 'music',
            subtitle: entry.trackSubtitle ?? item.title,
            title: entry.title,
            url: entry.localUri!,
        };

        return {
            artworkUrl: item.artworkUrl ?? entry.collection.artworkUrl,
            id: entry.trackId,
            playback,
            subtitle: entry.trackSubtitle ?? item.title,
            title: entry.title,
            trackNumber: index + 1,
        };
    });

    return {
        artworkUrl: item.artworkUrl,
        id: item.id,
        source: item.source,
        subtitle: item.subtitle,
        title: item.title,
        tracks,
        type:
            item.type === MobileHomeItemType.ALBUM
                ? MobileMediaDetailType.ALBUM
                : MobileMediaDetailType.PLAYLIST,
    };
};
