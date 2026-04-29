import { useAuthStore } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';
import { ServerListItem } from '/@/shared/types/types';

export const authenticationFailure = (currentServer: null | ServerListItem) => {
    toast.error({
        message: 'Your session has expired.',
    });

    if (currentServer) {
        const serverId = currentServer.id;
        const token = currentServer.ndCredential;
        console.error(`token is expired: ${token}`);
        const { actions, currentServer: activeServer } = useAuthStore.getState();

        actions.updateServer(serverId, { ndCredential: undefined });

        if (activeServer?.id === serverId) {
            actions.setCurrentServer(null);
        }
    }
};
