import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router';
import { shallow } from 'zustand/shallow';

import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { AppRoute } from '/@/renderer/router/routes';
import {
    getConfiguredMusicServer,
    useAuthHydrated,
    useAuthStore,
    useAuthStoreActions,
} from '/@/renderer/store';

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

export const AppOutlet = () => {
    const authHydrated = useAuthHydrated();
    const { ensureActiveServers } = useAuthStoreActions();
    const configuredMusicServer = useAuthStore((state) => {
        const server = getConfiguredMusicServer(state);

        return server
            ? {
                  id: server.id,
                  url: server.url,
              }
            : null;
    }, shallow);

    useEffect(() => {
        if (authHydrated) {
            ensureActiveServers();
        }
    }, [authHydrated, ensureActiveServers]);

    const hasServerLockMismatch =
        isServerLock() &&
        configuredMusicServer &&
        window.SERVER_URL &&
        normalizeUrl(window.SERVER_URL) !== 'http:/' &&
        normalizeUrl(window.SERVER_URL) !== 'https:/' &&
        normalizeUrl(window.SERVER_URL) !== normalizeUrl(configuredMusicServer.url);

    const isActionsRequired = !authHydrated || !configuredMusicServer || hasServerLockMismatch;

    if (isActionsRequired) {
        return <Navigate replace to={AppRoute.ACTION_REQUIRED} />;
    }

    return <Outlet />;
};
