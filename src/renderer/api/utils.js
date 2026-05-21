import { useAuthStore } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';
export const authenticationFailure = (currentServer) => {
    toast.error({
        message: 'Your session has expired.',
    });
    if (currentServer) {
        const serverId = currentServer.id;
        const { actions } = useAuthStore.getState();
        actions.updateServer(serverId, { ndCredential: undefined });
        actions.clearActiveServer(serverId);
    }
};
