import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type MobileHomeContent } from '@samo/core/mobile';
import { testServerAuthentication } from '../../../../packages/core/src/test-fixtures';
import { type AndroidHomeContentState } from './home-content';

const mocks = vi.hoisted(() => ({
    auth: null as ReturnType<typeof testServerAuthentication> | null,
    build: vi.fn(),
    state: { status: 'idle' } as AndroidHomeContentState,
    writes: [] as AndroidHomeContentState[],
}));

vi.mock('../state/auth-session', () => ({
    getAuthSession: () => ({ serverConnection: mocks.auth }),
}));
vi.mock('../state/app-navigation', () => ({
    setHomeContentState: (
        next: AndroidHomeContentState | ((state: AndroidHomeContentState) => AndroidHomeContentState),
    ) => {
        mocks.state = typeof next === 'function' ? next(mocks.state) : next;
        mocks.writes.push(mocks.state);
    },
}));
vi.mock('../state/app-session', () => ({ setRecentContentItems: vi.fn() }));
vi.mock('../state/network-state', () => ({ isOfflineNow: () => true }));
vi.mock('../state/samo-radio', () => ({ samoRadioReachFor: vi.fn(), setSamoRadioReach: vi.fn() }));
vi.mock('./catalog/catalog-reads', () => ({ buildCatalogHomeContent: mocks.build }));
vi.mock('./home-hero-visit', () => ({
    homeHeroAccountKey: (auth: ReturnType<typeof testServerAuthentication>) =>
        `${auth.serverId}:${auth.userId}`,
    loadHomeHeroRecommendation: vi.fn(),
}));
vi.mock('./home-layout-hint', () => ({ saveHomeLayoutHint: vi.fn() }));
vi.mock('./samo-radio', () => ({ describeReachFailure: vi.fn(), refreshSamoRadioDevices: vi.fn() }));
vi.mock('./recent-content', () => ({
    loadPersistedRecentContentItems: vi.fn(),
    savePersistedRecentContentItems: vi.fn(),
}));
vi.mock('./recent-content-sync', () => ({ mergeServerRecentlyPlayedIntoRecents: vi.fn() }));
vi.mock('../utils/recent-content-dedupe', () => ({
    collectFreshAlbumItems: vi.fn(),
    reconcileRecentContentItemsIfChanged: vi.fn(),
}));

const content: MobileHomeContent = {
    errors: [],
    loadedAt: 1,
    sections: [],
    serverTitle: 'Cached library',
};

beforeEach(() => {
    vi.resetModules();
    mocks.auth = testServerAuthentication({ serverId: 'server-a', userId: 'user-a' });
    mocks.state = { status: 'idle' };
    mocks.writes = [];
    mocks.build.mockReset().mockResolvedValue(content);
});

describe('Home startup and account changes', () => {
    it('keeps the first mirror paint usable while session validation reloads the same account', async () => {
        const { refreshHomeFromMirror, loadHomeForConnection } = await import('./home-flow');
        await refreshHomeFromMirror();
        const painted = mocks.state;
        mocks.writes = [];
        let finish!: (value: MobileHomeContent) => void;
        mocks.build.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));

        const refresh = loadHomeForConnection({ ...mocks.auth! });
        expect(mocks.state).toBe(painted);
        expect(mocks.writes).toEqual([]);
        finish(content);
        await refresh;
        expect(mocks.writes.every((state) => state.status === 'loaded')).toBe(true);
    });

    it('clears the previous account immediately when a different account connects', async () => {
        const { refreshHomeFromMirror, loadHomeForConnection } = await import('./home-flow');
        await refreshHomeFromMirror();
        mocks.auth = testServerAuthentication({ serverId: 'server-a', userId: 'user-b' });
        mocks.build.mockResolvedValueOnce(null);
        await loadHomeForConnection(mocks.auth);
        expect(mocks.state).toEqual({ status: 'loading' });
    });

    it('does not resurrect a disconnected account when its mirror read finishes late', async () => {
        const { refreshHomeFromMirror, loadHomeForConnection } = await import('./home-flow');
        let finish!: (value: MobileHomeContent) => void;
        mocks.build.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
        const pending = refreshHomeFromMirror();
        mocks.auth = null;
        await loadHomeForConnection(null);
        finish(content);
        await pending;
        expect(mocks.state).toEqual({ status: 'idle' });
    });

    it('ignores a delayed connection load after another account has painted', async () => {
        const { refreshHomeFromMirror, loadHomeForConnection } = await import('./home-flow');
        let finish!: (value: MobileHomeContent) => void;
        mocks.build.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
        const pending = loadHomeForConnection(mocks.auth);
        mocks.auth = testServerAuthentication({ serverId: 'server-b' });
        const replacement = { ...content, serverTitle: 'New library' };
        mocks.build.mockResolvedValueOnce(replacement);
        await refreshHomeFromMirror();
        finish(content);
        await pending;
        expect(mocks.state).toEqual({ content: replacement, status: 'loaded' });
    });
});
