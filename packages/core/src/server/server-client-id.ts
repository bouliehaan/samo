/**
 * This client's identity on samo's catalog-change stream.
 *
 * Sent as `X-Samo-Client` on every Samo request and echoed back on the
 * catalog-change events those requests cause, so a client can ignore the
 * notification for its own write — it has already applied that change locally,
 * precisely and synchronously, in the mutation that made it. Acting on the echo
 * would be a second round trip for something already on screen, and on the
 * phone it would be a whole catalog sync.
 *
 * Generated per process rather than per user or per install: two windows, or a
 * phone and a desktop, are separate clients and each has to hear about the
 * other's edits.
 *
 * Deliberately random and short-lived. It is a de-duplication hint, never an
 * identity — nothing is authorized by it, and a client that omits it or sends a
 * colliding one gets a redundant refresh, not a wrong answer.
 */
const generated = `${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

let clientId = generated;

export const SAMO_CLIENT_HEADER = 'X-Samo-Client';

export const getSamoClientId = (): string => clientId;

/**
 * Label this client's id with the platform it is running on, for the server
 * log's benefit. Called once at boot; the random suffix is what actually makes
 * it unique, so calling it late or not at all changes nothing but readability.
 */
export const setSamoClientLabel = (label: string): void => {
    clientId = `${label}-${generated}`;
};
