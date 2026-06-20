import { ServerType } from './server-types';

export enum ServerContentCapability {
    ALBUMS = 'albums',
    AUDIOBOOKS = 'audiobooks',
    MUSIC = 'music',
    PLAYLISTS = 'playlists',
    PODCASTS = 'podcasts',
    RADIO = 'radio',
    SEARCH = 'search',
}

export interface ServerCapabilities {
    content: ServerContentCapability[];
    search: ServerContentCapability[];
}

export interface ServerCapabilityLibrary {
    mediaType?: string;
}

const MUSIC_CAPABILITIES = [
    ServerContentCapability.ALBUMS,
    ServerContentCapability.MUSIC,
    ServerContentCapability.PLAYLISTS,
    ServerContentCapability.RADIO,
    ServerContentCapability.SEARCH,
];

const dedupeCapabilities = (capabilities: ServerContentCapability[]) => {
    return [...new Set(capabilities)];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const toContentCapability = (value: unknown) => {
    return Object.values(ServerContentCapability).includes(value as ServerContentCapability)
        ? (value as ServerContentCapability)
        : null;
};

const parseCapabilityList = (value: unknown, fallback: ServerContentCapability[]) => {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const capabilities = value.flatMap((candidate) => {
        const capability = toContentCapability(candidate);

        return capability ? [capability] : [];
    });

    return capabilities;
};

export const getDefaultServerCapabilities = (type: ServerType): ServerCapabilities => {
    if (type === ServerType.SAMO) {
        return {
            content: [
                ...MUSIC_CAPABILITIES,
                ServerContentCapability.AUDIOBOOKS,
                ServerContentCapability.PODCASTS,
            ],
            search: [
                ...MUSIC_CAPABILITIES,
                ServerContentCapability.AUDIOBOOKS,
                ServerContentCapability.PODCASTS,
            ],
        };
    }

    return {
        content: [],
        search: [],
    };
};

export const normalizeServerCapabilities = (
    capabilities: unknown,
    type: ServerType,
): ServerCapabilities => {
    const fallback = getDefaultServerCapabilities(type);
    const value = isRecord(capabilities) ? capabilities : {};

    return {
        content: dedupeCapabilities(parseCapabilityList(value.content, fallback.content)),
        search: dedupeCapabilities(parseCapabilityList(value.search, fallback.search)),
    };
};

export const formatServerCapabilities = (capabilities: ServerCapabilities) => {
    const labels: Record<ServerContentCapability, string> = {
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
