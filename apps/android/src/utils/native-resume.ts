import { NativeModules } from 'react-native';

/**
 * Bridge to the native progress writer's local resume cache. On a flaky LAN the
 * live server progress read can transiently fail; the native side keeps the last
 * known book position per item (written every second while playing, persisted
 * across process death), so we can resume there instead of restarting at 0 — and
 * then overwriting the good server position with 0.
 */
interface SamoResumeBridge {
    getResumeProgress?: (
        kind: string,
        targetId: string,
    ) => Promise<{ completed: boolean; progressSeconds: number } | null>;
}

const bridge = NativeModules.SamoAudio as SamoResumeBridge | undefined;

export type SamoResumeKind = 'audiobook' | 'podcast-episode';

export const getNativeResumeProgress = async (
    kind: SamoResumeKind,
    targetId: string,
): Promise<{ completed: boolean; progressSeconds: number } | null> => {
    try {
        return (await bridge?.getResumeProgress?.(kind, targetId)) ?? null;
    } catch {
        return null;
    }
};
