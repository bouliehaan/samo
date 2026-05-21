import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo } from 'react';
import { Navigate, Outlet } from 'react-router';
import { shallow } from 'zustand/shallow';
import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { AppRoute } from '/@/renderer/router/routes';
import { getActiveMusicServer, useAuthStore, useAuthStoreActions } from '/@/renderer/store';
const normalizeUrl = (url) => url.replace(/\/$/, '');
export const AppOutlet = () => {
    const activeMusicServer = useAuthStore((state) => {
        const server = getActiveMusicServer(state);
        return server
            ? {
                id: server.id,
                url: server.url,
            }
            : null;
    }, shallow);
    const { deleteServer, setCurrentServer } = useAuthStoreActions();
    const hasServerLockMismatch = useMemo(() => {
        if (!isServerLock() || !activeMusicServer || !window.SERVER_URL) {
            return false;
        }
        const configuredUrl = normalizeUrl(window.SERVER_URL);
        const persistedUrl = normalizeUrl(activeMusicServer.url);
        return configuredUrl !== persistedUrl;
    }, [activeMusicServer]);
    useEffect(() => {
        if (hasServerLockMismatch && activeMusicServer) {
            deleteServer(activeMusicServer.id);
            setCurrentServer(null);
        }
    }, [activeMusicServer, deleteServer, hasServerLockMismatch, setCurrentServer]);
    const isActionsRequired = !activeMusicServer || hasServerLockMismatch;
    if (isActionsRequired) {
        return _jsx(Navigate, { replace: true, to: AppRoute.ACTION_REQUIRED });
    }
    return _jsx(Outlet, {});
};
