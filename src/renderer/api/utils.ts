import { useAuthStore } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';
import { ServerListItem } from '/@/shared/types/types';

export const authenticationFailure = (currentServer: null | ServerListItem) => {
    toast.error({
        message: 'Your session has expired.',
    });

    if (currentServer) {
        const serverId = currentServer.id;
        const { actions } = useAuthStore.getState();

        actions.updateServer(serverId, {});
        actions.clearActiveServer(serverId);
    }
};
