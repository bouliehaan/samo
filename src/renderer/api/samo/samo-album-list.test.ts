import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    // The controller's imports reach stores that read localStorage at load.
    const memory = new Map<string, string>();
    Object.assign(globalThis, {
        localStorage: {
            getItem: (key: string) => memory.get(key) ?? null,
            removeItem: (key: string) => memory.delete(key),
            setItem: (key: string, value: string) => memory.set(key, value),
        },
    });
    return { listAlbums: vi.fn() };
});

vi.mock('/@/renderer/utils/sanitize', () => ({}));
// The player store persists to IndexedDB, which Node has none of.
vi.mock('idb-keyval', () => ({ del: vi.fn(), delMany: vi.fn(), get: vi.fn(), set: vi.fn() }));
vi.mock('@samo/core/server', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@samo/core/server')>()),
    listSamoMusicAlbums: mocks.listAlbums,
}));

import { SamoController } from './samo-controller';

const server = { credential: 'token', id: 'samo-1', url: 'https://samo.example' };

const albums = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => ({
        id: `album-${from + i}`,
        title: `Album ${from + i}`,
    }));

beforeEach(() => {
    mocks.listAlbums.mockReset();
});

describe('SamoController.getAlbumList over a server-paged sort', () => {
    // The server caps a page at 500. Reading that page as the whole library
    // told the sidebar a 3367-album library held 500, and it pruned every
    // recent album past the first page from Recents.
    it("reports the server's total, not the page's length", async () => {
        mocks.listAlbums.mockResolvedValue({
            items: albums(0, 500),
            limit: 500,
            offset: 0,
            total: 3367,
        });

        const result = await SamoController.getAlbumList({
            apiClientProps: { server } as never,
            query: { limit: 1000, sortBy: 'name', sortOrder: 'ASC', startIndex: 0 } as never,
        });

        expect(result.items).toHaveLength(500);
        expect(result.totalRecordCount).toBe(3367);
    });

    // The server already applied the offset; slicing again came back empty.
    it('does not skip ahead on a later page', async () => {
        mocks.listAlbums.mockResolvedValue({
            items: albums(500, 500),
            limit: 500,
            offset: 500,
            total: 3367,
        });

        const result = await SamoController.getAlbumList({
            apiClientProps: { server } as never,
            query: { limit: 500, sortBy: 'name', sortOrder: 'ASC', startIndex: 500 } as never,
        });

        expect(mocks.listAlbums).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ offset: 500 }),
        );
        expect(result.items[0].id).toBe('album-500');
        expect(result.startIndex).toBe(500);
    });
});
