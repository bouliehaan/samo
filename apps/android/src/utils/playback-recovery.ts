import { type MobilePlayableAudio } from '@samo/core/mobile';

import { type AndroidNativePlaybackEvent } from '../services/audio-playback';

const toPlaybackSource = (value?: string): MobilePlayableAudio['source'] | null => {
    if (value === 'audiobook' || value === 'music' || value === 'podcast' || value === 'radio') {
        return value;
    }

    return null;
};

export const buildRecoveredPlaybackItem = (
    event: AndroidNativePlaybackEvent,
    lastPlayedItem: MobilePlayableAudio | null,
): MobilePlayableAudio | null => {
    const sourceSnapshot = event.source;
    if (
        lastPlayedItem &&
        (!sourceSnapshot?.id || sourceSnapshot.id === lastPlayedItem.id) &&
        (!sourceSnapshot?.source || sourceSnapshot.source === lastPlayedItem.source)
    ) {
        return {
            ...lastPlayedItem,
            artworkUrl: sourceSnapshot?.artworkUrl ?? lastPlayedItem.artworkUrl,
            durationSeconds:
                event.durationMs && event.durationMs > 0
                    ? event.durationMs / 1000
                    : lastPlayedItem.durationSeconds,
            subtitle: lastPlayedItem.subtitle ?? sourceSnapshot?.subtitle,
            title: lastPlayedItem.title,
        };
    }

    const source = toPlaybackSource(sourceSnapshot?.source);
    const id = sourceSnapshot?.id ?? event.sessionId;
    const title = sourceSnapshot?.title?.trim();
    if (!source || !id || !title) {
        return null;
    }

    return {
        artworkUrl: sourceSnapshot?.artworkUrl,
        durationSeconds:
            event.durationMs && event.durationMs > 0 ? event.durationMs / 1000 : undefined,
        id,
        quality: {
            deliveryKind: 'unknown',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        source,
        subtitle: sourceSnapshot?.subtitle,
        title,
        url: '',
    };
};
