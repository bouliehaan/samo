import {
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobilePlayableAudio,
} from '@samo/core/mobile';

/** Queue a music collection in its default display order, without editing the cached detail. */
export const buildCollectionQueueItems = (
    detail: Pick<MobileMediaDetail, 'tracks' | 'type'>,
    shuffled = false,
): MobilePlayableAudio[] => {
    const items = detail.tracks.flatMap((track) =>
        track.playback && track.playback.source !== 'radio' ? [track.playback] : [],
    );

    // Playlist entries arrive oldest first; the playlist screen defaults to newest first.
    if (detail.type === MobileMediaDetailType.PLAYLIST) {
        items.reverse();
    }

    if (shuffled) {
        for (let i = items.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j]!, items[i]!];
        }
    }

    return items;
};
