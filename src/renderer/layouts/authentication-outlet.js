import { jsx as _jsx } from "react/jsx-runtime";
import { Outlet } from 'react-router';
import { useServerAuthenticated } from '/@/renderer/hooks/use-server-authenticated';
import { useAuthHydrated } from '/@/renderer/store';
import { Center } from '/@/shared/components/center/center';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { AuthState } from '/@/shared/types/types';
export const AuthenticationOutlet = () => {
    const authHydrated = useAuthHydrated();
    const authState = useServerAuthenticated();
    if (!authHydrated || authState === AuthState.LOADING) {
        return (_jsx(Center, { h: "100vh", w: "100%", children: _jsx(Spinner, { container: true }) }));
    }
    return _jsx(Outlet, {});
};
