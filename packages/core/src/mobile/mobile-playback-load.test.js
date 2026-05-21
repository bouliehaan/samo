import { describe, expect, it, vi } from 'vitest';
import { ServerType } from '../server/server-types';
import { testServerAuthentication } from '../test-fixtures';
import { loadAudiobookshelfPlayback } from './mobile-playback';
const authentication = testServerAuthentication({
    credential: 'jwt-token',
    type: ServerType.AUDIOBOOKSHELF,
    url: 'https://abs.example.com',
});
describe('loadAudiobookshelfPlayback', () => {
    it('loads play + item detail in parallel and prefers a direct cast file URL', async () => {
        const fetcher = vi.fn(async (url) => {
            if (url.endsWith('/play')) {
                return {
                    json: async () => ({
                        audioTracks: [
                            {
                                contentUrl: '/hls/book.m3u8',
                                ino: 'ino-from-play',
                                mimeType: 'application/x-mpegURL',
                                startOffset: 30,
                            },
                        ],
                    }),
                    ok: true,
                    status: 200,
                };
            }
            if (url.includes('expanded=1')) {
                return {
                    json: async () => ({
                        id: 'book-1',
                        media: {
                            tracks: [
                                {
                                    ino: 'ino-from-item',
                                    metadata: { ext: 'm4b' },
                                    mimeType: 'audio/mp4',
                                },
                            ],
                        },
                    }),
                    ok: true,
                    status: 200,
                };
            }
            throw new Error(`Unexpected URL: ${url}`);
        });
        const playback = await loadAudiobookshelfPlayback({
            authentication,
            fetch: fetcher,
            itemId: 'book-1',
            startSeconds: 90,
            title: 'Test Book',
        });
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(playback).toMatchObject({
            castMimeType: 'audio/mp4',
            contentSourceId: `${ServerType.AUDIOBOOKSHELF}:https://abs.example.com`,
            id: `${ServerType.AUDIOBOOKSHELF}:https://abs.example.com:audiobook:book-1`,
            initialPositionSeconds: 60,
            mimeType: 'application/x-mpegURL',
            progressOffsetSeconds: 30,
            source: 'audiobook',
            title: 'Test Book',
        });
        expect(playback.castUrl).toBe('https://abs.example.com/api/items/book-1/file/ino-from-item?token=jwt-token');
        expect(playback.url).toBe('https://abs.example.com/hls/book.m3u8');
    });
    it('uses the podcast play path and episode cast file when episodeId is set', async () => {
        const fetcher = vi.fn(async (url) => {
            if (url.endsWith('/play/episode-9')) {
                return {
                    json: async () => ({
                        audioTracks: [
                            {
                                contentUrl: '/podcast/stream',
                                mimeType: 'audio/mpeg',
                            },
                        ],
                    }),
                    ok: true,
                    status: 200,
                };
            }
            if (url.includes('expanded=1')) {
                return {
                    json: async () => ({
                        media: {
                            episodes: [
                                {
                                    audioFile: {
                                        ino: 'episode-ino',
                                        metadata: { ext: 'mp3' },
                                    },
                                    id: 'episode-9',
                                },
                            ],
                        },
                    }),
                    ok: true,
                    status: 200,
                };
            }
            throw new Error(`Unexpected URL: ${url}`);
        });
        const playback = await loadAudiobookshelfPlayback({
            authentication,
            episodeId: 'episode-9',
            fetch: fetcher,
            itemId: 'show-1',
            title: 'Episode',
        });
        expect(playback.source).toBe('podcast');
        expect(playback.id).toContain(':podcast:show-1:episode-9');
        expect(playback.castUrl).toBe('https://abs.example.com/api/items/show-1/file/episode-ino?token=jwt-token');
    });
    it('throws when /play returns no audio URL', async () => {
        const fetcher = vi.fn(async () => ({
            json: async () => ({ audioTracks: [] }),
            ok: true,
            status: 200,
        }));
        await expect(loadAudiobookshelfPlayback({
            authentication,
            fetch: fetcher,
            itemId: 'book-1',
            title: 'Empty',
        })).rejects.toThrow('Audiobookshelf did not return an audio URL');
    });
});
