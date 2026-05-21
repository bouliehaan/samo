import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
export declare const mergeMusicFolderId: <T extends {
    musicFolderId?: string | string[];
}>(query: T, server: null | ServerListItemWithCredential) => T;
