import { beforeEach, describe, expect, it, vi } from 'vitest';

// A 1080p TV: Android lays it out as 960×540dp at 2px a dp.
const device = vi.hoisted(() => ({ isTV: true, scale: 2 }));

vi.mock('react-native', () => ({
    PixelRatio: {
        getPixelSizeForLayoutSize: (layoutSize: number) => Math.round(layoutSize * device.scale),
    },
    Platform: {
        get isTV() {
            return device.isTV;
        },
    },
}));
vi.mock('../tv/tv-styles', () => ({ TV_TILE: 144 }));

const SAMO_COVER = 'https://music.example.com/api/v1/media/images/cover_abc/image';
const REMOTE_COVER = 'https://cdn.example.com/podcasts/cover.jpg';

const load = async () => import('./artwork-size');

beforeEach(() => {
    vi.resetModules();
    device.isTV = true;
    device.scale = 2;
});

describe('getArtworkWidth', () => {
    it('asks for the first rung of the server ladder that covers the slot', async () => {
        const { getArtworkWidth } = await load();
        // TV tile, hero, detail, player, track row, rail thumb.
        expect(getArtworkWidth(144)).toBe(384);
        expect(getArtworkWidth(172)).toBe(384);
        expect(getArtworkWidth(208)).toBe(512);
        expect(getArtworkWidth(316)).toBe(768);
        expect(getArtworkWidth(40)).toBe(128);
        expect(getArtworkWidth(30)).toBe(64);
    });

    it('asks for no size past the last rung, where the server sends the original', async () => {
        const { getArtworkWidth } = await load();
        expect(getArtworkWidth(600)).toBeUndefined();
    });

    it('asks for no size without a slot', async () => {
        const { getArtworkWidth } = await load();
        expect(getArtworkWidth(undefined)).toBeUndefined();
        expect(getArtworkWidth(0)).toBeUndefined();
    });
});

describe('sizeArtworkSource', () => {
    it('sizes a samo cover', async () => {
        const { sizeArtworkSource } = await load();
        expect(sizeArtworkSource(SAMO_COVER, 144)).toBe(`${SAMO_COVER}?width=384`);
    });

    it('keeps the headers of a source that carries them', async () => {
        const { sizeArtworkSource } = await load();
        const headers = { Authorization: 'Bearer token' };
        expect(sizeArtworkSource({ headers, uri: SAMO_COVER }, 208)).toEqual({
            headers,
            uri: `${SAMO_COVER}?width=512`,
        });
    });

    it('leaves alone what the server cannot size', async () => {
        const { sizeArtworkSource } = await load();
        const source = { headers: {}, uri: REMOTE_COVER };
        expect(sizeArtworkSource(REMOTE_COVER, 144)).toBe(REMOTE_COVER);
        expect(sizeArtworkSource(source, 144)).toBe(source);
    });

    it('leaves a size already asked for, and a source with no slot', async () => {
        const { sizeArtworkSource } = await load();
        const sized = `${SAMO_COVER}?width=768`;
        expect(sizeArtworkSource(sized, 144)).toBe(sized);
        expect(sizeArtworkSource(SAMO_COVER, undefined)).toBe(SAMO_COVER);
    });
});

describe('COVER_CACHE_WIDTH', () => {
    it("keeps a TV's covers at its tile's size", async () => {
        const { COVER_CACHE_WIDTH } = await load();
        expect(COVER_CACHE_WIDTH).toBe(384);
    });

    it('follows the screen density, as the tiles asking for them do', async () => {
        device.scale = 1.5;
        const { COVER_CACHE_WIDTH } = await load();
        expect(COVER_CACHE_WIDTH).toBe(256);
    });

    it("keeps a phone's covers as the server stores them", async () => {
        device.isTV = false;
        const { COVER_CACHE_WIDTH } = await load();
        expect(COVER_CACHE_WIDTH).toBeUndefined();
    });
});
