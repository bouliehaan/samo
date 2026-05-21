import { DiscoveredServerItem } from '../shared/types/types';
export declare const autodiscover: {
    discover: (onReply: (server: DiscoveredServerItem) => void) => Promise<void>;
};
export type AutoDiscover = typeof autodiscover;
