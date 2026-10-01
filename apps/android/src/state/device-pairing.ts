import { type SamoDevicePairing } from '@samo/core/server';

import { useStoreSelector } from './use-store-selector';

/** Why a pairing ended without a session. Words are the screen's business. */
export type DevicePairingFailure =
    /** The code ran out, here or on the server (a restart forgets every code). */
    | 'expired'
    /** Someone looked at the code and declined it. */
    | 'declined'
    /** No answer from the address at all. */
    | 'unreachable'
    /** The server has not finished its first-run setup; it has no accounts. */
    | 'not-set-up'
    /** A server from before pairing existed: only a password can sign in. */
    | 'unsupported'
    /** Too many codes asked for from this address in the last minute. */
    | 'busy'
    /** Anything else: an answer this protocol does not allow, or a save failing. */
    | 'failed';

/**
 * Where signing this device in with a code has got to. Written only by
 * services/device-pairing.ts; read by the TV's setup screen.
 */
export type DevicePairingState =
    | { status: 'idle' }
    | { status: 'requesting'; serverUrl: string }
    | {
          status: 'waiting';
          serverUrl: string;
          request: SamoDevicePairing;
          /** Set while polls are failing to arrive; the code is still good. */
          unreachable: boolean;
      }
    | { status: 'connecting'; serverUrl: string }
    | { status: 'failed'; serverUrl: string; reason: DevicePairingFailure };

export const IDLE_DEVICE_PAIRING: DevicePairingState = { status: 'idle' };

let devicePairingState: DevicePairingState = IDLE_DEVICE_PAIRING;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const getDevicePairing = (): DevicePairingState => devicePairingState;

export const setDevicePairing = (next: DevicePairingState): void => {
    if (next === devicePairingState) {
        return;
    }
    devicePairingState = next;
    listeners.forEach((listener) => listener());
};

export const useDevicePairingSelector = <Selected>(
    selector: (state: DevicePairingState) => Selected,
): Selected => useStoreSelector(subscribe, getDevicePairing, selector);
