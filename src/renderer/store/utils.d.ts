import type { QueueData } from '/@/shared/types/domain-types';
import type { PersistStorage, StateStorage } from 'zustand/middleware';
export declare function cleanQueueForPersistence(queue: QueueData): QueueData;
export declare function migratePlayerStorePersist(storeName: string): Promise<void>;
export declare function setPlayerStoreHydratedForPersistence(value: boolean): void;
export declare const playerStoreStorage: PersistStorage<unknown>;
/**
 * A custom deep merger that will replace all 'columns' items with the persistent
 * state, instead of the default merge behavior. This is important to preserve the user's
 * order, and not lead to an inconsistent state (e.g. multiple 'Favorite' keys)
 * @param persistedState the persistent state
 * @param currentState the current state
 * @returns the a custom deep merge
 */
export declare const mergeOverridingColumns: <T>(persistedState: unknown, currentState: T) => T;
export declare const idbStateStorage: StateStorage;
export declare const splitSettingsStorage: StateStorage;
