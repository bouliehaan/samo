import { describe, expect, it } from 'vitest';
import { ServerType } from '@samo/core/server';
import { type MobilePlayableAudio } from '@samo/core/mobile';

import {
    isMp3PlayableAudio,
    resolveAudiobookSeekTarget,
    shouldServerSeekAudiobookMp3,
} from './samo-audiobook-playback';

const makeItem = (over: Partial<MobilePlayableAudio> = {}): MobilePlayableAudio =>
    ({
        id: `${ServerType.SAMO}:audiobook:book1:file:f1`,
        source: 'audiobook',
        title: '10% Happier',
        url: 'http://host/api/v1/audiobooks/book1/stream',
        mimeType: 'audio/mpeg',
        durationSeconds: 28260,
        progressOffsetSeconds: 0,
        ...over,
    }) as unknown as MobilePlayableAudio;

describe('isMp3PlayableAudio', () => {
    it('is true for audio/mpeg', () => {
        expect(isMp3PlayableAudio(makeItem({ mimeType: 'audio/mpeg' }))).toBe(true);
    });
    it('is false for an m4b (audio/mp4)', () => {
        expect(isMp3PlayableAudio(makeItem({ mimeType: 'audio/mp4' }))).toBe(false);
    });
    it('is false when the mime type is unknown (stay on the safe native path)', () => {
        expect(isMp3PlayableAudio(makeItem({ mimeType: undefined }))).toBe(false);
    });
});

describe('shouldServerSeekAudiobookMp3', () => {
    it('routes a Samo MP3 audiobook to the server seek', () => {
        expect(shouldServerSeekAudiobookMp3(makeItem())).toBe(true);
    });
    it('also routes multi-file MP3 rips (same book-absolute position shape)', () => {
        expect(shouldServerSeekAudiobookMp3(makeItem({ progressOffsetSeconds: 3600 }))).toBe(true);
    });
    it('leaves m4b on the native seek (exact sample table)', () => {
        expect(shouldServerSeekAudiobookMp3(makeItem({ mimeType: 'audio/mp4' }))).toBe(false);
    });
    it('does not touch non-audiobook playback', () => {
        expect(
            shouldServerSeekAudiobookMp3(
                makeItem({ source: 'music' as MobilePlayableAudio['source'] }),
            ),
        ).toBe(false);
    });
    it('does not touch non-Samo audiobooks', () => {
        expect(shouldServerSeekAudiobookMp3(makeItem({ id: 'absng:audiobook:book1' }))).toBe(false);
    });
});

describe('resolveAudiobookSeekTarget (single file)', () => {
    it('maps a book second straight to a file position at offset 0', () => {
        const item = makeItem();
        const target = resolveAudiobookSeekTarget([item], 502.982);
        expect(target.queueIndex).toBe(0);
        expect(Math.round(target.bookPositionSeconds)).toBe(503);
        expect(Math.round(target.filePositionMs)).toBe(502982);
    });
});
