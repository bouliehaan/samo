import { Client, SetActivity } from '@xhayper/discord-rpc';
export declare const discordRpc: {
    clearActivity: () => void;
    createClient: (clientId?: string) => Promise<Client>;
    isConnected: () => boolean | undefined;
    quit: () => void;
    setActivity: (activity: SetActivity) => void;
};
