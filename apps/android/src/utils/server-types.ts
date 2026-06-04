import { ServerType } from '@samo/core/server';

// Samo is the only backend Android supports. Audiobookshelf / Navidrome /
// Subsonic / Jellyfin compatibility was stripped — Samo is the ecosystem now.
export const ANDROID_SERVER_TYPES = [ServerType.SAMO];

export const ANDROID_SERVER_TYPE_LABELS: Partial<Record<ServerType, string>> = {
    [ServerType.SAMO]: 'Samo',
};
