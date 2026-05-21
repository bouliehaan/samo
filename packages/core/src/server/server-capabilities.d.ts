import { ServerType } from './server-types';
export declare enum ServerContentCapability {
    ALBUMS = "albums",
    AUDIOBOOKS = "audiobooks",
    MUSIC = "music",
    PLAYLISTS = "playlists",
    PODCASTS = "podcasts",
    RADIO = "radio",
    SEARCH = "search"
}
export interface ServerCapabilities {
    content: ServerContentCapability[];
    search: ServerContentCapability[];
}
export interface ServerCapabilityLibrary {
    mediaType?: string;
}
export declare const getDefaultServerCapabilities: (type: ServerType) => ServerCapabilities;
export declare const getAudiobookshelfCapabilitiesFromLibraries: (libraries: ServerCapabilityLibrary[]) => ServerCapabilities;
export declare const normalizeServerCapabilities: (capabilities: unknown, type: ServerType) => ServerCapabilities;
export declare const formatServerCapabilities: (capabilities: ServerCapabilities) => string;
