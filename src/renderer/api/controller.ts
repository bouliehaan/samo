import { authenticateServerConnection } from '@samo/core/server';
import isElectron from 'is-electron';

import i18n from '/@/i18n/i18n';
import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { JellyfinController } from '/@/renderer/api/jellyfin/jellyfin-controller';
import { SamoController } from '/@/renderer/api/samo/samo-controller';
import { mergeMusicFolderId } from '/@/renderer/api/utils-music-folder';
import {
    getActiveMusicServer,
    getServerById,
    useAuthStore,
    useSettingsStore,
} from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';
import {
    AuthenticationResponse,
    ControllerEndpoint,
    InternalControllerEndpoint,
    ServerType,
} from '/@/shared/types/domain-types';

type ApiController = Partial<Record<ServerType, Partial<InternalControllerEndpoint>>>;

const endpoints: ApiController = {
    [ServerType.AUDIOBOOKSHELF]: audiobookshelfController,
    [ServerType.JELLYFIN]: JellyfinController,
    [ServerType.SAMO]: SamoController as Partial<InternalControllerEndpoint>,
};

const apiController = <K extends keyof ControllerEndpoint>(
    endpoint: K,
    type?: ServerType,
): NonNullable<InternalControllerEndpoint[K]> => {
    const authState = useAuthStore.getState();
    const serverType = type || getActiveMusicServer(authState)?.type;

    if (!serverType) {
        toast.error({
            message: i18n.t('error.serverNotSelectedError', {
                postProcess: 'sentenceCase',
            }) as string,
            title: i18n.t('error.apiRouteError', { postProcess: 'sentenceCase' }) as string,
        });
        throw new Error(`No server selected`);
    }

    const controllerFn = endpoints?.[serverType]?.[endpoint];

    if (typeof controllerFn !== 'function') {
        toast.error({
            message: `Endpoint ${endpoint} is not implemented for ${serverType}`,
            title: i18n.t('error.apiRouteError', { postProcess: 'sentenceCase' }) as string,
        });

        throw new Error(
            i18n.t('error.endpointNotImplementedError', {
                endpoint,
                postProcess: 'sentenceCase',
                serverType,
            }) as string,
        );
    }

    return controllerFn as NonNullable<InternalControllerEndpoint[K]>;
};

const getPathReplaceSettings = () => {
    const { pathReplace, pathReplaceWith } = useSettingsStore.getState().general;
    return { pathReplace, pathReplaceWith };
};

const addContext = <T extends { apiClientProps: unknown; context?: unknown }>(args: T): T => {
    const pathSettings = getPathReplaceSettings();

    return {
        ...args,
        context: {
            ...((args.context as object) || {}),
            ...pathSettings,
        },
    };
};

const MUSIC_FOLDER_QUERY_ENDPOINTS = new Set<keyof ControllerEndpoint>([
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

const apiRouteError = (endpoint: string) =>
    `${i18n.t('error.apiRouteError', { postProcess: 'sentenceCase' })}: ${endpoint}`;

const enrichEndpointArgs = <T extends { apiClientProps: { serverId: string }; query?: unknown }>(
    endpoint: ServerBoundEndpoint,
    args: T,
    server: NonNullable<ReturnType<typeof getServerById>>,
) => {
    const enriched = addContext({
        ...args,
        apiClientProps: { ...args.apiClientProps, server },
    });

    if (!MUSIC_FOLDER_QUERY_ENDPOINTS.has(endpoint) || !('query' in args)) {
        return enriched;
    }

    return {
        ...enriched,
        query: mergeMusicFolderId(args.query as { musicFolderId?: string | string[] }, server),
    };
};

export interface GeneralController extends Omit<Required<ControllerEndpoint>, 'authenticate'> {
    authenticate: (
        url: string,
        body: { legacy?: boolean; password: string; username: string },
        type: ServerType,
    ) => Promise<AuthenticationResponse>;
}

type EndpointHandler = (args: unknown) => unknown;

type ServerBoundEndpoint = Exclude<keyof ControllerEndpoint, 'authenticate'>;

export const controller = new Proxy({} as GeneralController, {
    get(_target, property) {
        if (property === 'authenticate') {
            return async (
                url: string,
                body: { legacy?: boolean; password: string; username: string },
                type: ServerType,
            ) => {
                if (type === ServerType.SAMO) {
                    const result = isElectron()
                        ? await window.api.samo.authenticate({
                              deviceLabel: 'Samo desktop',
                              password: body.password,
                              url,
                              username: body.username,
                          })
                        : await authenticateServerConnection({
                              deviceLabel: 'Samo desktop',
                              password: body.password,
                              type,
                              url,
                              username: body.username,
                          });

                    return {
                        credential: result.credential,
                        isAdmin: result.isAdmin,
                        userId: result.userId ?? null,
                        username: result.username,
                    };
                }

                return apiController('authenticate', type)(url, body);
            };
        }

        if (typeof property !== 'string') {
            return undefined;
        }

        const endpoint = property as ServerBoundEndpoint;

        return (args: { apiClientProps: { serverId: string }; query?: unknown }) => {
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

            const fn = apiController(endpoint, server.type) as EndpointHandler | undefined;
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
}) as GeneralController;
