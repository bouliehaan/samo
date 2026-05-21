import {
    ServerType,
    supportsServerTypeOnAndroid,
} from '@samo/core/server';

export const ANDROID_SERVER_TYPES = [
    ServerType.NAVIDROME,
    ServerType.SUBSONIC,
    ServerType.AUDIOBOOKSHELF,
].filter(supportsServerTypeOnAndroid);
