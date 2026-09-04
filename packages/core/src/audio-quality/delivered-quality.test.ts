import { describe, expect, it } from 'vitest';

import { buildAudioQualityBadgeItems, resolveDeliveredAudioQuality } from './quality-labels';

const flacSource = {
    bitDepth: 16,
    bitRate: 900,
    container: 'flac',
    deliveryKind: 'android-direct' as const,
    sampleRate: 44_100,
};

describe('resolveDeliveredAudioQuality', () => {
    it('returns the catalog description untouched before anything is observed', () => {
        expect(resolveDeliveredAudioQuality(flacSource, undefined)).toBe(flacSource);
        expect(resolveDeliveredAudioQuality(flacSource, null)).toBe(flacSource);
        expect(resolveDeliveredAudioQuality(flacSource, { codec: null })).toBe(flacSource);
    });

    it('calls a lossless source arriving in a lossy codec a transcode', () => {
        const resolved = resolveDeliveredAudioQuality(flacSource, {
            codec: 'audio/opus',
            sampleRate: 48_000,
        });

        expect(resolved.deliveryKind).toBe('transcoded');
        expect(resolved.transcodeFormat).toBe('opus');
        expect(resolved.transcodeSampleRate).toBe(48_000);
        // The source file's 900 kbps must NOT be carried onto the transcoded
        // path — that number is the whole reason the badge used to lie.
        expect(resolved.transcodeBitrate).toBeNull();
    });

    it('leaves a FLAC that actually arrived as FLAC on the direct path', () => {
        const resolved = resolveDeliveredAudioQuality(flacSource, {
            codec: 'audio/flac',
            sampleRate: 44_100,
        });

        expect(resolved.deliveryKind).toBe('android-direct');
        expect(resolved).not.toHaveProperty('transcodeFormat');
    });

    it('does not mistake AAC inside an M4A container for a transcode', () => {
        // The container names an envelope, not a codec. Comparing the two as
        // strings would read `m4a` vs `mp4a-latm` as a re-encode.
        const resolved = resolveDeliveredAudioQuality(
            { ...flacSource, bitDepth: null, container: 'm4a' },
            { codec: 'audio/mp4a-latm', sampleRate: 44_100 },
        );

        expect(resolved.deliveryKind).toBe('android-direct');
    });

    it('does not mistake ALAC inside an M4A container for a transcode', () => {
        const resolved = resolveDeliveredAudioQuality(
            { ...flacSource, container: 'm4a' },
            { codec: 'audio/alac', sampleRate: 96_000 },
        );

        expect(resolved.deliveryKind).toBe('android-direct');
    });

    it('catches a lossless-to-lossless re-encode via disagreeing codec families', () => {
        const resolved = resolveDeliveredAudioQuality(flacSource, {
            codec: 'audio/alac',
            sampleRate: 44_100,
        });

        expect(resolved.deliveryKind).toBe('transcoded');
        expect(resolved.transcodeFormat).toBe('alac');
    });

    it('fills a missing catalog sample rate from the decoder on a direct path', () => {
        const resolved = resolveDeliveredAudioQuality(
            { ...flacSource, sampleRate: null },
            { codec: 'audio/flac', sampleRate: 44_100 },
        );

        expect(resolved.sampleRate).toBe(44_100);
        expect(resolved.deliveryKind).toBe('android-direct');
    });

    it('never lets the decoder overwrite a populated catalog sample rate', () => {
        const resolved = resolveDeliveredAudioQuality(flacSource, {
            codec: 'audio/flac',
            sampleRate: 48_000,
        });

        expect(resolved.sampleRate).toBe(44_100);
    });
});

describe('buildAudioQualityBadgeItems on an observed transcode', () => {
    const items = buildAudioQualityBadgeItems({
        ...resolveDeliveredAudioQuality(flacSource, {
            codec: 'audio/opus',
            sampleRate: 48_000,
        }),
        compact: true,
        mode: 'detail',
    });

    it('names both ends of the trade rather than only what arrived', () => {
        expect(items[1].label).toBe('FLAC → OPUS');
    });

    it('reports the delivered sample rate with its unit, not a bare number', () => {
        expect(items.map((item) => item.label)).toContain('48 kHz');
    });

    it('states the path as transcoded and never as direct', () => {
        expect(items[0].label).toBe('Transcoded');
        expect(items.every((item) => item.tone !== 'direct')).toBe(true);
    });

    it('claims no bitrate when the delivered stream declares none', () => {
        expect(items.some((item) => item.label.includes('kbps'))).toBe(false);
        expect(items.some((item) => item.label === '900 kbps')).toBe(false);
    });

    it('leaves a catalog-only caller byte-identical to before', () => {
        // Track rows and detail screens describe the FILE and pass no observed
        // format; their badges must not change shape.
        expect(
            buildAudioQualityBadgeItems({ ...flacSource, compact: true, mode: 'playerbar' }).map(
                (item) => item.label,
            ),
        ).toEqual(['FLAC', '16/44.1']);
    });
});
