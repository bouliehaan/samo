export declare const ipc: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
    removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
};
export type Ipc = typeof ipc;
