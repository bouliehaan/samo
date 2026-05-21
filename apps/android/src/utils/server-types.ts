import {
    ServerType,
    supportsServerTypeOnAndroid,
} from '@samo/core/server';

export const ANDROID_SERVER_TYPES = [
    ServerType.NAVIDROME,
    ServerType.SUBSONIC,
    ServerType.AUDIOBOOKSHELF,
].filter(supportsServerTypeOnAndroid);

export const ANDROID_SERVER_TYPE_LABELS: Record<ServerType, string> = {
    [ServerType.AUDIOBOOKSHELF]: 'Audiobookshelf',
    [ServerType.JELLYFIN]: 'Jellyfin',
    [ServerType.NAVIDROME]: 'Navidrome',
    [ServerType.SUBSONIC]: 'Subsonic',
};
