import type { SetActivity } from '@xhayper/discord-rpc';
export declare const discordRpc: {
    clearActivity: () => void;
    initialize: (clientId: string) => Promise<any>;
    isConnected: () => Promise<any>;
    quit: () => void;
    setActivity: (activity: SetActivity) => void;
};
export type DiscordRpc = typeof discordRpc;
