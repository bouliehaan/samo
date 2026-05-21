import i18n from '/@/i18n/i18n';
import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { JellyfinController } from '/@/renderer/api/jellyfin/jellyfin-controller';
import { NavidromeController } from '/@/renderer/api/navidrome/navidrome-controller';
import { SubsonicController } from '/@/renderer/api/subsonic/subsonic-controller';
import { mergeMusicFolderId } from '/@/renderer/api/utils-music-folder';
import { getActiveMusicServer, getServerById, useAuthStore, useSettingsStore, } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';
import { ServerType, } from '/@/shared/types/domain-types';
const endpoints = {
    [ServerType.AUDIOBOOKSHELF]: audiobookshelfController,
    [ServerType.JELLYFIN]: JellyfinController,
    [ServerType.NAVIDROME]: NavidromeController,
    [ServerType.SUBSONIC]: SubsonicController,
};
const apiController = (endpoint, type) => {
    const authState = useAuthStore.getState();
    const serverType = type || getActiveMusicServer(authState)?.type;
    if (!serverType) {
        toast.error({
            message: i18n.t('error.serverNotSelectedError', {
                postProcess: 'sentenceCase',
            }),
            title: i18n.t('error.apiRouteError', { postProcess: 'sentenceCase' }),
        });
        throw new Error(`No server selected`);
    }
    const controllerFn = endpoints?.[serverType]?.[endpoint];
    if (typeof controllerFn !== 'function') {
        toast.error({
            message: `Endpoint ${endpoint} is not implemented for ${serverType}`,
            title: i18n.t('error.apiRouteError', { postProcess: 'sentenceCase' }),
        });
        throw new Error(i18n.t('error.endpointNotImplementedError', {
            endpoint,
            postProcess: 'sentenceCase',
            serverType,
        }));
    }
    return controllerFn;
};
const getPathReplaceSettings = () => {
    const { pathReplace, pathReplaceWith } = useSettingsStore.getState().general;
    return { pathReplace, pathReplaceWith };
};
const addContext = (args) => {
    const pathSettings = getPathReplaceSettings();
    return {
        ...args,
        context: {
            ...(args.context || {}),
            ...pathSettings,
        },
    };
};
const MUSIC_FOLDER_QUERY_ENDPOINTS = new Set([
    'getAlbumArtistList',
    'getAlbumArtistListCount',
    'getAlbumList',
    'getAlbumListCount',
    'getArtistList',
    'getArtistListCount',
    'getFolder',
    'getGenreList',
    'getRandomSongList',
    'getSimilarSongs',
    'getSongList',
    'getSongListCount',
    'search',
]);
const apiRouteError = (endpoint) => `${i18n.t('error.apiRouteError', { postProcess: 'sentenceCase' })}: ${endpoint}`;
const enrichEndpointArgs = (endpoint, args, server) => {
    const enriched = addContext({
        ...args,
        apiClientProps: { ...args.apiClientProps, server },
    });
    if (!MUSIC_FOLDER_QUERY_ENDPOINTS.has(endpoint) || !('query' in args)) {
        return enriched;
    }
    return {
        ...enriched,
        query: mergeMusicFolderId(args.query, server),
    };
};
export const controller = new Proxy({}, {
    get(_target, property) {
        if (property === 'authenticate') {
            return (url, body, type) => apiController('authenticate', type)(url, body);
        }
        if (typeof property !== 'string') {
            return undefined;
        }
        const endpoint = property;
        return (args) => {
            const server = getServerById(args.apiClientProps.serverId);
            if (!server) {
                if (endpoint === 'getAlbumArtistInfo') {
                    return Promise.resolve(null);
                }
                if (endpoint === 'getImageRequest' || endpoint === 'getImageUrl') {
                    return null;
                }
                throw new Error(apiRouteError(endpoint));
            }
            const fn = apiController(endpoint, server.type);
            const enriched = enrichEndpointArgs(endpoint, args, server);
            if (endpoint === 'getAlbumArtistInfo') {
                return fn ? fn(enriched) : Promise.resolve(null);
            }
            if (endpoint === 'getImageRequest' || endpoint === 'getImageUrl') {
                return fn?.(enriched) ?? null;
            }
            return fn?.(enriched);
        };
    },
});
