import { Album } from '/@/shared/types/domain-types';
export type AlbumWithQualityProfile = Album & { qualityProfile?: any };
export const useAlbumQualityProfiles = <T extends Album>(albums: T[] | undefined): T[] => {
    return albums ?? [];
};
