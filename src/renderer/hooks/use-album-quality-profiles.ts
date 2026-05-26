import { annotateSubsonicAlbumsQuality, type QualityBadgeProfile } from '@samo/core/audio-quality';
import {
    getDefaultServerCapabilities,
    ServerAuthenticationKind,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCurrentServerWithCredential } from '/@/renderer/store/auth.store';
import { Album, ServerType } from '/@/shared/types/domain-types';

export type AlbumWithQualityProfile = Album & {
    qualityProfile?: QualityBadgeProfile;
};

const canScanAlbumQuality = (serverType: ServerType | undefined) =>
    serverType === ServerType.SUBSONIC || serverType === ServerType.NAVIDROME;

/**
 * Stamps visible album tiles with representative lossless format profiles,
 * matching the Android home/library badge sweep.
 */
export const useAlbumQualityProfiles = <T extends Album>(
    albums: T[] | undefined,
    options?: { enabled?: boolean; limit?: number },
): T[] => {
    const server = useCurrentServerWithCredential();
    const enabled = (options?.enabled ?? true) && canScanAlbumQuality(server?.type);
    const limit = options?.limit ?? 80;
    const albumKey = useMemo(
        () => (albums ?? []).map((album) => `${album._serverId}:${album.id}`).join('|'),
        [albums],
    );

    const { data: annotated } = useQuery({
        enabled: enabled && Boolean(server?.credential) && (albums?.length ?? 0) > 0,
        queryFn: async () => {
            if (!server?.credential || !albums?.length) {
                return albums ?? [];
            }
            const auth: ServerAuthenticationResult = {
                capabilities: getDefaultServerCapabilities(server.type),
                credential: server.credential,
                details: server.name,
                kind:
                    server.type === ServerType.NAVIDROME
                        ? ServerAuthenticationKind.NAVIDROME_TOKEN
                        : ServerAuthenticationKind.SUBSONIC_LEGACY_PASSWORD,
                title: server.name,
                type: server.type,
                url: server.url,
                userId: server.userId ?? undefined,
                username: server.username,
            };
            return annotateSubsonicAlbumsQuality(
                auth,
                fetch,
                albums.slice(0, limit) as Array<T & { id: string }>,
                limit,
            );
        },
        queryKey: ['album-quality-profiles', server?.id, albumKey, limit],
        staleTime: 5 * 60 * 1000,
    });

    if (!enabled || !annotated) {
        return albums ?? [];
    }

    const profileById = new Map(
        annotated.map((album) => [album.id, (album as AlbumWithQualityProfile).qualityProfile]),
    );

    return (albums ?? []).map((album) => {
        const profile = profileById.get(album.id);
        if (!profile) return album;
        return { ...album, qualityProfile: profile };
    });
};
