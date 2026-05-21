import { ServerListItem } from '/@/shared/types/domain-types';
export declare const normalizeServerUrl: (url: string) => string;
export declare const getServerUrl: (server: null | ServerListItem | undefined, forceRemoteUrl?: boolean) => string | undefined;
