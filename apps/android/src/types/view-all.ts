import { type MobileHomeItem } from '@samo/core/mobile';

export type ViewAllVariant = 'album' | 'artist' | 'audiobook' | 'playlist' | 'podcast' | 'podcast-feed';

export interface ViewAllRoute {
    items: MobileHomeItem[];
    title: string;
    variant: ViewAllVariant;
}
