import { authenticateServerConnection } from '@samo/core/server';
import isElectron from 'is-electron';

import i18n from '/@/i18n/i18n';
import { SamoController } from '/@/renderer/api/samo/samo-controller';
import { mergeMusicFolderId } from '/@/renderer/api/utils-music-folder';
import { getServerById, useSettingsStore } from '/@/renderer/store';
import {
    AuthenticationResponse,
    ControllerEndpoint,
    ServerType,
} from '/@/shared/types/domain-types';

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

export interface GeneralController extends Omit<ControllerEndpoint, 'authenticate'> {
    authenticate: (
        url: string,
        body: { legacy?: boolean; password: string; username: string },
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
            ) => {
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
                          type: ServerType.SAMO,
                          url,
                          username: body.username,
                      });

                return {
                    credential: result.credential,
                    isAdmin: result.isAdmin,
                    serverId: result.serverId,
                    userId: result.userId ?? null,
                    username: result.username,
                };
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

            const fn = SamoController[endpoint] as EndpointHandler | undefined;
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
