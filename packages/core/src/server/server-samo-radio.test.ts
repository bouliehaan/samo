import { describe, expect, it } from 'vitest';

import {
    isSamoRadioDeviceConnected,
    resolveSamoRadioArtworkUrl,
    type SamoRadioDevice,
    type SamoRadioState,
    samoRadioTransportKind,
} from './server-samo-radio';

const state = (overrides: Partial<SamoRadioState> = {}): SamoRadioState => ({
    deviceName: 'Crosley',
    mode: 'idle',
    output: { backend: 'alsa', channels: 2, open: true, sampleRate: 48_000 },
    positionSeconds: 0,
    queueIndex: 0,
    server: { paired: true },
    status: 'idle',
    updatedAt: '2026-08-14T10:00:00Z',
    version: 1,
    volume: 1,
    ...overrides,
});

const device = (overrides: Partial<SamoRadioDevice> = {}): SamoRadioDevice => ({
    baseUrl: 'http://stereo.local:7788',
    enabled: true,
    id: 'dev_1',
    name: 'Crosley',
    paired: true,
    state: state(),
    ...overrides,
});

// The gate for whether samo-radio is offered at all. Each of these three is a
// device that cannot be played to, and a surface built on one could only fail
// on tap — a control panel of dead buttons, a picker row that errors, a "send
// this there" menu entry that goes nowhere.
describe('isSamoRadioDeviceConnected', () => {
    it('accepts a registered, paired, answering device', () => {
        expect(isSamoRadioDeviceConnected(device())).toBe(true);
    });

    it('rejects disabled, unpaired, and unreachable devices', () => {
        expect(isSamoRadioDeviceConnected(device({ enabled: false }))).toBe(false);
        expect(isSamoRadioDeviceConnected(device({ paired: false }))).toBe(false);
        // No state snapshot is how the server reports "I could not reach it".
        expect(isSamoRadioDeviceConnected(device({ state: undefined }))).toBe(false);
    });
});

describe('samoRadioTransportKind', () => {
    it('advances its own queue in queue mode', () => {
        expect(samoRadioTransportKind(state({ mode: 'queue' }))).toBe('queue');
    });

    // The case the phone panel used to miss entirely: tuned to a channel is not
    // "nothing to skip", it is "ask the station to move on".
    it('steps the station on when tuned to a programmed channel', () => {
        expect(
            samoRadioTransportKind(
                state({ channel: { id: 'chan_1', kind: 'channel' }, mode: 'channel' }),
            ),
        ).toBe('channel');
    });

    // Only absent on devices predating the field, and those are samo channels.
    it('reads a channel with no kind as programmed', () => {
        expect(samoRadioTransportKind(state({ channel: { id: 'chan_1' }, mode: 'channel' }))).toBe(
            'channel',
        );
    });

    it('offers nothing on an internet station or at idle', () => {
        // Somebody else's stream: the device refuses to skip it.
        expect(
            samoRadioTransportKind(
                state({ channel: { id: 'st_1', kind: 'station' }, mode: 'channel' }),
            ),
        ).toBe('none');
        expect(samoRadioTransportKind(state({ mode: 'idle' }))).toBe('none');
    });
});

describe('resolveSamoRadioArtworkUrl', () => {
    const auth = { url: 'https://music.example' };

    it('pictures what is airing on a channel, homed on the address the client connected with', () => {
        // The device reports the show's cover as a path relative to samo; it
        // has no idea the phone reached samo through a tunnel.
        expect(
            resolveSamoRadioArtworkUrl(
                auth,
                state({
                    channel: {
                        artworkUrl: '/api/v1/podcasts/shows/podcast_1/cover',
                        id: 'channel_1',
                        title: 'Mother Plants Might Not Be Necessary Anymore',
                    },
                    item: {
                        artworkUrl: '/api/v1/channels/channel_1/cover',
                        ref: 'channel:channel_1',
                        streamUrl: 'http://127.0.0.1:6969/channels/channel_1/stream',
                        title: 'Jake Channel',
                    },
                    mode: 'channel',
                }),
            ),
        ).toBe('https://music.example/api/v1/podcasts/shows/podcast_1/cover');
    });

    it('falls back to the queued item off a channel, and leaves a remote picture alone', () => {
        expect(
            resolveSamoRadioArtworkUrl(
                auth,
                state({
                    item: {
                        artworkUrl: 'https://cdn.example/cover.jpg',
                        ref: 'track:track_1',
                        streamUrl: 'https://music.example/api/v1/music/tracks/track_1/stream',
                        title: 'Float On',
                    },
                    mode: 'queue',
                }),
            ),
        ).toBe('https://cdn.example/cover.jpg');
    });

    it('has nothing to show for a device on standby', () => {
        expect(resolveSamoRadioArtworkUrl(auth, state())).toBeUndefined();
    });
});
