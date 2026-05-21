import { initClient, initContract } from '@ts-rest/core';
import axios, { isAxiosError } from 'axios';
import isElectron from 'is-electron';
import debounce from 'lodash/debounce';
import omitBy from 'lodash/omitBy';
import qs from 'qs';
import i18n from '/@/i18n/i18n';
import { authenticationFailure } from '/@/renderer/api/utils';
import { useAuthStore } from '/@/renderer/store';
import { getServerUrl } from '/@/renderer/utils/normalize-server-url';
import { ndType } from '/@/shared/api/navidrome/navidrome-types';
import { resultWithHeaders } from '/@/shared/api/utils';
import { toast } from '/@/shared/components/toast/toast';
import { ServerType } from '/@/shared/types/domain-types';
import { logFn } from '/@/renderer/utils/logger';
const localSettings = isElectron() ? window.api.localSettings : null;
const c = initContract();
export const contract = c.router({
    addToPlaylist: {
        body: ndType._parameters.addToPlaylist,
        method: 'POST',
        path: 'playlist/:id/tracks',
        responses: {
            200: resultWithHeaders(ndType._response.addToPlaylist),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    authenticate: {
        body: ndType._parameters.authenticate,
        method: 'POST',
        path: 'auth/login',
        responses: {
            200: resultWithHeaders(ndType._response.authenticate),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    createPlaylist: {
        body: ndType._parameters.createPlaylist,
        method: 'POST',
        path: 'playlist',
        responses: {
            200: resultWithHeaders(ndType._response.createPlaylist),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    deleteArtistImage: {
        body: null,
        method: 'DELETE',
        path: 'artist/:id/image',
        responses: {
            200: resultWithHeaders(ndType._response.deleteArtistImage),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    deleteInternetRadioStation: {
        body: null,
        method: 'DELETE',
        path: 'radio/:id',
        responses: {
            200: resultWithHeaders(ndType._response.deleteInternetRadioStation),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    deleteInternetRadioStationImage: {
        body: null,
        method: 'DELETE',
        path: 'radio/:id/image',
        responses: {
            200: resultWithHeaders(ndType._response.deleteInternetRadioStationImage),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    deletePlaylist: {
        body: null,
        method: 'DELETE',
        path: 'playlist/:id',
        responses: {
            200: resultWithHeaders(ndType._response.deletePlaylist),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    deletePlaylistImage: {
        body: null,
        method: 'DELETE',
        path: 'playlist/:id/image',
        responses: {
            200: resultWithHeaders(ndType._response.deletePlaylistImage),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getAlbumArtistDetail: {
        method: 'GET',
        path: 'artist/:id',
        responses: {
            200: resultWithHeaders(ndType._response.albumArtist),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getAlbumArtistList: {
        method: 'GET',
        path: 'artist',
        query: ndType._parameters.albumArtistList,
        responses: {
            200: resultWithHeaders(ndType._response.albumArtistList),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getAlbumDetail: {
        method: 'GET',
        path: 'album/:id',
        responses: {
            200: resultWithHeaders(ndType._response.album),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getAlbumList: {
        method: 'GET',
        path: 'album',
        query: ndType._parameters.albumList,
        responses: {
            200: resultWithHeaders(ndType._response.albumList),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getGenreList: {
        method: 'GET',
        path: 'genre',
        query: ndType._parameters.genreList,
        responses: {
            200: resultWithHeaders(ndType._response.genreList),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getPlaylistDetail: {
        method: 'GET',
        path: 'playlist/:id',
        responses: {
            200: resultWithHeaders(ndType._response.playlist),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getPlaylistList: {
        method: 'GET',
        path: 'playlist',
        query: ndType._parameters.playlistList,
        responses: {
            200: resultWithHeaders(ndType._response.playlistList),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getPlaylistSongList: {
        method: 'GET',
        path: 'playlist/:id/tracks',
        query: ndType._parameters.songList,
        responses: {
            200: resultWithHeaders(ndType._response.playlistSongList),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getQueue: {
        method: 'GET',
        path: 'queue',
        responses: {
            200: resultWithHeaders(ndType._response.queue),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getRadioList: {
        method: 'GET',
        path: 'radio',
        query: ndType._parameters.radioList,
        responses: {
            200: resultWithHeaders(ndType._response.radioList),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getSongDetail: {
        method: 'GET',
        path: 'song/:id',
        responses: {
            200: resultWithHeaders(ndType._response.song),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getSongList: {
        method: 'GET',
        path: 'song',
        query: ndType._parameters.songList,
        responses: {
            200: resultWithHeaders(ndType._response.songList),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getTagList: {
        method: 'GET',
        path: 'tag',
        query: ndType._parameters.tagList,
        responses: {
            200: resultWithHeaders(ndType._response.tagList),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    getUserList: {
        method: 'GET',
        path: 'user',
        query: ndType._parameters.userList,
        responses: {
            200: resultWithHeaders(ndType._response.userList),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    movePlaylistItem: {
        body: ndType._parameters.moveItem,
        method: 'PUT',
        path: 'playlist/:playlistId/tracks/:trackNumber',
        responses: {
            200: resultWithHeaders(ndType._response.moveItem),
            400: resultWithHeaders(ndType._response.error),
        },
    },
    removeFromPlaylist: {
        body: null,
        method: 'DELETE',
        path: 'playlist/:id/tracks',
        query: ndType._parameters.removeFromPlaylist,
        responses: {
            200: resultWithHeaders(ndType._response.removeFromPlaylist),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    saveQueue: {
        body: ndType._parameters.saveQueue,
        method: 'POST',
        path: 'queue',
        responses: {
            200: resultWithHeaders(ndType._response.saveQueue),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    shareItem: {
        body: ndType._parameters.shareItem,
        method: 'POST',
        path: 'share',
        responses: {
            200: resultWithHeaders(ndType._response.shareItem),
            404: resultWithHeaders(ndType._response.error),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    updateInternetRadioStation: {
        body: ndType._parameters.updateInternetRadioStation,
        method: 'PUT',
        path: 'radio/:id',
        responses: {
            200: resultWithHeaders(ndType._response.updateInternetRadioStation),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    updatePlaylist: {
        body: ndType._parameters.updatePlaylist,
        method: 'PUT',
        path: 'playlist/:id',
        responses: {
            200: resultWithHeaders(ndType._response.updatePlaylist),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    uploadArtistImage: {
        body: ndType._parameters.uploadArtistImage,
        method: 'POST',
        path: 'artist/:id/image',
        responses: {
            200: resultWithHeaders(ndType._response.uploadArtistImage),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    uploadInternetRadioStationImage: {
        body: ndType._parameters.uploadInternetRadioStationImage,
        method: 'POST',
        path: 'radio/:id/image',
        responses: {
            200: resultWithHeaders(ndType._response.uploadInternetRadioStationImage),
            500: resultWithHeaders(ndType._response.error),
        },
    },
    uploadPlaylistImage: {
        body: ndType._parameters.uploadPlaylistImage,
        method: 'POST',
        path: 'playlist/:id/image',
        responses: {
            200: resultWithHeaders(ndType._response.uploadPlaylistImage),
            500: resultWithHeaders(ndType._response.error),
        },
    },
});
const axiosClient = axios.create({});
axiosClient.defaults.paramsSerializer = (params) => {
    return qs.stringify(params, { arrayFormat: 'repeat' });
};
const parsePath = (fullPath) => {
    const [path, params] = fullPath.split('?');
    const parsedParams = qs.parse(params);
    // Convert indexed object to array
    const newParams = {};
    Object.keys(parsedParams).forEach((key) => {
        const isIndexedArrayObject = typeof parsedParams[key] === 'object' &&
            Object.keys(parsedParams[key] || {}).includes('0');
        if (!isIndexedArrayObject) {
            newParams[key] = parsedParams[key];
        }
        else {
            newParams[key] = Object.values(parsedParams[key] || {});
        }
    });
    const notNilParams = omitBy(newParams, (value) => value === 'undefined' || value === 'null');
    return {
        params: notNilParams,
        path,
    };
};
const RETRY_DELAY_MS = 1000;
const limitedFail = debounce(authenticationFailure, RETRY_DELAY_MS);
const TIMEOUT_ERROR = Error();
const REQUEST_SERVER_ID_KEY = '__samoNavidromeServerId';
const navidromeReauthLocks = new Map();
const getRequestServerId = (config) => {
    if (!config || typeof config !== 'object')
        return undefined;
    return config[REQUEST_SERVER_ID_KEY];
};
const getRequestServer = (config) => {
    const serverId = getRequestServerId(config);
    const server = serverId ? useAuthStore.getState().actions.getServer(serverId) : null;
    if (server?.type === ServerType.NAVIDROME) {
        return server;
    }
    return null;
};
const setRequestCredential = (config, credential) => {
    if (!credential)
        return;
    config.headers = {
        ...config.headers,
        'x-nd-authorization': `Bearer ${credential}`,
    };
};
const clearServerCredentials = (serverId) => {
    const { actions } = useAuthStore.getState();
    actions.updateServer(serverId, {
        credential: undefined,
        ndCredential: undefined,
    });
    actions.clearActiveServer(serverId);
};
const reauthenticateNavidromeServer = async (requestServer) => {
    if (!localSettings || !requestServer.savePassword) {
        throw new Error('Navidrome reauthentication is unavailable for this server');
    }
    const password = await localSettings.passwordGet(requestServer.id);
    if (password === null) {
        throw new Error('Saved Navidrome password was not found');
    }
    const serverUrl = getServerUrl(requestServer);
    if (!serverUrl) {
        throw new Error('Navidrome server URL is invalid');
    }
    const res = await axios.post(`${serverUrl}/auth/login`, {
        password,
        username: requestServer.username,
    }, { validateStatus: () => true });
    if (res.status === 429) {
        toast.error({
            message: i18n.t('error.loginRateError', {
                postProcess: 'sentenceCase',
            }),
            title: i18n.t('error.sessionExpiredError', {
                postProcess: 'sentenceCase',
            }),
        });
        clearServerCredentials(requestServer.id);
        limitedFail.cancel();
        throw TIMEOUT_ERROR;
    }
    if (res.status !== 200) {
        throw new Error(i18n.t('error.authenticatedFailed', {
            postProcess: 'sentenceCase',
        }));
    }
    const newCredential = res.data.token;
    const subsonicCredential = `u=${requestServer.username}&s=${res.data.subsonicSalt}&t=${res.data.subsonicToken}`;
    useAuthStore.getState().actions.updateServer(requestServer.id, {
        credential: subsonicCredential,
        ndCredential: newCredential,
    });
    return newCredential;
};
const getNavidromeReauthLock = (requestServer) => {
    const existingLock = navidromeReauthLocks.get(requestServer.id);
    if (existingLock) {
        return existingLock;
    }
    const lock = reauthenticateNavidromeServer(requestServer).finally(() => {
        if (navidromeReauthLocks.get(requestServer.id) === lock) {
            navidromeReauthLocks.delete(requestServer.id);
        }
    });
    navidromeReauthLocks.set(requestServer.id, lock);
    return lock;
};
axiosClient.interceptors.response.use((response) => {
    const serverId = getRequestServerId(response.config);
    if (serverId) {
        const headerCredential = response.headers['x-nd-authorization'];
        if (headerCredential) {
            useAuthStore.getState().actions.updateServer(serverId, {
                ndCredential: headerCredential,
            });
        }
    }
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        const requestServer = getRequestServer(error.config);
        if (localSettings && requestServer?.savePassword) {
            return getNavidromeReauthLock(requestServer)
                .then((newCredential) => {
                setRequestCredential(error.config, newCredential);
                return axiosClient.request(error.config);
            })
                .catch((newError) => {
                if (newError !== TIMEOUT_ERROR) {
                    logFn.error('Error when trying to reauthenticate', { meta: { error: newError } });
                    if (isAxiosError(newError) && newError.code === 'ERR_NETWORK') {
                        logFn.info('Network error during reauthentication - preserving credentials');
                    }
                    else {
                        limitedFail(requestServer);
                    }
                }
                // make sure to pass the error so axios will error later on
                throw newError;
            });
        }
        if (isAxiosError(error) && error.code === 'ERR_NETWORK') {
            logFn.info('Network error during authentication - preserving credentials');
        }
        else {
            limitedFail(requestServer);
        }
    }
    return Promise.reject(error);
});
export const ndApiClient = (args) => {
    const { server, signal, url } = args;
    return initClient(contract, {
        api: async ({ body, headers, method, path }) => {
            let baseUrl;
            const { params, path: api } = parsePath(path);
            if (server) {
                const serverUrl = getServerUrl(server);
                baseUrl = serverUrl ? `${serverUrl}/api` : undefined;
            }
            else {
                baseUrl = url;
            }
            try {
                const latestServer = server?.id
                    ? (useAuthStore.getState().actions.getServer(server.id) ?? server)
                    : server;
                const pendingReauth = server?.id ? navidromeReauthLocks.get(server.id) : undefined;
                const reauthToken = pendingReauth
                    ? await pendingReauth.catch(() => undefined)
                    : undefined;
                const token = reauthToken ?? latestServer?.ndCredential ?? server?.ndCredential;
                const requestConfig = {
                    data: body,
                    headers: {
                        ...headers,
                        ...(token && { 'x-nd-authorization': `Bearer ${token}` }),
                    },
                    method: method,
                    params,
                    signal,
                    url: `${baseUrl}/${api}`,
                };
                if (server?.id) {
                    requestConfig[REQUEST_SERVER_ID_KEY] = server.id;
                }
                const result = await axiosClient.request(requestConfig);
                return {
                    body: { data: result.data, headers: result.headers },
                    headers: result.headers,
                    status: result.status,
                };
            }
            catch (e) {
                if (isAxiosError(e)) {
                    if (e.code === 'ERR_NETWORK') {
                        throw new Error(i18n.t('error.networkError', {
                            postProcess: 'sentenceCase',
                        }));
                    }
                    const error = e;
                    const response = error.response;
                    return {
                        body: { data: response?.data, headers: response?.headers },
                        headers: response?.headers,
                        status: response?.status,
                    };
                }
                throw e;
            }
        },
        baseHeaders: {
            'Content-Type': 'application/json',
        },
        baseUrl: '',
        jsonQuery: false,
    });
};
