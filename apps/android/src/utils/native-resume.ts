import { NativeModules } from 'react-native';

/**
 * Bridge to the native progress writer's local resume cache. On a flaky LAN the
 * live server progress read can transiently fail; the native side keeps the last
 * known book position per item (written every second while playing, persisted
 * across process death), so we can resume there instead of restarting at 0 — and
 * then overwriting the good server position with 0.
 */
export interface NativeResumeProgress {
    completed: boolean;
    progressSeconds: number;
    /** When the phone recorded this position (epoch ms); absent on older builds. */
    updatedAtMs?: number;
}

interface SamoResumeBridge {
    getResumeProgress?: (kind: string, targetId: string) => Promise<NativeResumeProgress | null>;
}

const bridge = NativeModules.SamoAudio as SamoResumeBridge | undefined;

export type SamoResumeKind = 'audiobook' | 'podcast-episode';

export const getNativeResumeProgress = async (
    kind: SamoResumeKind,
    targetId: string,
): Promise<NativeResumeProgress | null> => {
    try {
        return (await bridge?.getResumeProgress?.(kind, targetId)) ?? null;
    } catch {
        return null;
    }
};
