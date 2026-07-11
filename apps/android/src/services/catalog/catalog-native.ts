import { NativeModules } from 'react-native';

// Typed seam over the SamoCatalogQuery native module — the ONLY doorway to
// `samo-catalog.db`, which Kotlin owns outright (writer: SamoCatalogWriter,
// FTS index: SamoCatalogSearch, reader: SamoCatalogDb). Every query executes
// on the module's background executor, so the JS thread never touches SQLite;
// this replaced the expo-sqlite layer whose synchronous render-path reads
// (250ms busy-timeout per statement against a mid-sync writer) were the
// navigation-stall class.
//
// All wrappers are fail-soft: a missing module (unit tests, a stale native
// build) or a rejected call degrades to empty results, exactly like the old
// cold-reader behavior, so callers keep their network fallbacks.

interface SamoCatalogQueryNativeModule {
    getDetail(sourceId: string, cacheKey: string): Promise<null | string>;
    getItemById(sourceId: string, type: string, id: string): Promise<null | string>;
    getItemsByType(
        sourceId: string,
        type: string,
        options: {
            direction?: string;
            limit?: number;
            offset?: number;
            sort?: string;
        },
    ): Promise<string[]>;
    getSyncStates(): Promise<NativeCatalogSyncStateRow[]>;
    getTracks(
        sourceId: string,
        containerType: string,
        containerId: string,
        limit: number,
    ): Promise<string[]>;
    search(
        query: string,
        sourceId: null | string,
        limit: number,
    ): Promise<Array<{ payload: string; type: string }>>;
}

export interface NativeCatalogSyncStateRow {
    detailCount: number;
    error?: string;
    itemCount: number;
    lastAttemptAt?: number;
    lastSyncedAt?: number;
    sourceId: string;
    status: string;
    trackCount: number;
    updatedAt: number;
}

const nativeModule: SamoCatalogQueryNativeModule | undefined =
    NativeModules.SamoCatalogQuery as SamoCatalogQueryNativeModule | undefined;

let warnedMissing = false;
const requireModule = (): SamoCatalogQueryNativeModule | null => {
    if (!nativeModule) {
        if (!warnedMissing) {
            warnedMissing = true;
            // eslint-disable-next-line no-console
            console.warn('[catalog] SamoCatalogQuery native module missing — mirror reads disabled');
        }
        return null;
    }
    return nativeModule;
};

export const nativeGetItemsByType = async (
    sourceId: string,
    type: string,
    options: { direction?: string; limit?: number; offset?: number; sort?: string },
): Promise<string[]> => {
    const module = requireModule();
    if (!module) return [];
    try {
        return await module.getItemsByType(sourceId, type, options);
    } catch {
        return [];
    }
};

export const nativeGetItemById = async (
    sourceId: string,
    type: string,
    id: string,
): Promise<null | string> => {
    const module = requireModule();
    if (!module) return null;
    try {
        return await module.getItemById(sourceId, type, id);
    } catch {
        return null;
    }
};

export const nativeGetDetail = async (
    sourceId: string,
    cacheKey: string,
): Promise<null | string> => {
    const module = requireModule();
    if (!module) return null;
    try {
        return await module.getDetail(sourceId, cacheKey);
    } catch {
        return null;
    }
};

export const nativeGetTracks = async (
    sourceId: string,
    containerType: string,
    containerId: string,
    limit?: number,
): Promise<string[]> => {
    const module = requireModule();
    if (!module) return [];
    try {
        // SQLite reads LIMIT -1 as "no limit".
        return await module.getTracks(sourceId, containerType, containerId, limit ?? -1);
    } catch {
        return [];
    }
};

export const nativeSearch = async (
    query: string,
    sourceId: null | string,
    limit: number,
): Promise<Array<{ payload: string; type: string }>> => {
    const module = requireModule();
    if (!module) return [];
    try {
        return await module.search(query, sourceId, limit);
    } catch {
        return [];
    }
};

export const nativeGetSyncStates = async (): Promise<NativeCatalogSyncStateRow[]> => {
    const module = requireModule();
    if (!module) return [];
    try {
        return await module.getSyncStates();
    } catch {
        return [];
    }
};
