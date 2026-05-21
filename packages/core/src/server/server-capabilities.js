import { ServerType } from './server-types';
export var ServerContentCapability;
(function (ServerContentCapability) {
    ServerContentCapability["ALBUMS"] = "albums";
    ServerContentCapability["AUDIOBOOKS"] = "audiobooks";
    ServerContentCapability["MUSIC"] = "music";
    ServerContentCapability["PLAYLISTS"] = "playlists";
    ServerContentCapability["PODCASTS"] = "podcasts";
    ServerContentCapability["RADIO"] = "radio";
    ServerContentCapability["SEARCH"] = "search";
})(ServerContentCapability || (ServerContentCapability = {}));
const MUSIC_CAPABILITIES = [
    ServerContentCapability.ALBUMS,
    ServerContentCapability.MUSIC,
    ServerContentCapability.PLAYLISTS,
    ServerContentCapability.RADIO,
    ServerContentCapability.SEARCH,
];
const dedupeCapabilities = (capabilities) => {
    return [...new Set(capabilities)];
};
const isRecord = (value) => {
    return typeof value === 'object' && value !== null;
};
const toContentCapability = (value) => {
    return Object.values(ServerContentCapability).includes(value)
        ? value
        : null;
};
const parseCapabilityList = (value, fallback) => {
    if (!Array.isArray(value)) {
        return fallback;
    }
    const capabilities = value.flatMap((candidate) => {
        const capability = toContentCapability(candidate);
        return capability ? [capability] : [];
    });
    return capabilities;
};
export const getDefaultServerCapabilities = (type) => {
    if (type === ServerType.AUDIOBOOKSHELF) {
        return {
            content: [ServerContentCapability.AUDIOBOOKS, ServerContentCapability.PODCASTS],
            search: [ServerContentCapability.AUDIOBOOKS, ServerContentCapability.PODCASTS],
        };
    }
    if (type === ServerType.NAVIDROME || type === ServerType.SUBSONIC) {
        return {
            content: MUSIC_CAPABILITIES,
            search: MUSIC_CAPABILITIES,
        };
    }
    return {
        content: [],
        search: [],
    };
};
export const getAudiobookshelfCapabilitiesFromLibraries = (libraries) => {
    const libraryMediaTypes = new Set(libraries.map((library) => library.mediaType));
    const content = [];
    if (libraryMediaTypes.has('book')) {
        content.push(ServerContentCapability.AUDIOBOOKS);
    }
    if (libraryMediaTypes.has('podcast')) {
        content.push(ServerContentCapability.PODCASTS);
    }
    return {
        content,
        search: [...content],
    };
};
export const normalizeServerCapabilities = (capabilities, type) => {
    const fallback = getDefaultServerCapabilities(type);
    const value = isRecord(capabilities) ? capabilities : {};
    return {
        content: dedupeCapabilities(parseCapabilityList(value.content, fallback.content)),
        search: dedupeCapabilities(parseCapabilityList(value.search, fallback.search)),
    };
};
export const formatServerCapabilities = (capabilities) => {
    const labels = {
        [ServerContentCapability.ALBUMS]: 'albums',
        [ServerContentCapability.AUDIOBOOKS]: 'audiobooks',
        [ServerContentCapability.MUSIC]: 'music',
        [ServerContentCapability.PLAYLISTS]: 'playlists',
        [ServerContentCapability.PODCASTS]: 'podcasts',
        [ServerContentCapability.RADIO]: 'radio',
        [ServerContentCapability.SEARCH]: 'search',
    };
    const contentLabels = capabilities.content.map((capability) => labels[capability]);
    return contentLabels.length > 0 ? contentLabels.join(', ') : 'no visible libraries';
};
